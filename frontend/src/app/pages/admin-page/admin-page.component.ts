import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { PortalApiService } from '../../core/portal-api.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss']})
export class AdminPageComponent {
  private readonly api = inject(PortalApiService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly users = signal<any[]>([]);

  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly roleEditor = signal({
    username: '',
    role: 'USER'
  });

  readonly canAccess = this.auth.isAdmin;

  readonly totalUsers = computed(() => this.users().length);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalUsers() / this.pageSize))
  );

  readonly pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.users().slice(start, start + this.pageSize);
  });

  constructor() {
    if (this.canAccess()) {
      void this.load();
    } else {
      this.loading.set(false);
    }
  }

  updateRoleField(field: 'username' | 'role', value: string): void {
    this.roleEditor.update((state) => ({ ...state, [field]: value }));
  }

  resetRoleEditor(): void {
    this.roleEditor.set({
      username: '',
      role: 'USER'
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      this.users.set(await this.api.getAdminUsers());

      if (this.currentPage() > this.totalPages()) {
        this.currentPage.set(this.totalPages());
      }
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Không tải được danh sách user admin.'));
    } finally {
      this.loading.set(false);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  async assignRole(): Promise<void> {
    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    const roleEditor = this.roleEditor();

    try {
      await this.api.assignUserRole(
        roleEditor.username.trim(),
        roleEditor.role.trim()
      );

      this.success.set(`Đã cấp role ${roleEditor.role} cho user ${roleEditor.username}.`);
      this.resetRoleEditor();
      await this.load();
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Không cấp được role cho người dùng.'));
    } finally {
      this.busy.set(false);
    }
  }

  async deleteUser(username: string): Promise<void> {
    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    try {
      await this.api.deleteManagedUser(username);
      this.success.set(`Đã xóa user ${username}.`);
      await this.load();
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Không xóa được người dùng.'));
    } finally {
      this.busy.set(false);
    }
  }
}
