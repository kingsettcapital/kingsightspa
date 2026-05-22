import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center h-full p-8">
      <h2 class="text-3xl font-semibold text-gray-800 mb-2">404</h2>
      <p class="text-gray-600 mb-4">Page not found</p>
      <a routerLink="/" class="text-blue-600 hover:text-blue-700 underline">
        Go back to Dashboard
      </a>
    </div>
  `,
})
export class NotFoundComponent {}
