import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AccessControlService } from '../../core/access/access-control.service';
import { AuthService } from '../../core/services/auth.service';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { NotificationUnreadCountService } from '../../core/services/notification-unread-count.service';
import { environment } from '../../../environments/environment';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Home,
  ChartBar,
  LogOut,
  Menu,
  X,
  MessageSquare,
  User,
  ChevronDown,
  Database,
  Landmark,
} from 'lucide-angular';
import { AIChatSidebarComponent } from '../../shared/components/ai-chat-sidebar/ai-chat-sidebar.component';
import { KingsettLogoComponent } from '../../shared/components/kingsett-logo';
import { ToastContainerComponent } from '../../shared/components/toast/toast-container.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    AIChatSidebarComponent,
    KingsettLogoComponent,
    ToastContainerComponent,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        Home,
        ChartBar,
        LogOut,
        Menu,
        X,
        MessageSquare,
        User,
        ChevronDown,
        Database,
        Landmark,
      }),
      multi: true,
    },
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly accessControl = inject(AccessControlService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly router = inject(Router);
  private readonly notificationUnreadCount = inject(NotificationUnreadCountService);

  isSidebarExpanded = signal(true);
  isMobileNavOpen = signal(false);
  isAIChatOpen = signal(false);
  openDropdown = signal<string | null>(
    environment.showHomeCapitalAndDataExplorer === true ? null : 'Loans',
  );
  /** Nested Mortgage subsections (Reporting / Alias Management). */
  readonly openMortgageSections = signal<Record<string, boolean>>({
    reporting: true,
    aliasManagement: true,
  });
  hideAppSidebar = signal(this.shouldHideAppChrome(this.router.url));

  ngOnInit(): void {
    this.notificationUnreadCount.refresh();
    this.syncDropdownToRoute(this.router.url);
    this.hideAppSidebar.set(this.shouldHideAppChrome(this.router.url));

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigation = event as NavigationEnd;
        this.syncDropdownToRoute(navigation.urlAfterRedirects);
        this.hideAppSidebar.set(this.shouldHideAppChrome(navigation.urlAfterRedirects));
        this.notificationUnreadCount.refresh();
        this.closeMobileNav();
      });
  }

  readonly unreadNotificationCount = this.notificationUnreadCount.count;

  readonly currentUser = computed(() => {
    const authUser = this.authService.currentUser();
    const appUser = this.currentAppUser.user();
    const displayName = appUser
      ? CurrentAppUserService.formatDisplayName(appUser)
      : (authUser?.name ?? 'User');
    return {
      name: displayName,
      email: authUser?.email ?? appUser?.email ?? '',
      role: this.accessControl.roleLabel(),
    };
  });

  /** Env flag, or admin (admins see UAT-hidden sections). */
  readonly showManagementSummary = computed(() =>
    this.accessControl.isFeatureVisible(environment.managementSummaryEnabled),
  );

  /** Env flag, or admin (Home / Capital / Data Explorer). */
  readonly showHomeCapitalAndDataExplorer = computed(() =>
    this.accessControl.isFeatureVisible(environment.showHomeCapitalAndDataExplorer),
  );

  /** Env flag, or admin. */
  readonly showAiAssistant = computed(() =>
    this.accessControl.isFeatureVisible(environment.showAiAssistant),
  );

  /** Admin only — also visible in UAT when the env flag is off. */
  readonly showUserManagement = computed(() => this.accessControl.canAccessUserManagement());

  homeIcon = Home;
  chartBarIcon = ChartBar;
  logOutIcon = LogOut;
  menuIcon = Menu;
  xIcon = X;
  messageSquareIcon = MessageSquare;
  userIcon = User;
  chevronDownIcon = ChevronDown;
  landmarkIcon = Landmark;
  databaseIcon = Database;

  toggleMobileNav(): void {
    this.isMobileNavOpen.update((v) => !v);
    if (this.isMobileNavOpen()) {
      this.isSidebarExpanded.set(true);
    }
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  toggleSidebarExpanded(): void {
    this.isSidebarExpanded.update((v) => !v);
    if (!this.isSidebarExpanded()) {
      this.openDropdown.set(null);
    }
  }

  toggleAIChat(): void {
    this.isAIChatOpen.update((v) => !v);
  }

  toggleDropdown(label: string): void {
    if (!this.isSidebarExpanded()) {
      this.isSidebarExpanded.set(true);
      this.openDropdown.set(label);
      return;
    }
    this.openDropdown.update((current) => (current === label ? null : label));
  }

  isMortgageSectionOpen(section: string): boolean {
    return this.openMortgageSections()[section] === true;
  }

  toggleMortgageSection(section: string): void {
    this.openMortgageSections.update((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  handleLogout(): void {
    void this.authService.logout();
  }

  private syncDropdownToRoute(url: string): void {
    if (url.includes('/mortgage')) {
      this.openDropdown.set('Loans');
      if (url.includes('/management-summary')) {
        this.openMortgageSections.update((current) => ({ ...current, reporting: true }));
      }
      if (url.includes('/loan-alias-assignment') || url.includes('/investor-alias-assignment')) {
        this.openMortgageSections.update((current) => ({ ...current, aliasManagement: true }));
      }
    }
  }

  private shouldHideAppChrome(url: string): boolean {
    const path = url.split('?')[0];
    return (
      path.startsWith('/capital-dashboard') ||
      path.startsWith('/mortgage/management-summary') ||
      path.includes('/loan-detail')
    );
  }
}
