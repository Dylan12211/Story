import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationWsService } from '../../core/notification-ws.service';

import { AuthService } from '../../core/auth.service';
import { PortalApiService } from '../../core/portal-api.service';

@Component({
  selector: 'app-workflow-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-page.component.html',
  styleUrls: ['./workflow-page.component.scss']})
export class WorkflowPageComponent {
  private readonly api = inject(PortalApiService);
  private readonly auth = inject(AuthService);
  private readonly ws = inject(NotificationWsService);

  readonly isAdmin = this.auth.isAdmin;
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly stories = signal<any[]>([]);
  readonly tasks = this.ws.tasks;
  readonly selectedTask = signal<any | null>(null);
  readonly createModel = signal({ title: '', content: '' });
  readonly editorModel = signal({ title: '', content: '', approved: true, rejectReason: '' });
  readonly taskPage = signal(1);
  readonly storyPage = signal(1);
  readonly pageSize = 5;


  readonly pagedTasks = computed(() => {
    const start = (this.taskPage() - 1) * this.pageSize;
    return this.tasks().slice(start, start + this.pageSize);
  });

  readonly filteredTasks = computed(() => {
    const username = this.auth.session()?.username;
    console.log('Computing filteredTasks, total tasks:', this.tasks().length);
    console.log('Tasks:', this.tasks());
    if (this.isAdmin()) {
      return this.tasks(); // Admin thấy hết task
    }
    // User chỉ thấy task của mình
    return this.tasks().filter(task => task.assignee === username || !task.assignee);
  });

  readonly pagedFilteredTasks = computed(() => {
    const start = (this.taskPage() - 1) * this.pageSize;
    return this.filteredTasks().slice(start, start + this.pageSize);
  });

  readonly pagedStories = computed(() => {
    const start = (this.storyPage() - 1) * this.pageSize;
    return this.stories().slice(start, start + this.pageSize);
  });

  readonly canReview = computed(() => {
    const task = this.selectedTask();
    return task?.taskDefinitionKey === 'adminReview' && !!task?.assignee;
  });

  constructor() {
    void this.load();
    this.ws.connect();

    // Tasks được update trực tiếp bởi ws.tasks qua WebSocket
    // Reload stories khi storyUpdateTrigger thay đổi
    effect(() => {
      this.ws.storyUpdateTrigger();
      void this.load();
    });

    // Force reload khi taskUpdateTrigger thay đổi để đảm bảo UI update
    effect(() => {
      const trigger = this.ws.taskUpdateTrigger();
      console.log('taskUpdateTrigger changed:', trigger);
      // Force reload stories vì story status có thể thay đổi khi task complete
      void this.load();
    });
  }

  updateCreateField(field: 'title' | 'content', value: string): void {
    this.createModel.update((state) => ({ ...state, [field]: value }));
  }

  updateEditorField(field: 'title' | 'content' | 'rejectReason', value: string): void {
    this.editorModel.update((state) => ({ ...state, [field]: value }));
  }

  setApproved(approved: boolean): void {
    this.editorModel.update((state) => ({ ...state, approved }));
  }

  nextTaskPage() {
    if (this.taskPage() * this.pageSize < this.filteredTasks().length) {
      this.taskPage.update((p) => p + 1);
    }
  }

  prevTaskPage() {
    if (this.taskPage() > 1) {
      this.taskPage.update((p) => p - 1);
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'WAITING_AUTHOR_REPAIR':
        return 'Đang chờ tác giả sửa lại';
      case 'WAITING_ADMIN_REVIEW':
        return 'Đang chờ admin chấp nhận';
      case 'PENDING_AUTHOR':
        return 'Chờ tác giả claim';
      case 'PENDING_ADMIN':
        return 'Chờ admin claim';
      case 'IN_PROGRESS':
        return 'Đang xử lý';
      case 'PENDING':
        return 'Chờ xử lý';
      default:
        return status;
    }
  }

  nextStoryPage() {
    if (this.storyPage() * this.pageSize < this.stories().length) {
      this.storyPage.update((p) => p + 1);
    }
  }

  prevStoryPage() {
    if (this.storyPage() > 1) {
      this.storyPage.update((p) => p - 1);
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.taskPage.set(1);
    this.storyPage.set(1);

    try {
      const [stories, tasks] = await Promise.all([
        this.api.getStories(),
        this.api.getTasks()
      ]);

      this.stories.set(stories);
      // Tasks giờ đến từ ws.tasks, không set ở đây để tránh overwrite WebSocket updates

      if (!tasks.some((task) => task.id === this.selectedTask()?.id)) {
        this.selectedTask.set(null);
      }
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Khong tai duoc du lieu workflow.'));
    } finally {
      this.loading.set(false);
    }
  }


  async startProcess(): Promise<void> {
    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    try {
      await this.api.startWorkflow(this.createModel().title, this.createModel().content);
      this.success.set('Da start business process cho story.');
      this.createModel.set({ title: '', content: '' });
      await this.load();
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Khong start duoc process.'));
    } finally {
      this.busy.set(false);
    }
  }

  async selectTask(taskId: string): Promise<void> {
    try {
      const detail = await this.api.getTaskDetail(taskId);
      if (!detail) {
        this.selectedTask.set(null);
        await this.ws.refreshTasks();
        return;
      }
      this.selectedTask.set(detail);
      this.editorModel.set({
        title: String(detail.variables['title'] ?? ''),
        content: String(detail.variables['content'] ?? ''),
        approved: true,
        rejectReason: String(detail.variables['rejectReason'] ?? '')
      });
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Khong tai duoc task detail.'));
    }
  }


  async completeTask(): Promise<void> {
    const currentTask = this.selectedTask();
    if (!currentTask) return;

    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    const payload = this.canReview()
      ? { approved: this.editorModel().approved, rejectReason: this.editorModel().rejectReason }
      : { title: this.editorModel().title, content: this.editorModel().content };

    try {
      await this.api.completeTask(currentTask.id, payload);
      this.success.set('Da hoan thanh task hien tai.');
      await this.load();
      this.selectedTask.set(null);
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Khong complete duoc task.'));
    } finally {
      this.busy.set(false);
    }
  }


  async claimTask(): Promise<void> {
    if (!this.isAdmin()) return;

    const task = this.selectedTask();
    if (!task) return;

    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    try {
      await this.api.claimTask(task.id);

      const tasks = await this.api.getTasks();
      this.tasks.set(tasks);

      const updatedTask = await this.api.getTaskDetail(task.id);
      this.selectedTask.set(updatedTask);

      this.editorModel.set({
        title: String(updatedTask.variables['title'] ?? ''),
        content: String(updatedTask.variables['content'] ?? ''),
        approved: true,
        rejectReason: String(updatedTask.variables['rejectReason'] ?? '')
      });

      this.success.set('Claim task thanh cong');
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Khong claim duoc task'));
    } finally {
      this.busy.set(false);
    }
  }
}
