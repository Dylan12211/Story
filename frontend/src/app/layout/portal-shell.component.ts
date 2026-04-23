import { CommonModule } from '@angular/common';
import { Component, computed, inject , signal, effect} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NotificationWsService } from '../core/notification-ws.service';

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="portal-shell">
      <aside class="portal-sidebar">
        <div class="brand-block">
          <p class="eyebrow">Story portal</p>
          <h1>StoryOps</h1>
          <p>

          </p>
        </div>

        <nav class="nav-list">
          <a routerLink="/portal/dashboard" routerLinkActive="nav-list__item--active">Tổng quan</a>
          <a routerLink="/portal/profile" routerLinkActive="nav-list__item--active">Thông tin cá nhân</a>
          <a routerLink="/portal/workflow" routerLinkActive="nav-list__item--active">Quản lý truyện</a>
          <a routerLink="/portal/reports" routerLinkActive="nav-list__item--active">Export Jasper</a>
          <a routerLink="/portal/architecture" routerLinkActive="nav-list__item--active">Tài liệu tích hợp</a>
          <a *ngIf="isAdmin()" routerLink="/portal/admin" routerLinkActive="nav-list__item--active">
            Quản lý người dùng
          </a>
        </nav>

        <div class="sidebar-foot">
          <span>{{ auth.session()?.username }}</span>
          <small>{{ roleLabel() }}</small>
        </div>
      </aside>

      <main class="portal-content">
        <header class="content-header">
          <div class="content-header__meta">
            <span>{{ auth.session()?.email || auth.session()?.username }}</span>
            <small>Role hiện tại: {{ roleLabel() }}</small>
          </div>

          <div class="content-header__actions">
            <div class="notification-wrap">
              <button type="button" class="notification-button" (click)="toggleNotifications()">
                <span class="notification-button__icon">🔔</span>
                <span class="notification-button__badge" *ngIf="unreadCount()">{{ unreadCount() }}</span>
              </button>

              <div class="notification-panel" *ngIf="showNotifications()">
                <div class="notification-panel__header">
                  <strong>Thong bao</strong>
                </div>

                <div class="notification-panel__empty" *ngIf="!notificationsWs.notifications().length">
                  Chua co thong bao nao.
                </div>

                <div class="notification-list" *ngIf="notificationsWs.notifications().length">
                  <article class="notification-item" *ngFor="let item of notificationsWs.notifications()" (click)="handleNotificationClick(item)">
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.message }}</p>
                    <small>{{ item.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}</small>
                  </article>
                </div>
              </div>
            </div>

            <button type="button" class="content-header__logout" (click)="logout()">
              Dang xuat
            </button>
          </div>

        </header>

        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .portal-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      background:
        radial-gradient(circle at top left, rgba(194, 116, 59, 0.14), transparent 26%),
        radial-gradient(circle at bottom right, rgba(69, 104, 86, 0.12), transparent 20%),
        #f5efe7;
      color: #241b16;
    }

    .portal-sidebar {
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 1.5rem;
      padding: 1.5rem;
      background: linear-gradient(180deg, rgba(29, 21, 16, 0.96), rgba(62, 35, 24, 0.96));
      color: #fff7ef;
    }

    .brand-block {
      display: grid;
      gap: 0.8rem;
    }

    .eyebrow {
      margin: 0;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #8b6f5a;
    }

    .brand-block .eyebrow {
      color: rgba(255, 244, 232, 0.7);
    }

    h1,
    h2 {
      margin: 0;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      line-height: 0.95;
    }

    h1 {
      font-size: 3rem;
    }

    .brand-block p:not(.eyebrow) {
      margin: 0;
      color: rgba(255, 244, 232, 0.78);
      line-height: 1.7;
    }

    .nav-list {
      display: grid;
      gap: 0.55rem;
      align-content: start;
    }

    .nav-list a {
      color: rgba(255, 244, 232, 0.76);
      text-decoration: none;
      padding: 0.95rem 1rem;
      border-radius: 18px;
      border: 1px solid transparent;
      transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
    }

    .nav-list a:hover,
    .nav-list__item--active {
      transform: translateY(-1px);
      background: rgba(255, 245, 235, 0.08);
      border-color: rgba(255, 245, 235, 0.12);
      color: #fffaf5;
    }

    .sidebar-foot {
      display: grid;
      gap: 0.35rem;
      padding: 1rem;
      border-radius: 20px;
      background: rgba(255, 245, 235, 0.08);
    }

    .sidebar-foot span {
      font-weight: 700;
    }

    .sidebar-foot small {
      color: rgba(255, 244, 232, 0.66);
    }

    button {
      border: none;
      cursor: pointer;
      font: inherit;
      transition: transform 160ms ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    .sidebar-foot button {
      margin-top: 0.7rem;
      border-radius: 999px;
      padding: 0.8rem 1rem;
      font-weight: 700;
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f3;
    }

    .portal-content {
      padding: 1.5rem;
      display: grid;
      gap: 1.2rem;
      align-content: start;
    }

    .content-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: end;
      padding: 1.3rem 1.5rem;
      border-radius: 28px;
      background: rgba(255, 250, 246, 0.82);
      border: 1px solid rgba(140, 121, 104, 0.16);
      box-shadow: 0 20px 50px rgba(48, 31, 19, 0.08);
    }

    h2 {
      font-size: clamp(1.9rem, 3vw, 3rem);
    }

    .content-header__meta {
      display: grid;
      gap: 0.3rem;
      justify-items: end;
      color: #6f625a;
    }

    @media (max-width: 1100px) {
      .portal-shell {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .portal-content,
      .portal-sidebar {
        padding: 1rem;
      }

      .content-header {
        display: grid;
        align-items: start;
      }

      .content-header__meta {
        justify-items: start;
      }
    }
    .sidebar-foot {
      display: grid;
      gap: 0.35rem;
      padding: 1rem;
      border-radius: 20px;
      background: rgba(255, 245, 235, 0.08);
    }

    .sidebar-foot span {
      font-weight: 700;
    }

    .sidebar-foot small {
      color: rgba(255, 244, 232, 0.66);
    }

    button {
      border: none;
      cursor: pointer;
      font: inherit;
      transition: transform 160ms ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    .content-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      padding: 1.3rem 1.5rem;
      border-radius: 28px;
      background: rgba(255, 250, 246, 0.82);
      border: 1px solid rgba(140, 121, 104, 0.16);
      box-shadow: 0 20px 50px rgba(48, 31, 19, 0.08);
    }

    .content-header__meta {
      display: grid;
      gap: 0.3rem;
      justify-items: start;
      color: #6f625a;
    }

    .content-header__meta span {
      font-weight: 700;
      color: #241b16;
    }

    .content-header__logout {
      border-radius: 999px;
      padding: 0.8rem 1.2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f3;
      white-space: nowrap;
    }

    @media (max-width: 720px) {
      .portal-content,
      .portal-sidebar {
        padding: 1rem;
      }

      .content-header {
        display: grid;
        align-items: start;
      }

      .content-header__meta {
        justify-items: start;
      }
    }
    //Chuông
    .content-header__actions {
      display: flex;
      align-items: center;
      gap: 0.9rem;
    }

    .notification-wrap {
      position: relative;
    }

    .notification-button {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 999px;
      background: rgba(255, 245, 235, 0.92);
      border: 1px solid rgba(140, 121, 104, 0.16);
      display: grid;
      place-items: center;
    }

    .notification-button__icon {
      font-size: 1.1rem;
    }

    .notification-button__badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 22px;
      height: 22px;
      border-radius: 999px;
      padding: 0 0.35rem;
      background: #b23828;
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
      display: grid;
      place-items: center;
    }

    .notification-panel {
      position: absolute;
      top: calc(100% + 0.75rem);
      right: 0;
      width: 340px;
      max-height: 420px;
      overflow: auto;
      padding: 1rem;
      border-radius: 20px;
      background: rgba(255, 250, 246, 0.98);
      border: 1px solid rgba(140, 121, 104, 0.16);
      box-shadow: 0 20px 50px rgba(48, 31, 19, 0.12);
      z-index: 20;
    }

    .notification-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.9rem;
    }

    .notification-panel__header button {
      background: transparent;
      color: #8f3b1e;
      font-weight: 700;
    }

    .notification-list {
      display: grid;
      gap: 0.75rem;
    }

    .notification-item {
      padding: 0.85rem 0.9rem;
      border-radius: 16px;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
      cursor: pointer;
      transition: background 160ms ease, border-color 160ms ease;
    }

    .notification-item:hover {
      background: rgba(255, 253, 249, 1);
      border-color: rgba(140, 121, 104, 0.3);
    }

    .notification-item strong,
    .notification-item p,
    .notification-item small {
      display: block;
    }

    .notification-item p {
      margin: 0.35rem 0;
      color: #6f625a;
    }

    .notification-item small {
      color: #8b6f5a;
    }

    .notification-panel__empty {
      color: #6f625a;
    }


  `]
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
