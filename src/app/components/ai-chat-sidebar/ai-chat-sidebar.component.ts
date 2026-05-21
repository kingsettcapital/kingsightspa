import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, X, Send } from 'lucide-angular';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

@Component({
  selector: 'app-ai-chat-sidebar',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, useValue: new LucideIconProvider({ X, Send }), multi: true }],
  template: `
    <div
      class="bg-white border-l border-gray-200 flex flex-col overflow-hidden transition-all duration-300"
      [style.width]="isOpen ? '24rem' : '0'"
    >
      <!-- Header -->
      <div class="h-14 border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
        <h3 class="font-semibold text-gray-800">AI Assistant</h3>
        <button
          (click)="closed.emit()"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <lucide-icon [img]="xIcon" [size]="20" color="#4B5563"></lucide-icon>
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        @for (msg of messages(); track $index) {
          <div class="flex" [class.justify-end]="msg.role === 'user'" [class.justify-start]="msg.role === 'ai'">
            <div
              class="max-w-[80%] px-4 py-2 rounded-lg"
              [class.bg-blue-600]="msg.role === 'user'"
              [class.text-white]="msg.role === 'user'"
              [class.bg-gray-100]="msg.role === 'ai'"
              [class.text-gray-800]="msg.role === 'ai'"
            >
              {{ msg.content }}
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="border-t border-gray-200 p-4 flex-shrink-0">
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="messageInput"
            (keyup.enter)="sendMessage()"
            placeholder="Ask me anything..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            (click)="sendMessage()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <lucide-icon [img]="sendIcon" [size]="18" color="white"></lucide-icon>
          </button>
        </div>
      </div>
    </div>
  `,
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
