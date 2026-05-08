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
  templateUrl: './kafka-page.component.html',
  styleUrls: ['./kafka-page.component.scss']})
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
