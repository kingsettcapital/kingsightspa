import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  authError,
  authLog,
  logAuthEnvironment,
  logUrlAuthParams,
} from '../../../core/utils/auth-logger.util';

@Component({
  selector: 'app-login-failed',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login-failed.component.html',
})
export class LoginFailedComponent implements OnInit {
  ngOnInit(): void {
    authError('Navigated to login-failed page');
    logAuthEnvironment();
    logUrlAuthParams();
    authLog(
      'Check browser DevTools console for [Auth] and [MSAL] messages. ' +
        'Common causes: redirect URI mismatch in Azure AD, invalid client/tenant, or scope misconfiguration.'
    );
  }
}
