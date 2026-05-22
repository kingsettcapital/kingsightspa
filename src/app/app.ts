import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    @if (
      authService.requireLogin &&
      (!authService.isMsalReady() || authService.isRedirectInProgress())
    ) {
      <div
        class="flex h-screen items-center justify-center bg-white text-gray-700"
      >
        <p class="text-lg font-medium">Signing you in...</p>
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class App {
  readonly authService = inject(AuthService);
}
