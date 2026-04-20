import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { PortalApiService } from '../../core/portal-api.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <ng-container *ngIf="canAccess(); else noAccess">
      <section class="admin-grid">
        <div class="message error" *ngIf="error()">{{ error() }}</div>
        <div class="message success" *ngIf="success()">{{ success() }}</div>

        <section class="card hero">
          <p class="eyebrow">Admin scope</p>
          <h3>Thông tin theo role admin</h3>
          <div class="hero-grid">
            <article>
              <span>Quyền hiện tại</span>
              <strong>ADMIN</strong>
              <p>Có thể xem danh sách người dùng, cấp role và xóa user.</p>
            </article>
            <article>
              <span>User stats</span>
              <strong>{{ totalUsers() }}</strong>
              <p>Tổng số user hiện có trong hệ thống local database.</p>
            </article>
          </div>
        </section>

        <section class="card">
          <p class="eyebrow">Role manager</p>
          <h3>Cấp role cho người dùng</h3>

          <form class="admin-form" (ngSubmit)="assignRole()">
            <label>
              Username
              <input
                name="roleUsername"
                [ngModel]="roleEditor().username"
                (ngModelChange)="updateRoleField('username', $event)"
                placeholder="Nhập username"
              />
            </label>

            <label>
              Role
              <select
                name="roleName"
                [ngModel]="roleEditor().role"
                (ngModelChange)="updateRoleField('role', $event)"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>

            <div class="actions">
              <button type="submit" [disabled]="busy()">
                {{ busy() ? 'Đang cấp role...' : 'Cấp role' }}
              </button>
              <button type="button" class="ghost" (click)="resetRoleEditor()">
                Làm mới form
              </button>
            </div>

            <p class="note">Nhập username và chọn role muốn cấp.</p>
          </form>
        </section>

        <section class="card">
          <p class="eyebrow">User manage</p>
          <h3>Danh sách người dùng</h3>

          <p class="note">Tổng số user: {{ totalUsers() }}</p>

          <div class="table" *ngIf="pagedUsers().length; else emptyUsers">
            <article class="row" *ngFor="let user of pagedUsers()">
              <div class="identity">
                <strong>{{ user.username }}</strong>
                <span>{{ user.email || 'Chưa có email' }}</span>
                <div class="badges">
                  <span class="badge">{{ user.status || 'active' }}</span>
                </div>
              </div>

              <div class="actions">
                <button type="button" class="ghost danger" (click)="deleteUser(user.username)">
                  Xóa
                </button>
              </div>
            </article>
          </div>

          <div class="pagination" *ngIf="totalUsers() > pageSize">
            <button type="button" class="ghost" (click)="prevPage()" [disabled]="currentPage() === 1">
              Trước
            </button>
            <span>Trang {{ currentPage() }} / {{ totalPages() }}</span>
            <button
              type="button"
              class="ghost"
              (click)="nextPage()"
              [disabled]="currentPage() === totalPages()"
            >
              Sau
            </button>
          </div>
        </section>
      </section>
    </ng-container>

    <ng-template #emptyUsers>
      <div class="empty-state">Danh sách user sẽ hiển thị ở đây.</div>
    </ng-template>

    <ng-template #noAccess>
      <section class="card">
        <p class="eyebrow">No access</p>
        <h3>Trang này chỉ dành cho admin</h3>
        <p class="note">JWT hiện tại không có role admin nên giao diện quản trị được ẩn.</p>
      </section>
    </ng-template>
  `,
  styles: [`
    .admin-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 1rem;
    }

    .hero,
    .message {
      grid-column: span 12;
    }

    .admin-grid > .card:not(.hero) {
      grid-column: span 6;
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

    .eyebrow,
    .hero-grid span {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
    }

    h3 {
      margin: 0 0 1rem;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.8rem;
    }

    .hero-grid article,
    .row,
    .empty-state {
      padding: 1rem;
      border-radius: 20px;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
    }

    .hero-grid strong {
      display: block;
      margin-top: 0.35rem;
      font-size: 1.5rem;
    }

    .hero-grid p,
    .note,
    .row span {
      color: #6f625a;
      line-height: 1.6;
    }

    .admin-form,
    .table {
      display: grid;
      gap: 1rem;
    }

    label {
      display: grid;
      gap: 0.55rem;
      color: #6f625a;
    }

    input,
    select,
    button {
      font: inherit;
    }

    input,
    select {
      width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(140, 121, 104, 0.2);
      background: rgba(255, 253, 249, 0.95);
      padding: 0.95rem 1rem;
    }

    .actions,
    .row,
    .badges,
    .pagination {
      display: flex;
      gap: 0.75rem;
    }

    .row {
      justify-content: space-between;
      align-items: center;
    }

    .identity {
      display: grid;
      gap: 0.35rem;
    }

    button {
      border: none;
      cursor: pointer;
      transition: transform 160ms ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    .actions button,
    .pagination button {
      border-radius: 999px;
      padding: 0.85rem 1.05rem;
    }

    .actions button:first-child:not(.ghost) {
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f2;
      font-weight: 700;
    }

    .ghost {
      background: rgba(36, 27, 22, 0.06);
      color: #241b16;
    }

    .danger {
      background: rgba(178, 56, 40, 0.1);
      color: #8b2f24;
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
      min-height: 200px;
      display: grid;
      place-items: center;
      text-align: center;
      color: #6f625a;
    }

    .pagination {
      margin-top: 1rem;
      justify-content: center;
      align-items: center;
    }

    @media (max-width: 980px) {
      .admin-grid > .card:not(.hero) {
        grid-column: span 12;
      }
    }

    @media (max-width: 720px) {
      .hero-grid,
      .row,
      .actions,
      .pagination {
        display: grid;
      }
    }
  `]
})
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
