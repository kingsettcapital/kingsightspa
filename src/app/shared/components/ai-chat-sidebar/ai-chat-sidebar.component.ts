import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Send,
  X,
} from 'lucide-angular';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

@Component({
  selector: 'app-ai-chat-sidebar',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider({ X, Send }), multi: true },
  ],
  templateUrl: './ai-chat-sidebar.component.html',
  styleUrl: './ai-chat-sidebar.component.scss',
})
export class AIChatSidebarComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  xIcon = X;
  sendIcon = Send;

  messageInput = '';

  messages = signal<ChatMessage[]>([
    {
      role: 'ai',
      content: "Hello! I'm your AI assistant. How can I help you today?",
    },
  ]);

  sendMessage() {
    const text = this.messageInput.trim();
    if (!text) return;

    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.messageInput = '';

    setTimeout(() => {
      this.messages.update((msgs) => [
        ...msgs,
        {
          role: 'ai',
          content:
            "I'm a placeholder AI assistant. In production, this would connect to your AI backend service.",
        },
      ]);
    }, 500);
  }
}
