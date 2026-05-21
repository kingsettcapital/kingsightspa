import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Home,
  DollarSign,
  ChartBar,
  LogOut,
  Menu,
  X,
  MessageSquare,
  User,
  Building2,
} from 'lucide-angular';
import { AIChatSidebarComponent } from '../ai-chat-sidebar/ai-chat-sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    AIChatSidebarComponent,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        Home,
        DollarSign,
        ChartBar,
        LogOut,
        Menu,
        X,
        MessageSquare,
        User,
        Building2,
      }),
      multi: true,
    },
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  isSidebarOpen = signal(true);
  isAIChatOpen = signal(false);
  openDropdown = signal<string | null>(null);

  currentUser = {
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Administrator',
  };

  homeIcon = Home;
  dollarSignIcon = DollarSign;
  chartBarIcon = ChartBar;
  logOutIcon = LogOut;
  menuIcon = Menu;
  xIcon = X;
  messageSquareIcon = MessageSquare;
  userIcon = User;
  building2Icon = Building2;

  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
  }

  toggleAIChat() {
    this.isAIChatOpen.update((v) => !v);
  }

  toggleDropdown(label: string) {
    this.openDropdown.update((v) => (v === label ? null : label));
  }

  closeDropdown() {
    this.openDropdown.set(null);
  }

  handleLogout() {
    console.log('Logging out...');
  }
}
