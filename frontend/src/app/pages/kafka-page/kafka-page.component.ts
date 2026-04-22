import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { PortalApiService } from '../../core/portal-api.service';
import { StoryEvent, StoryEventType } from '../../core/models';

@Component({
  selector: 'app-kafka-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="kafka-container">
      <div class="feedback error" *ngIf="error()">{{ error() }}</div>
      <div class="feedback success" *ngIf="success()">{{ success() }}</div>

      <section class="card">
        <p class="eyebrow">Kafka Events</p>
        <h3>Gửi Story Event qua Kafka</h3>

        <div class="form-group">
          <label>Event Type</label>
          <select [(ngModel)]="eventType" (change)="onEventTypeChange()">
            <option value="">-- Chọn event type --</option>
            <option [value]="StoryEventType.STORY_CREATED">STORY_CREATED</option>
            <option [value]="StoryEventType.STORY_UPDATED">STORY_UPDATED</option>
            <option [value]="StoryEventType.STORY_SUBMITTED">STORY_SUBMITTED</option>
            <option [value]="StoryEventType.STORY_APPROVED">STORY_APPROVED</option>
            <option [value]="StoryEventType.STORY_REJECTED">STORY_REJECTED</option>
            <option [value]="StoryEventType.STORY_PUBLISHED">STORY_PUBLISHED</option>
            <option [value]="StoryEventType.STORY_DELETED">STORY_DELETED</option>
          </select>
        </div>

        <div class="form-group">
          <label>Story ID</label>
          <input type="number" [(ngModel)]="storyId" placeholder="Nhập story ID" />
        </div>

        <div class="form-group">
          <label>Title</label>
          <input type="text" [(ngModel)]="title" placeholder="Nhập title" />
        </div>

        <div class="form-group">
          <label>Created By</label>
          <input type="text" [(ngModel)]="createdBy" placeholder="Nhập username" />
        </div>

        <div class="form-group" *ngIf="eventType() === StoryEventType.STORY_REJECTED">
          <label>Reject Reason</label>
          <input type="text" [(ngModel)]="rejectReason" placeholder="Lý do từ chối" />
        </div>

        <div class="form-group">
          <label>Message</label>
          <input type="text" [(ngModel)]="message" placeholder="Nhập message tùy chọn" />
        </div>

        <div class="actions">
          <button (click)="sendTestEvent()" [disabled]="loading()">Test Generic Event</button>
          <button (click)="sendSpecificEvent()" [disabled]="loading()">Gửi Event cụ thể</button>
        </div>
      </section>

      <section class="card">
        <p class="eyebrow">Logs</p>
        <h3>Event Logs</h3>
        <div class="logs">
          <div class="log-item" *ngFor="let log of logs(); let i = index">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-type">{{ log.type }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </section>
    </section>
  `,
  styles: [`
    .kafka-container {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .card {
      grid-column: span 12;
      border-radius: 24px;
      padding: 2rem;
      background: rgba(255, 249, 243, 0.9);
      border: 1px solid rgba(140, 121, 104, 0.18);
      box-shadow: 0 24px 50px rgba(48, 31, 19, 0.08);
    }

    .feedback {
      grid-column: span 12;
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1rem;
    }

    .feedback.error {
      background: rgba(178, 56, 40, 0.1);
      color: #8b2f24;
    }

    .feedback.success {
      background: rgba(63, 135, 102, 0.1);
      color: #2e6b52;
    }

    .eyebrow {
      margin: 0 0 0.5rem;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
    }

    h3 {
      margin: 0 0 1.5rem;
      font-size: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #6f625a;
      font-weight: 600;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid rgba(140, 121, 104, 0.3);
      border-radius: 12px;
      font-size: 1rem;
      background: rgba(255, 253, 249, 0.95);
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #d07143;
    }

    .actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .actions button {
      padding: 0.9rem 1.5rem;
      border: none;
      border-radius: 999px;
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f2;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .actions button:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .logs {
      max-height: 400px;
      overflow-y: auto;
      display: grid;
      gap: 0.5rem;
    }

    .log-item {
      padding: 0.75rem;
      border-radius: 8px;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem;
      align-items: center;
    }

    .log-time {
      font-size: 0.75rem;
      color: #8b6f5a;
    }

    .log-type {
      font-weight: 700;
      color: #d07143;
    }

    .log-message {
      grid-column: 2;
      color: #6f625a;
    }

    @media (max-width: 720px) {
      .kafka-container {
        padding: 1rem;
      }

      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class KafkaPageComponent {
  private readonly api = inject(PortalApiService);
  readonly auth = inject(AuthService);
  readonly StoryEventType = StoryEventType;

  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly eventType = signal<StoryEventType | ''>('');
  readonly storyId = signal<number | null>(null);
  readonly title = signal('');
  readonly createdBy = signal('');
  readonly rejectReason = signal('');
  readonly message = signal('');

  readonly logs = signal<Array<{ time: string; type: string; message: string }>>([]);

  onEventTypeChange(): void {
    this.message.set('');
    this.rejectReason.set('');
  }

  addLog(type: string, message: string): void {
    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN');
    this.logs.update((logs) => [...logs, { time, type, message }]);
  }

  async sendTestEvent(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      const event: StoryEvent = {
        storyId: this.storyId() ?? undefined,
        title: this.title() || undefined,
        createdBy: this.createdBy() || undefined,
        eventType: this.eventType() || undefined,
        message: this.message() || undefined
      };

      const result = await this.api.testKafka(event);
      this.success.set(result);
      this.addLog('SUCCESS', `Test event sent: ${this.eventType()}`);
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Không thể gửi event.'));
      this.addLog('ERROR', this.error());
    } finally {
      this.loading.set(false);
    }
  }

  async sendSpecificEvent(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      const storyId = this.storyId();
      const title = this.title();
      const createdBy = this.createdBy();

      if (!storyId || !title || !createdBy) {
        this.error.set('Vui lòng nhập Story ID, Title và Created By');
        return;
      }

      let result: string;

      switch (this.eventType()) {
        case StoryEventType.STORY_CREATED:
          result = await this.api.publishStoryCreated({ storyId, title, createdBy });
          break;
        case StoryEventType.STORY_SUBMITTED:
          result = await this.api.publishStorySubmitted(storyId, title, createdBy);
          break;
        case StoryEventType.STORY_APPROVED:
          result = await this.api.publishStoryApproved(storyId, title, createdBy);
          break;
        case StoryEventType.STORY_REJECTED:
          result = await this.api.publishStoryRejected(storyId, title, createdBy, this.rejectReason());
          break;
        case StoryEventType.STORY_PUBLISHED:
          result = await this.api.publishStoryPublished(storyId, title, createdBy);
          break;
        default:
          this.error.set('Vui lòng chọn event type hợp lệ');
          return;
      }

      this.success.set(result);
      this.addLog('SUCCESS', `${this.eventType()} sent for story ${storyId}`);
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Không thể gửi event.'));
      this.addLog('ERROR', this.error());
    } finally {
      this.loading.set(false);
    }
  }
}
