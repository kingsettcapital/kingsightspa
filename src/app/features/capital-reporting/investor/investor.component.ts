import { Component } from '@angular/core';

@Component({
  selector: 'app-investor',
  standalone: true,
  template: `
    <div class="p-8">
      <h2 class="text-3xl font-semibold text-gray-800 mb-2">Investor</h2>
      <p class="text-gray-600">Investor information and management</p>
    </div>
  `,
})
export class InvestorComponent {}
