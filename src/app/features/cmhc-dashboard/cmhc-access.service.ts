import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CmhcApiService } from './cmhc-api.service';
import { CmhcMyAccessDto } from './cmhc-dashboard.models';

/** Route path of every dashboard page, in menu order (NAV-09). */
export type CmhcPage =
  | 'overview'
  | 'underwriter'
  | 'reviewer'
  | 'originator'
  | 'capacity'
  | 'pools'
  | 'timelines'
  | 'data-issues'
  | 'methodology';

export const CMHC_PAGES: readonly { path: CmhcPage; label: string }[] = [
  { path: 'overview', label: 'Overview' },
  { path: 'underwriter', label: 'Underwriter' },
  { path: 'reviewer', label: 'Reviewer' },
  { path: 'originator', label: 'Originator' },
  { path: 'capacity', label: 'Capacity' },
  { path: 'pools', label: 'Pools' },
  { path: 'timelines', label: 'Timelines' },
  { path: 'data-issues', label: 'Data Issues' },
  { path: 'methodology', label: 'Methodology' },
];

/** Pages Underwriters and Originators share, limited to their own loans by the API. */
const SHARED_OWN_PAGES: readonly CmhcPage[] = ['overview', 'capacity', 'pools', 'data-issues', 'methodology'];

const NO_ACCESS: CmhcMyAccessDto = {
  isAdmin: false,
  roles: [],
  linkedName: null,
  seesAllLoans: false,
  hasAccess: false,
};

/**
 * CMHC sub-role-based access (page matrix in the Navigation & Role-Based Access requirements):
 * - Admin → every page, every loan
 * - Underwriter → Overview, Underwriter (own only), Capacity, Pools, Data Issues, Methodology
 * - Originator → Overview, Originator (own only), Capacity, Pools, Data Issues, Methodology
 * - Reviewer → Reviewer page only, all underwriters' loans
 * - Several roles → combined pages. Pages switched off by config (Timelines, Capacity) stay hidden for everyone.
 * Loan filtering itself happens in the API (ACC-08); this only decides what is shown.
 */
@Injectable({ providedIn: 'root' })
export class CmhcAccessService {
  private readonly api = inject(CmhcApiService);

  readonly access = signal<CmhcMyAccessDto | null>(null);
  readonly loading = signal(false);
  private pending: Promise<CmhcMyAccessDto> | null = null;

  readonly hasAccess = computed(() => !!this.access()?.hasAccess);

  readonly pages = computed<ReadonlySet<CmhcPage>>(() => {
    const a = this.access();
    const allowed = new Set<CmhcPage>();
    if (!a?.hasAccess) return allowed;

    if (a.isAdmin) {
      CMHC_PAGES.forEach((p) => allowed.add(p.path));
    } else {
      if (a.roles.includes('Underwriter')) {
        SHARED_OWN_PAGES.forEach((p) => allowed.add(p));
        allowed.add('underwriter');
      }
      if (a.roles.includes('Originator')) {
        SHARED_OWN_PAGES.forEach((p) => allowed.add(p));
        allowed.add('originator');
      }
      if (a.roles.includes('Reviewer')) {
        allowed.add('reviewer');
      }
    }

    if (!environment.showCmhcTimelinesTab) allowed.delete('timelines');
    if (environment.showCmhcCapacityTab === false) allowed.delete('capacity');
    return allowed;
  });

  readonly tabs = computed(() => CMHC_PAGES.filter((p) => this.pages().has(p.path)));

  /** Home page (NAV-12): Overview, or the Reviewer page for Reviewers. */
  readonly homePage = computed<CmhcPage | null>(() => {
    const pages = this.pages();
    if (pages.has('overview')) return 'overview';
    if (pages.has('reviewer')) return 'reviewer';
    return CMHC_PAGES.find((p) => pages.has(p.path))?.path ?? null;
  });

  /**
   * Underwriter / Originator pages lock the person picker to the user's linked name (ACC-02, ACC-07).
   * Admins and Reviewers are not locked.
   */
  lockedPerson(type: 'uw' | 'orig' | 'rev' | 'pool'): string | null {
    const a = this.access();
    if (!a || a.seesAllLoans) return null;
    if ((type === 'uw' && a.roles.includes('Underwriter')) || (type === 'orig' && a.roles.includes('Originator'))) {
      return a.linkedName?.trim() || '\u0000';
    }
    return null;
  }

  canOpen(page: CmhcPage): boolean {
    return this.pages().has(page);
  }

  /** Loads once per session; a failed lookup counts as no access. */
  ensureLoaded(): Promise<CmhcMyAccessDto> {
    const current = this.access();
    if (current) return Promise.resolve(current);
    if (!this.pending) {
      this.loading.set(true);
      this.pending = firstValueFrom(this.api.getMyAccess())
        .catch(() => NO_ACCESS)
        .then((a) => {
          const normalized = { ...NO_ACCESS, ...a, roles: a?.roles ?? [] };
          this.access.set(normalized);
          this.loading.set(false);
          this.pending = null;
          return normalized;
        });
    }
    return this.pending;
  }
}
