import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-login.component.html',
})
export class AuthLoginComponent {
  private readonly authService = inject(AuthService);

  signIn(): void {
    void this.authService.loginRedirect(true);
  }
}
