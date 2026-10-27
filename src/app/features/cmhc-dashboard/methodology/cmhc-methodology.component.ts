import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { CmhcData } from '../cmhc-dashboard.models';
import { CmhcDataService } from '../cmhc-data.service';

const DOT: Record<string, string> = {
  red: '#DC2626',
  orange: '#C2410C',
  yellow: '#CA8A04',
  purple: '#7C3AED',
};

/**
 * v4 notes that describe the standalone file's upload / "Share report" workflow. The live dashboard has no
 * upload and no share-a-copy mode, and the Capacity tab is available to everyone, so these two no longer apply.
 * Everything else is shown exactly as v4 wrote it.
 */
const RETIRED_NOTES = [
  'One person prepares the report; everyone else gets a view-only copy',
  'The Allocations tab is not shared with the team',
];

/** Methodology tab: port of v4 renderNotes(). The notes themselves come verbatim from the report. */
@Component({
  selector: 'app-cmhc-methodology',
  standalone: true,
  templateUrl: './cmhc-methodology.component.html',
})
export class CmhcMethodologyComponent {
  private readonly dataService = inject(CmhcDataService);
  private readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

  readonly e = computed(() => this.dataService.engine());
  readonly filter = signal('');

  readonly tabs = computed<string[]>(() => this.e().NOTES_TABS);

  readonly cards = computed(() => {
    this.dataService.data();
    const e = this.e();
    e.patchNotes(); // fills in this cycle's past-cutoff pools
    const f = this.filter();
    return (e.REPORT_NOTES as CmhcData[])
      .filter((n) => !RETIRED_NOTES.includes(n.title))
      .filter((n) => n.flagLegend || !f || (n.tabs || []).includes(f))
      .map((n) => ({
        title: n.title as string,
        body: n.body as string,
        tabs: (n.tabs || []) as string[],
        legend: !!n.flagLegend,
      }));
  });

  readonly legend = computed(() => {
    const e = this.e();
    return (e.LEGEND_ITEMS as CmhcData[]).map((li) => ({
      label: li.label as string,
      desc: li.desc as string,
      inactive: !!li.inactive,
      dot: DOT[(e.FLAG_META[li.key] || {}).color] || '#8A95B0',
    }));
  });

  constructor() {
    // Flag chips elsewhere link here (v4 goToFlagLegend): scroll to the legend card once it has rendered.
    setTimeout(() => {
      if (this.fragment() === 'legend-note-card') {
        document.getElementById('legend-note-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }
}
