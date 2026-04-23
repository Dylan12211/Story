import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import SockJS from 'sockjs-client/dist/sockjs';
import Stomp, { Client, Frame } from 'stompjs';

import { AuthService } from './auth.service';
import { PortalApiService } from './portal-api.service';
import { TaskNotification } from './models';

@Injectable({ providedIn: 'root' })

export class NotificationWsService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(PortalApiService);

  private stompClient: Client | null = null;
  private isConnecting = false;

  readonly notifications = signal<TaskNotification[]>([]);
  readonly connected = signal(false);
  readonly tasks = signal<any[]>([]);
  readonly taskUpdateTrigger = signal(0);
  readonly storyUpdateTrigger = signal(0);


  connect(): void {
  const session = this.auth.session();
  const username = session?.username;
  const token = session?.accessToken;

  console.log('WS connect() called, username =', username, 'token =', token ? 'present' : 'null');

  if (!username || !token) {
    console.log('WS connect skipped: missing username/token');
    return;
  }

  if (this.isConnecting) {
    console.log('WS connect skipped: already connecting');
    return;
  }

  // Disconnect existing connection before reconnecting
  if (this.stompClient) {
    console.log('WS disconnecting existing connection...');
    this.disconnect();
  }

  this.isConnecting = true;

  try {
    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(socket);
    this.stompClient.debug = () => {};

    console.log('WS connecting with token...');

    this.stompClient.connect({ Authorization: `Bearer ${token}` }, () => {
      console.log('WS connected successfully');
      this.connected.set(true);
      this.isConnecting = false;

      // Load tasks ban đầu khi connect thành công
      this.refreshTasks();

      // Load thông báo chưa đọc từ database
      console.log('About to call loadUnreadNotifications');
      this.loadUnreadNotifications();
      console.log('loadUnreadNotifications called');

      this.stompClient?.subscribe(`/topic/notifications/${username}`, (message: Frame) => {
        console.log('Private notification =', message.body);
        const payload = JSON.parse(message.body) as TaskNotification;
        this.notifications.update((items) => [payload, ...items]);
      });

      // Subscribe task updates cho cả user và admin
      this.stompClient?.subscribe('/topic/tasks', (message: Frame) => {
        console.log('Task update received =', message.body);
        const payload = JSON.parse(message.body);
        console.log('Task update payload =', payload);
        console.log('Task update type =', payload.type);
        this.taskUpdateTrigger.update(v => v + 1);

        if (payload.type === 'TASK_CREATED' || payload.type === 'TASK_COMPLETED' || payload.type === 'TASK_CLAIMED') {
          console.log('Refreshing tasks due to type =', payload.type);
          this.refreshTasks();
        } else {
          console.log('Not refreshing tasks, type =', payload.type);
        }
      });

      if (this.auth.isAdmin()) {
        this.stompClient?.subscribe('/topic/notifications/admins', (message: Frame) => {
          console.log('Admin notification =', message.body);
          const payload = JSON.parse(message.body) as TaskNotification;
          this.notifications.update((items) => [payload, ...items]);
        });
      }

      this.stompClient?.subscribe('/topic/stories', (message: Frame) => {
        console.log('Story update =', message.body);
        const payload = JSON.parse(message.body);
        this.storyUpdateTrigger.update(v => v + 1);
      });
    }, (error) => {
      console.error('WS connect error', error);
      this.connected.set(false);
      this.isConnecting = false;
      // Retry after 5 seconds
      setTimeout(() => this.connect(), 5000);
    });
  } catch (error) {
    console.error('WS connection failed', error);
    this.connected.set(false);
    this.isConnecting = false;
  }
}

async loadUnreadNotifications(): Promise<void> {
  try {
    console.log('=== loadUnreadNotifications START ===');
    const notifications = await this.api.getUnreadNotifications();
    console.log('Notifications from API:', notifications);
    this.notifications.set(notifications);
    console.log('Notifications set:', this.notifications());
    console.log('=== loadUnreadNotifications END ===');
  } catch (error) {
    console.error('Failed to load unread notifications:', error);
  }
}
  async refreshTasks(): Promise<void> {
    console.log('=== refreshTasks START ===');
    console.log('Current tasks before refresh:', this.tasks().length);
    try {
      const tasks = await this.api.getTasks();
      console.log('Tasks from API:', tasks.length, tasks);
      this.tasks.set(tasks);
      console.log('Tasks set to ws.tasks:', this.tasks().length);
      console.log('=== refreshTasks END ===');
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  }

  async markAsRead(id: number): Promise<void> {
  try {
    await this.api.markNotificationAsRead(id);
    this.notifications.update((items) => items.filter((item) => item.id !== id));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
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
