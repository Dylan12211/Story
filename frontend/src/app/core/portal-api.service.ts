import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import {
  ApiEnvelope,
  IdCardProfileResponse,
  ManagedUserPayload,
  ProfileResponse,
  StoryEvent,
  StoryEventType,
  StoryItem,
  UserManagementItem,
  WorkflowTask,
  WorkflowTaskDetail
} from './models';

@Injectable({ providedIn: 'root' })
export class PortalApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBase = 'http://localhost:8080';

  async assignUserRole(username: string, role: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/admin/users/${encodeURIComponent(username)}/roles`,
        { role },
        { headers: this.auth.authHeaders() }
      )
    );
  }

  async updateProfile(payload: {
    firstName: string;
    lastName: string;
    email: string;
    dob: string;
    idNumber?: string;
    gender?: string;
    nationality?: string;
    placeOfOrigin?: string;
    placeOfResidence?: string;
    dateOfExpiry?: string;
  }): Promise<ProfileResponse> {
    const response = await firstValueFrom(
      this.http.put<ApiEnvelope<ProfileResponse>>(
        `${this.apiBase}/profile/me`,
        payload,
        {
          headers: this.auth.authHeaders()
        }
      )
    );

    return response.result;
  }
  async getProfile(): Promise<ProfileResponse> {
    const response = await firstValueFrom(
      this.http.get<ApiEnvelope<ProfileResponse>>(`${this.apiBase}/profile/me`, {
        headers: this.auth.authHeaders()
      })
    );
    return response.result;
  }

  async scanIdCardProfile(file: File): Promise<IdCardProfileResponse> {
    const formData = new FormData();
    formData.append('idCardImage', file);

    const response = await firstValueFrom(
      this.http.post<ApiEnvelope<IdCardProfileResponse>>(
        `${this.apiBase}/profile/me/id-card/scan`,
        formData,
        {
          headers: this.auth.authHeaders()
        }
      )
    );

    return response.result;
  }

  async getStories(): Promise<StoryItem[]> {
    return firstValueFrom(
      this.http.get<StoryItem[]>(`${this.apiBase}/api/stories`, {
        headers: this.auth.authHeaders()
      })
    );
  }

  async getTasks(): Promise<WorkflowTask[]> {
    const session = this.auth.session();
    if (!session) {
      console.log('No session, returning empty tasks');
      return [];
    }

    // if (!session.roles.includes('ROLE_ADMIN')) {
    //   return [];
    // }

    try {
      return firstValueFrom(
        this.http.get<WorkflowTask[]>(`${this.apiBase}/api/workflow/tasks`, {
          headers: this.auth.authHeaders()
        })
      );
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  }

  async getTaskDetail(taskId: string): Promise<WorkflowTaskDetail> {
    if (!this.auth.session()) {
      throw new Error('No active session. Please login again.');
    }
    return firstValueFrom(
      this.http.get<WorkflowTaskDetail>(`${this.apiBase}/api/workflow/tasks/${taskId}`, {
        headers: this.auth.authHeaders()
      })
    );
  }

  async startWorkflow(title: string, content: string): Promise<string> {
    if (!this.auth.session()) {
      throw new Error('No active session. Please login again.');
    }
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/workflow/start`,
        { title, content },
        { headers: this.auth.authHeaders(), responseType: 'text' }
      )
    );
  }

  async claimTask(taskId: string): Promise<string> {
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/workflow/tasks/${taskId}/claim`,
        {},
        {
          headers: this.auth.authHeaders(),
          responseType: 'text'
        }
      )
    );
  }

  async completeTask(taskId: string, payload: Record<string, unknown>): Promise<string> {
    return firstValueFrom(
      this.http.post(`${this.apiBase}/api/workflow/tasks/${taskId}/complete`, payload, {
        headers: this.auth.authHeaders(),
        responseType: 'text'
      })
    );
  }

  async getAdminUsers(): Promise<UserManagementItem[]> {
    const response = await firstValueFrom(
      this.http.get<Array<Record<string, unknown>>>(`${this.apiBase}/api/admin/users`, {
        headers: this.auth.authHeaders()
      })
    );

    return response.map((item) => ({
      id: String(item['userId'] ?? ''),
      username: String(item['username'] ?? ''),
      email: String(item['email'] ?? ''),
      firstName: String(item['firstName'] ?? ''),
      lastName: String(item['lastName'] ?? ''),
      status: String(item['status'] ?? ''),
      enabled: String(item['status'] ?? '').toLowerCase() !== 'disabled',
      emailVerified: Boolean(String(item['email'] ?? '').trim()),
      roles: []
    }));
  }

  async createManagedUser(payload: ManagedUserPayload): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBase}/api/users`, payload));
  }

  async updateManagedUser(username: string, email: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiBase}/api/users/${encodeURIComponent(username)}`, { email })
    );
  }

  async updateManagedUserPassword(username: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiBase}/api/users/${encodeURIComponent(username)}/password`, { password })
    );
  }

  async deleteManagedUser(username: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBase}/api/users/${encodeURIComponent(username)}`));
  }

  async exportUsers(format: 'pdf' | 'xlsx', selectedColumns: string[]): Promise<Blob> {
    const columnsParam = selectedColumns.join(',');
    return firstValueFrom(
      this.http.get(`${this.apiBase}/api/reports/users?type=${format}&selectedColumns=${columnsParam}`, {
        headers: this.auth.authHeaders(),
        responseType: 'blob'
      })
    );
  }
  async exportStories(format: 'pdf' | 'xlsx', selectedColumns: string[]): Promise<Blob> {
    const columnsParam = selectedColumns.join(',');
    return firstValueFrom(
      this.http.get(`${this.apiBase}/api/reports/stories?type=${format}&selectedColumns=${columnsParam}`, {
        headers: this.auth.authHeaders(),
        responseType: 'blob'
      })
    );
  }

  async exportTasks(format: 'pdf' | 'xlsx', selectedColumns: string[]): Promise<Blob> {
    const columnsParam = selectedColumns.join(',');
    return firstValueFrom(
      this.http.get(`${this.apiBase}/api/reports/tasks?type=${format}&selectedColumns=${columnsParam}`, {
        headers: this.auth.authHeaders(),
        responseType: 'blob'
      })
    );
  }

  formatError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }
      if (error.message) {
        return error.message;
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }

  async testKafka(event: StoryEvent): Promise<string> {
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/stories/kafka/test`,
        event,
        {
          headers: this.auth.authHeaders(),
          responseType: 'text'
        }
      )
    );
  }

  async publishStoryCreated(event: StoryEvent): Promise<string> {
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/stories/kafka/publish-created`,
        event,
        {
          headers: this.auth.authHeaders(),
          responseType: 'text'
        }
      )
    );
  }

  async publishStorySubmitted(storyId: number, title: string, createdBy: string): Promise<string> {
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/stories/kafka/publish-submitted`,
        { storyId, title, createdBy },
        {
          headers: this.auth.authHeaders(),
          responseType: 'text'
        }
      )
    );
  }

  async publishStoryApproved(storyId: number, title: string, createdBy: string): Promise<string> {
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/stories/kafka/publish-approved`,
        { storyId, title, createdBy },
        {
          headers: this.auth.authHeaders(),
          responseType: 'text'
        }
      )
    );
  }

  async publishStoryRejected(storyId: number, title: string, createdBy: string, reason: string): Promise<string> {
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/stories/kafka/publish-rejected`,
        { storyId, title, createdBy, reason },
        {
          headers: this.auth.authHeaders(),
          responseType: 'text'
        }
      )
    );
  }

  async publishStoryPublished(storyId: number, title: string, createdBy: string): Promise<string> {
    return firstValueFrom(
      this.http.post(
        `${this.apiBase}/api/stories/kafka/publish-published`,
        { storyId, title, createdBy },
        {
          headers: this.auth.authHeaders(),
          responseType: 'text'
        }
      )
    );
  }
  async getUnreadNotifications(): Promise<any[]> {
  return firstValueFrom(
    this.http.get<any[]>(`${this.apiBase}/api/notifications/unread`, {
      headers: this.auth.authHeaders()
    })
  );
}

async markNotificationAsRead(id: number): Promise<void> {
  await firstValueFrom(
    this.http.put(`${this.apiBase}/api/notifications/${id}/read`, {}, {
      headers: this.auth.authHeaders()
    })
  );
}
  
}
