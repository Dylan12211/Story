import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import SockJS from 'sockjs-client/dist/sockjs';
import Stomp, { Client, Frame } from 'stompjs';

import { AuthService } from './auth.service';
import { TaskNotification } from './models';

@Injectable({ providedIn: 'root' })

export class NotificationWsService implements OnDestroy {
  private readonly auth = inject(AuthService);

  private stompClient: Client | null = null;

  readonly notifications = signal<TaskNotification[]>([]);
  readonly connected = signal(false);
  readonly tasks = signal<any[]>([]);
  readonly taskUpdateTrigger = signal(0);
  readonly storyUpdateTrigger = signal(0);


  connect(): void {
    const username = this.auth.session()?.username;
    console.log('WS connect() called, username =', username);
    if (!username || this.stompClient?.connected) {
      return;
    }

    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(socket);
    this.stompClient.debug = () => {};
    console.log('WS connected');

    const token = this.auth.session()?.accessToken;
    console.log('WS token =', token ? token.substring(0, 20) + '...' : 'null');

    this.stompClient.connect({ Authorization: `Bearer ${token}` }, () => {
      this.connected.set(true);

      this.stompClient?.subscribe(`/topic/notifications/${username}`, (message: Frame) => {
        console.log('Private notification =', message.body);
        const payload = JSON.parse(message.body) as TaskNotification;
        this.notifications.update((items) => [payload, ...items]);
      });

      if (this.auth.isAdmin()) {
        this.stompClient?.subscribe('/topic/notifications/admins', (message: Frame) => {
          console.log('Admin notification =', message.body);
          const payload = JSON.parse(message.body) as TaskNotification;
          this.notifications.update((items) => [payload, ...items]);
        });
        this.stompClient?.subscribe('/topic/tasks', (message: Frame) => {
          console.log('Task update =', message.body);
          const payload = JSON.parse(message.body);
          this.taskUpdateTrigger.update(v => v + 1);

          // Xử lý theo type của message
          if (payload.type === 'TASK_CREATED' || payload.type === 'TASK_COMPLETED' || payload.type === 'TASK_CLAIMED') {
            // Trigger reload tasks từ API
            this.refreshTasks();
          }
        });
      }

      // Subscribe story updates (cho tất cả users)
      this.stompClient?.subscribe('/topic/stories', (message: Frame) => {
        console.log('Story update =', message.body);
        const payload = JSON.parse(message.body);
        this.storyUpdateTrigger.update(v => v + 1);
      });
    }, (error) => {
      console.error('WS connect error', error);
    });
  }

  private refreshTasks(): void {
    console.log('Refreshing tasks...');
  }

  markAllAsRead(): void {
    this.notifications.set([]);
  }

  disconnect(): void {
    if (this.stompClient?.connected) {
      this.stompClient.disconnect(() => {
        this.connected.set(false);
      });
    }
    this.stompClient = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
