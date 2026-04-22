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
  template: `
    <section class="workflow-grid">
      <div class="message error" *ngIf="error()">{{ error() }}</div>
      <div class="message success" *ngIf="success()">{{ success() }}</div>

      <section class="card">
        <p class="eyebrow">Create Story</p>
        <h3></h3>
        <form class="workflow-form" (ngSubmit)="startProcess()">
          <label>
            Tieu de truyen
            <input
              name="storyTitle"
              [ngModel]="createModel().title"
              (ngModelChange)="updateCreateField('title', $event)"
            />
          </label>
          <label>
            Noi dung
            <textarea
              rows="7"
              name="storyContent"
              [ngModel]="createModel().content"
              (ngModelChange)="updateCreateField('content', $event)"
            ></textarea>
          </label>
          <button type="submit" [disabled]="busy()">{{ busy() ? 'Dang start...' : 'Create' }}</button>
        </form>
      </section>

      <section class="card">
        <p class="eyebrow">Task queue</p>
        <h3>Danh sach task</h3>
        <div class="task-list" *ngIf="filteredTasks().length; else noTasks">
          <button
            type="button"
            class="task-item"
            *ngFor="let task of pagedFilteredTasks()"
            [class.active]="selectedTask()?.id === task.id"
            (click)="selectTask(task.id)"
          >
            <div>
              <strong>{{ task.variables?.title || task.name }}</strong>
              <span>{{ task.key === 'repairStory' ? 'Repair' : 'Review' }}</span>
            </div>
            <small>{{ task.assignee || 'Unassigned' }}</small>
            <small *ngIf="task.status" class="status">{{ getStatusText(task.status) }}</small>
            <small *ngIf="task.variables?.author">by {{ task.variables.author }}</small>
          </button>
          <div class="pagination">
            <button (click)="prevTaskPage()">Prev</button>
            <span>{{ taskPage() }}</span>
            <button (click)="nextTaskPage()">Next</button>
          </div>
        </div>
      </section>

      <section class="card">
        <p class="eyebrow">Task detail</p>
        <h3>Inspector</h3>
        <div *ngIf="selectedTask() as task; else noSelectedTask" class="detail-panel">
          <div class="detail-header">
            <div>
              <strong>{{ task.name }}</strong>
              <span>{{ task.key }}</span>
            </div>
            <span class="badge">{{ canReview() ? 'Review task' : 'Edit task' }}</span>
          </div>

          <button
            *ngIf="!task.assignee"
            type="button"
            (click)="claimTask()"
          >
            Claim task
          </button>

          <ng-container *ngIf="!canReview(); else reviewTemplate">
            <label>
              Tieu de
              <input
                name="taskTitle"
                [ngModel]="editorModel().title"
                (ngModelChange)="updateEditorField('title', $event)"
              />
            </label>
            <label>
              Noi dung
              <textarea
                rows="7"
                name="taskContent"
                [ngModel]="editorModel().content"
                (ngModelChange)="updateEditorField('content', $event)"
              ></textarea>
            </label>
          </ng-container>

          <ng-template #reviewTemplate>
            <div class="review-switch">
              <button type="button" [class.active]="editorModel().approved" (click)="setApproved(true)">
                Approve
              </button>
              <button type="button" [class.active]="!editorModel().approved" (click)="setApproved(false)">
                Reject
              </button>
            </div>
            <div class="preview">
              <strong>{{ editorModel().title || 'Untitled story' }}</strong>
              <p>{{ editorModel().content || 'Chua co noi dung de preview.' }}</p>
            </div>
            <label *ngIf="!editorModel().approved">
              Ly do reject
              <input
                name="rejectReason"
                [ngModel]="editorModel().rejectReason"
                (ngModelChange)="updateEditorField('rejectReason', $event)"
                placeholder="Nhap ly do reject..."
              />
            </label>
          </ng-template>

          <button
            *ngIf="selectedTask()?.assignee"
            type="button"
            (click)="completeTask()"
            [disabled]="busy()"
          >
            {{ busy() ? 'Dang xu ly...' : 'Complete task' }}
          </button>

          <p class="note">
            Backend hien chua co endpoint claim task hoac change status rieng, nen UI dang dung luong start/detail/complete.
          </p>
        </div>
      </section>

      <section class="card">
        <p class="eyebrow">Story status</p>
        <h3>Danh sach truyen</h3>
        <div class="stack" *ngIf="stories().length; else noStories">
          <article class="item" *ngFor="let story of pagedStories()">
            <div class="item__header">
              <strong>{{ story.title }}</strong>
              <span class="badge">{{ story.status }}</span>
            </div>
            <p>{{ story.content }}</p>
          </article>
        </div>
        <div class="pagination">
          <button (click)="prevStoryPage()">Prev</button>
          <span>{{ storyPage() }}</span>
          <button (click)="nextStoryPage()">Next</button>
        </div>
      </section>
    </section>

    <ng-template #noTasks>
      <div class="empty-state">Chưa có ai viết truyện</div>
    </ng-template>

    <ng-template #noSelectedTask>
      <div class="empty-state">Chưa có task, đi đọc truyện đi</div>
    </ng-template>

    <ng-template #noStories>
      <div class="empty-state">Du lieu story duoc backend tra ve sau cac buoc trong workflow.</div>
    </ng-template>
  `,
  styles: [`
    .workflow-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 1rem;
    }

    .message {
      grid-column: span 12;
    }

    .workflow-grid > .card:nth-of-type(1),
    .workflow-grid > .card:nth-of-type(2) {
      grid-column: span 6;
    }

    .workflow-grid > .card:nth-of-type(n + 3) {
      grid-column: span 4;
    }

    .card,
    .message,
    .empty-state {
      border-radius: 24px;
      padding: 1.25rem;
      background: rgba(255, 249, 243, 0.9);
      border: 1px solid rgba(140, 121, 104, 0.18);
      box-shadow: 0 24px 50px rgba(48, 31, 19, 0.08);
    }

    .message.error {
      color: #8b2f24;
      background: rgba(178, 56, 40, 0.1);
    }

    .message.success {
      color: #2f6b54;
      background: rgba(63, 135, 102, 0.12);
    }

    .eyebrow {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
    }

    h3 {
      margin: 0.3rem 0 1rem;
    }

    .workflow-form,
    .detail-panel,
    .stack,
    .task-list,
    .timeline {
      display: grid;
      gap: 0.9rem;
    }

    label {
      display: grid;
      gap: 0.55rem;
      color: #6f625a;
    }

    input,
    textarea,
    button {
      font: inherit;
    }

    input,
    textarea {
      width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(140, 121, 104, 0.2);
      background: rgba(255, 253, 249, 0.95);
      padding: 0.95rem 1rem;
    }

    button {
      border: none;
      cursor: pointer;
      transition: transform 160ms ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    .workflow-form > button,
    .detail-panel > button {
      justify-self: start;
      border-radius: 999px;
      padding: 0.9rem 1.2rem;
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f2;
      font-weight: 700;
    }

    .timeline article,
    .item,
    .task-item,
    .preview,
    .empty-state {
      border-radius: 20px;
      padding: 1rem;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
    }

    .timeline span {
      display: inline-flex;
      width: 2rem;
      height: 2rem;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: rgba(208, 113, 67, 0.12);
      color: #8f3b1e;
      font-weight: 700;
    }

    .timeline p,
    .item p,
    .note,
    .preview p,
    .task-item span,
    .task-item small {
      margin: 0;
      color: #6f625a;
      line-height: 1.6;
    }

    .task-item {
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .task-item:hover {
      border-color: rgba(208, 113, 67, 0.4);
      background: rgba(255, 253, 249, 1);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(48, 31, 19, 0.12);
    }

    .task-item.active {
      border-color: rgba(208, 113, 67, 0.6);
      background: rgba(255, 253, 249, 1);
      box-shadow: 0 8px 24px rgba(208, 113, 67, 0.2);
    }

    .task-item div {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .task-item strong {
      font-size: 1rem;
      color: #241b16;
      font-weight: 600;
    }

    .task-item small {
      font-size: 0.85rem;
      color: #8b6f5a;
      display: block;
      margin-top: 0.2rem;
    }

    .task-item small:last-child {
      color: #6f625a;
      font-style: italic;
    }

    .task-item small.status {
      color: #2f6b54;
      font-weight: 600;
      font-style: normal;
    }

    .task-item span {
      display: inline-block;
      font-size: 0.75rem;
      color: #8f3b1e;
      background: rgba(208, 113, 67, 0.1);
      padding: 0.25rem 0.6rem;
      border-radius: 8px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .review-switch {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .review-switch button {
      border-radius: 16px;
      padding: 0.95rem 1rem;
      background: rgba(36, 27, 22, 0.06);
      color: #241b16;
    }

    .review-switch button.active {
      background: rgba(63, 135, 102, 0.12);
      color: #2f6b54;
    }

    .badge {
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      background: rgba(63, 135, 102, 0.12);
      color: #2e6b52;
      font-size: 0.76rem;
      text-transform: uppercase;
      font-weight: 700;
    }

    .empty-state {
      min-height: 180px;
      display: grid;
      place-items: center;
      text-align: center;
      color: #6f625a;
    }

    @media (max-width: 1160px) {
      .workflow-grid > .card {
        grid-column: span 12 !important;
      }
    }

    @media (max-width: 720px) {
      .item__header,
      .detail-header,
      .task-item div {
        display: grid;
      }

      .review-switch {
        grid-template-columns: 1fr;
      }
    }
  `]
})
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
