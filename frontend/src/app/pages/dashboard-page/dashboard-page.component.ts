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
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['dashboard-page.component.scss']
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
