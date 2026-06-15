import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';

import { CapitalSearchResultDto } from '../shared/models/search.models';
import { CapitalSearchApiService } from '../shared/services/capital-search-api.service';
import {
  searchResultPresentation,
  searchResultTabPath,
} from '../shared/utils/search-result.util';
import { CapitalDashboardCacheActions, CapitalDashboardShellActions } from '../store';
import { CapitalDashboardTab } from '../store/capital-dashboard.state';

@Component({
  selector: 'app-capital-dashboard',
  standalone: true,
  imports: [FormsModule, MatIconModule, RouterModule],
  templateUrl: './capital-dashboard.component.html',
  styleUrls: ['./capital-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CapitalDashboardComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly searchApi = inject(CapitalSearchApiService);

  private readonly searchWrapRef = viewChild<ElementRef<HTMLElement>>('searchWrap');

  readonly searchQuery = signal('');
  readonly searchResults = signal<CapitalSearchResultDto[]>([]);
  readonly searchLoading = signal(false);
  readonly searchOpen = signal(false);

  readonly searchResultPresentation = searchResultPresentation;

  readonly tabClearQueryParams = {
    selected: null,
    search: null,
    detailTab: null,
    focusInvestor: null,
  };

  constructor() {
    document.body.setAttribute('data-ks-capital-dashboard', 'true');
    this.destroyRef.onDestroy(() => {
      this.store.dispatch(CapitalDashboardCacheActions.resetAll());
      document.body.removeAttribute('data-ks-capital-dashboard');
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncActiveTabToStore());

    toObservable(this.searchQuery)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((query) => {
          const term = query.trim();
          if (!term) {
            this.searchResults.set([]);
            this.searchLoading.set(false);
            return;
          }

          this.searchLoading.set(true);
          this.searchOpen.set(true);
        }),
        switchMap((query) => {
          const term = query.trim();
          if (!term) {
            return of({ search: '', results: [] as CapitalSearchResultDto[] });
          }

          return this.searchApi.search({ search: term }).pipe(
            catchError(() => of({ search: term, results: [] as CapitalSearchResultDto[] })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        this.searchLoading.set(false);
        this.searchResults.set(response.results ?? []);
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const wrap = this.searchWrapRef()?.nativeElement;
    if (!wrap || wrap.contains(event.target as Node)) {
      return;
    }

    this.searchOpen.set(false);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim()) {
      this.searchOpen.set(true);
    }
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (!value.trim()) {
      this.searchOpen.set(false);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchLoading.set(false);
    this.searchOpen.set(false);
  }

  selectSearchResult(result: CapitalSearchResultDto): void {
    const tab = searchResultTabPath(result.entity_type);
    if (!tab) {
      return;
    }

    if (tab === 'investor') {
      this.router.navigate([`./investor/${result.entity_key}`], {
        relativeTo: this.route,
        queryParams: { search: result.name },
      });
      return;
    }

    this.router.navigate([`./${tab}`], {
      relativeTo: this.route,
      queryParams: {
        search: result.name,
        selected: result.entity_key,
      },
    });

    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  private syncActiveTabToStore(): void {
    this.store.dispatch(
      CapitalDashboardShellActions.activeTabChanged({ tab: this.readTabFromRoute() }),
    );
  }

  private readTabFromRoute(): CapitalDashboardTab {
    const path = this.route.firstChild?.snapshot?.url?.[0]?.path;
    if (path === 'investor' || path === 'investment' || path === 'asset') {
      return path;
    }

    const urlMatch = this.router.url.match(
      /\/capital-dashboard\/(investor|investment|asset)(?:\/|$|\?)/,
    );
    const urlTab = urlMatch?.[1];
    if (urlTab === 'investor' || urlTab === 'investment' || urlTab === 'asset') {
      return urlTab;
    }

    return 'investor';
  }
}
