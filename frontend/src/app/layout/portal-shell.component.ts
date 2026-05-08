import { CommonModule } from '@angular/common';
import { Component, computed, inject , signal, effect} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NotificationWsService } from '../core/notification-ws.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../core/i18n/language-switcher.component';

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './portal-shell.component.html',
  styleUrls: ['./portal-shell.component.scss']
})
export class PortalShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isAdmin = this.auth.isAdmin;
  readonly roleLabel = computed(() =>
    this.isAdmin() ? 'Admin portal owner' : 'User workspace'
  );

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }

  readonly notificationsWs = inject(NotificationWsService);
  readonly unreadCount = computed(() => this.notificationsWs.notifications().length);
  readonly showNotifications = signal(false);

  constructor() {
    console.log('PortalShell init');
    this.notificationsWs.connect();
    
    // Reconnect WebSocket when session changes (login/logout)
    effect(() => {
      const session = this.auth.session();
      if (session) {
        console.log('Session detected, connecting WebSocket');
        this.notificationsWs.connect();
      } else {
        console.log('No session, disconnecting WebSocket');
        this.notificationsWs.disconnect();
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications.update((value) => !value);
  }

  handleNotificationClick(item: any): void {
    // Đánh dấu đã đọc
    this.notificationsWs.markAsRead(item.id);
    // Navigate tới workflow page
    this.router.navigate(['/portal/workflow']);
    // Đóng notification panel
    this.showNotifications.set(false);
  }
}