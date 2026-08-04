import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { UserRole } from '../../core/enums/user-role.enum';
import { AuthService } from '../../core/services/auth.service';
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
  private readonly router = inject(Router);
  private readonly notificationUnreadCount = inject(NotificationUnreadCountService);

  isSidebarExpanded = signal(true);
  isMobileNavOpen = signal(false);
  isAIChatOpen = signal(false);
  openDropdown = signal<string | null>(
    environment.showHomeCapitalAndDataExplorer === true ? null : 'Loans',
  );
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
    const user = this.authService.currentUser();
    return {
      name: user?.name ?? 'John Doe',
      email: user?.email ?? '',
      role: user?.role ?? UserRole.User,
    };
  });

  /** Hidden until environment.managementSummaryEnabled is true. */
  readonly showManagementSummary = computed(
    () => environment.managementSummaryEnabled === true,
  );

  /** Home / Capital / Data Explorer — hidden when flag is false; code kept. */
  readonly showHomeCapitalAndDataExplorer = computed(
    () => environment.showHomeCapitalAndDataExplorer === true,
  );

  /** AI Assistant — hidden when flag is false; component kept. */
  readonly showAiAssistant = computed(() => environment.showAiAssistant === true);

  /** User Management — hidden when flag is false; admin routes kept. */
  readonly showUserManagement = computed(() => environment.showUserManagement === true);

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
    this.openDropdown.update((v) => (v === label ? null : label));
  }

  private shouldHideAppChrome(url: string): boolean {
    return url.startsWith('/capital-dashboard') || url.startsWith('/data-explorer');
  }

  private syncDropdownToRoute(url: string): void {
    const path = url.split('?')[0];

    // Investor Alias Assignment lives under MORTGAGE nav but routes to capital-reporting.
    if (path.startsWith('/mortgage') || path.startsWith('/capital-reporting/investor')) {
      this.openDropdown.set('Loans');
      return;
    }

    if (path.startsWith('/capital-reporting')) {
      this.openDropdown.set('Stats');
    }
  }

  handleLogout(): void {
    void this.authService.logout();
  }
}
