import { Component, computed, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { environment } from '../../../environments/environment';
import { KingsettLogoComponent } from '../../shared/components/kingsett-logo';
import { CmhcDataService } from './cmhc-data.service';
import { CmhcPopupsComponent } from './popups/cmhc-popups.component';

interface CmhcTab {
  path: string;
  label: string;
}

@Component({
  selector: 'app-cmhc-dashboard',
  standalone: true,
  imports: [MatIconModule, RouterOutlet, RouterLink, RouterLinkActive, KingsettLogoComponent, CmhcPopupsComponent],
  templateUrl: './cmhc-dashboard.component.html',
  styleUrls: ['./cmhc-dashboard.scss', './cmhc-dashboard-shell.scss'],
  // v4's stylesheet is scoped under .cmhc-dash and has to reach the child tab components.
  encapsulation: ViewEncapsulation.None,
})
export class CmhcDashboardComponent implements OnInit {
  protected readonly dataService = inject(CmhcDataService);

  /** Env flag for the Capacity tab; shown to everyone unless switched off. */
  private readonly showCapacityTab = environment.showCmhcCapacityTab !== false;

  readonly tabs = computed<CmhcTab[]>(() =>
    [
      { path: 'overview', label: 'Overview' },
      { path: 'underwriter', label: 'Underwriter' },
      { path: 'originator', label: 'Originator' },
      { path: 'reviewer', label: 'Reviewer' },
      ...(this.showCapacityTab ? [{ path: 'capacity', label: 'Capacity' }] : []),
      { path: 'pools', label: 'Pools' },
      { path: 'timelines', label: 'Timelines' },
      { path: 'data-issues', label: 'Data Issues' },
      { path: 'methodology', label: 'Methodology' },
    ],
  );

  readonly headerDate = computed(() => {
    const engine = this.dataService.engine();
    const asOf = this.dataService.asOf();
    return engine && asOf ? 'As of ' + engine.fmtDate(asOf) : '—';
  });

  ngOnInit(): void {
    if (!this.dataService.data()) {
      void this.dataService.load();
    }
  }

  reload(): void {
    void this.dataService.load();
  }
}
