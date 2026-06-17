import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { UserRole } from '../../core/enums/user-role.enum';
import { AuthService } from '../../core/services/auth.service';
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

  isSidebarExpanded = signal(true);
  isMobileNavOpen = signal(false);
  isAIChatOpen = signal(false);
  openDropdown = signal<string | null>(null);
  hideAppSidebar = signal(this.shouldHideAppChrome(this.router.url));

  ngOnInit(): void {
    this.syncDropdownToRoute(this.router.url);
    this.hideAppSidebar.set(this.shouldHideAppChrome(this.router.url));

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigation = event as NavigationEnd;
        this.syncDropdownToRoute(navigation.urlAfterRedirects);
        this.hideAppSidebar.set(this.shouldHideAppChrome(navigation.urlAfterRedirects));
        this.closeMobileNav();
      });
  }

  readonly currentUser = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.name ?? 'John Doe',
      email: user?.email ?? '',
      role: user?.role ?? UserRole.User,
    };
  });

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
    if (url.startsWith('/mortgage')) {
      this.openDropdown.set('Loans');
      return;
    }

    if (url.startsWith('/capital-reporting')) {
      this.openDropdown.set('Stats');
    }
  }

  handleLogout(): void {
    void this.authService.logout();
  }
}
