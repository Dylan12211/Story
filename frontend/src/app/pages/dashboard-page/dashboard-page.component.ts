import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationWsService } from '../../core/notification-ws.service';

import { AuthService } from '../../core/auth.service';
import { PortalApiService } from '../../core/portal-api.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="dashboard-grid">
      <div class="feedback" *ngIf="error()">{{ error() }}</div>

      <section class="card hero">
        <div class="hero-banner">
          <div>
            <p class="hero-banner__label">Người dùng hiện tại</p>
            <strong>{{ profileName() || auth.session()?.username }}</strong>
            <p class="hero-banner__copy">
              {{ canManageUsers() ? 'Admin' : 'User' }}
            </p>
          </div>
          <div class="hero-banner__actions">
            <a routerLink="/portal/workflow">Mở workflow</a>
            <a routerLink="/portal/reports">Mở report builder</a>
          </div>
        </div>
      </section>

      <section class="card stats">
        <p class="eyebrow">Realtime</p>
        <h3>Chỉ số nhanh</h3>
        <div class="stats-grid">
          <article>
            <span>Tổng truyện</span>
            <strong>{{ stats().totalStories }}</strong>
          </article>
          <article>
            <span>Đã xuất bản</span>
            <strong>{{ stats().publishedStories }}</strong>
          </article>
          <article>
            <span>Đang chờ duyệt</span>
            <strong>{{ stats().pendingStories }}</strong>
          </article>
          <article>
            <span>Task workflow</span>
            <strong>{{ stats().totalTasks }}</strong>
          </article>
        </div>
      </section>

      <section class="card">
        <p class="eyebrow">Library</p>
        <h3>Truyện gần đây</h3>
        <div class="stack" *ngIf="stories().length; else noStories">
          <article class="item" *ngFor="let story of stories().slice(0, 4)">
            <div class="item__header">
              <strong>{{ story.title }}</strong>
              <span class="badge">{{ story.status }}</span>
            </div>
            <p>{{ story.content }}</p>
          </article>
        </div>
      </section>

      <section class="card">
        <p class="eyebrow">Queue</p>
        <h3>Task cần xử lý</h3>
        <div class="stack" *ngIf="tasks().length; else noTasks">
          <article class="item" *ngFor="let task of tasks().slice(0, 5)">
            <div class="item__header">
              <strong>{{ task.name }}</strong>
              <span>{{ task.assignee || 'Candidate task' }}</span>
            </div>
            <p>{{ task.key }}</p>
          </article>
        </div>
      </section>
    </section>

    <ng-template #noStories>
      <div class="empty-state">Chưa có truyện</div>
    </ng-template>

    <ng-template #noTasks>
      <div class="empty-state">Chưa có task, đi đọc truyện đi</div>
    </ng-template>
  `,
  styles: [`
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 1rem;
    }

    .feedback,
    .hero,
    .stats {
      grid-column: span 12;
    }

    .dashboard-grid > .card:not(.hero):not(.stats) {
      grid-column: span 4;
    }

    .card,
    .feedback {
      border-radius: 24px;
      padding: 1.25rem;
      background: rgba(255, 249, 243, 0.9);
      border: 1px solid rgba(140, 121, 104, 0.18);
      box-shadow: 0 24px 50px rgba(48, 31, 19, 0.08);
    }

    .feedback {
      color: #8b2f24;
      background: rgba(178, 56, 40, 0.1);
    }

    .eyebrow {
      margin: 0 0 0.4rem;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
    }

    h3 {
      margin: 0 0 1rem;
      font-size: 1.35rem;
    }

    .hero-banner,
    .item__header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .hero-banner__label {
      margin: 0;
      color: #8b6f5a;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.72rem;
    }

    .hero-banner strong {
      display: block;
      margin-top: 0.3rem;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      font-size: clamp(1.8rem, 4vw, 2.8rem);
    }

    .hero-banner__copy,
    .item p {
      color: #6f625a;
      line-height: 1.7;
    }

    .hero-banner__actions {
      display: flex;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .hero-banner__actions a {
      text-decoration: none;
      border-radius: 999px;
      padding: 0.9rem 1.1rem;
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f2;
      font-weight: 700;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.8rem;
    }

    .stats-grid article,
    .item,
    .empty-state {
      padding: 1rem;
      border-radius: 20px;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
    }

    .stats-grid span,
    .item span,
    .empty-state {
      color: #6f625a;
    }

    .stats-grid strong {
      display: block;
      margin-top: 0.35rem;
      font-size: 2rem;
    }

    .stack {
      display: grid;
      gap: 0.8rem;
    }

    .item p {
      margin: 0.6rem 0 0;
    }

    .badge {
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      background: rgba(63, 135, 102, 0.12);
      color: #2e6b52;
      font-size: 0.76rem;
      text-transform: uppercase;
    }

    .empty-state {
      min-height: 180px;
      display: grid;
      place-items: center;
      text-align: center;
    }

    @media (max-width: 980px) {
      .dashboard-grid > .card:not(.hero):not(.stats) {
        grid-column: span 12;
      }

      .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 720px) {
      .hero-banner,
      .item__header {
        display: grid;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardPageComponent {
  private readonly api = inject(PortalApiService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly stories = signal<Array<{ id: number; title: string; status: string; content: string }>>([]);
  readonly tasks = signal<Array<{ id: string; name: string; key: string; assignee: string | null }>>([]);
  readonly profileName = signal('');

  readonly stats = computed(() => {
    const stories = this.stories();
    return {
      totalStories: stories.length,
      publishedStories: stories.filter((item) => item.status === 'PUBLISHED').length,
      pendingStories: stories.filter((item) => item.status === 'PENDING').length,
      totalTasks: this.tasks().length
    };
  });

  readonly canManageUsers = this.auth.isAdmin;
  private readonly ws = inject(NotificationWsService);

  constructor() {
    void this.load();
    this.ws.connect();

    effect(() => {
      this.ws.taskUpdateTrigger();
      void this.load();
    });
    effect(() => {
      this.ws.storyUpdateTrigger();
      void this.load();
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const [profile, stories, tasks] = await Promise.all([
        this.api.getProfile(),
        this.api.getStories(),
        this.api.getTasks()
      ]);
      this.profileName.set([profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username);
      this.stories.set(stories);
      this.tasks.set(tasks);
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Không tải được dashboard.'));
    } finally {
      this.loading.set(false);
    }
  }
}
