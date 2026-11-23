import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { KingsettLogoComponent } from '../../shared/components/kingsett-logo';
import { CmhcAccessService } from './cmhc-access.service';
import { CmhcDataService } from './cmhc-data.service';
import { CmhcPopupsComponent } from './popups/cmhc-popups.component';

@Component({
  selector: 'app-cmhc-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KingsettLogoComponent, CmhcPopupsComponent],
  templateUrl: './cmhc-dashboard.component.html',
  styleUrls: ['./cmhc-dashboard.scss', './cmhc-dashboard-shell.scss'],
  // v4's stylesheet is scoped under .cmhc-dash and has to reach the child tab components.
  encapsulation: ViewEncapsulation.None,
})
export class CmhcDashboardComponent implements OnInit {
  protected readonly dataService = inject(CmhcDataService);
  protected readonly access = inject(CmhcAccessService);

  async ngOnInit(): Promise<void> {
    const access = await this.access.ensureLoaded();
    if (!access.hasAccess) return;
    // Underwriters / Originators get a filtered pipeline; their copy must not overwrite team-wide state.
    this.dataService.canWriteShared = access.seesAllLoans;
    if (!this.dataService.data()) {
      void this.dataService.load();
    }
  }

  reload(): void {
    void this.dataService.load();
  }
}
