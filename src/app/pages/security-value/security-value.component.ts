import { Component } from '@angular/core';

@Component({
  selector: 'app-security-value',
  standalone: true,
  template: `
    <div class="p-8">
      <h2 class="text-3xl font-semibold text-gray-800 mb-2">Security Value</h2>
      <p class="text-gray-600">View security values</p>
    </div>
  `,
})
export class SecurityValueComponent {}
