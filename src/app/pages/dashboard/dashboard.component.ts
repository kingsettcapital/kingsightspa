import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="p-8">
      <div class="mb-8">
        <h2 class="text-3xl font-semibold text-gray-800 mb-2">Dashboard</h2>
        <p class="text-gray-600">Welcome to your enterprise application</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <h3 class="font-semibold text-gray-800 mb-2">Quick Stats</h3>
          <p class="text-gray-600 text-sm">View your key metrics</p>
        </div>
        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <h3 class="font-semibold text-gray-800 mb-2">Recent Activity</h3>
          <p class="text-gray-600 text-sm">Track recent changes</p>
        </div>
        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <h3 class="font-semibold text-gray-800 mb-2">Performance</h3>
          <p class="text-gray-600 text-sm">Monitor system health</p>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {}
