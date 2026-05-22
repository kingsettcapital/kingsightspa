import { Component } from '@angular/core';

@Component({
  selector: 'app-asset',
  standalone: true,
  template: `
    <div class="p-8">
      <h2 class="text-3xl font-semibold text-gray-800 mb-2">Asset</h2>
      <p class="text-gray-600">Manage assets</p>
    </div>
  `,
})
export class AssetComponent {}
