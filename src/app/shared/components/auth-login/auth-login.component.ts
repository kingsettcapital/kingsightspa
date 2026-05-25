import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { KingsettDiamondPatternComponent } from '../kingsett-diamond-pattern';
import { KingsettLogoComponent } from '../kingsett-logo';

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [RouterLink, KingsettDiamondPatternComponent, KingsettLogoComponent],
  templateUrl: './auth-login.component.html',
  styleUrl: './auth-login.component.scss',
})
export class AuthLoginComponent {
  private readonly authService = inject(AuthService);

  signIn(): void {
    void this.authService.loginRedirect(true);
  }
}
