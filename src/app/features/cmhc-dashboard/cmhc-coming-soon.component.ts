import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Temporary stand-in for CMHC tabs that have not been ported yet. */
@Component({
  selector: 'app-cmhc-coming-soon',
  standalone: true,
  template: `
    <div class="notes-wrap">
      <div class="notes-header">
        <h2>{{ title }}</h2>
        <p>This tab is being ported from the Monday Pipeline report and is not available yet.</p>
      </div>
    </div>
  `,
})
export class CmhcComingSoonComponent {
  readonly title = inject(ActivatedRoute).snapshot.data['title'] as string;
}
