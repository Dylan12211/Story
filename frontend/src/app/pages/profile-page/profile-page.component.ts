import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalApiService } from '../../core/portal-api.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule,FormsModule],
  template: `
    <section class="profile-grid">
      <div class="message" *ngIf="error()">{{ error() }}</div>

      <section class="card" *ngIf="profile() as currentProfile">
        <p class="eyebrow">Profile data</p>
        <h3>Chi tiết cá nhân</h3>

        <dl class="detail-list">
          <div><dt>Profile ID</dt><dd>{{ currentProfile.profileId }}</dd></div>
<!--          <div><dt>User ID</dt><dd>{{ currentProfile.userId }}</dd></div>-->
          <div><dt>Username</dt><dd>{{ currentProfile.username }}</dd></div>
          <div><dt>Email</dt><dd>{{ currentProfile.email }}</dd></div>
          <div><dt>Họ tên</dt><dd>{{ currentProfile.firstName }} {{ currentProfile.lastName }}</dd></div>
          <div><dt>Ngày sinh</dt><dd>{{ currentProfile.dob | date:'dd/MM/yyyy' }}</dd></div>
        </dl>

        <button (click)="startEdit()" class="btn">Edit Profile</button>
      </section>

      <!-- FORM EDIT -->
      <section class="card edit-card" *ngIf="isEditing()">
        <p class="eyebrow">Edit profile</p>
        <h3>Chỉnh sửa thông tin</h3>

        <div class="form-grid">
          <div class="field">
            <label>First name</label>
            <input [(ngModel)]="form.firstName" />
          </div>

          <div class="field">
            <label>Last name</label>
            <input [(ngModel)]="form.lastName" />
          </div>

          <div class="field full">
            <label>Email</label>
            <input [(ngModel)]="form.email" />
          </div>

          <div class="field full">
            <label>Ngày sinh</label>
            <input type="date" [(ngModel)]="form.dob" />
          </div>
        </div>

        <div class="actions">
          <button class="btn primary" (click)="save()">Save changes</button>
          <button class="btn ghost" (click)="cancel()">Cancel</button>
        </div>
      </section>
    </section>
  `,
  styles: [`
    .profile-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 1rem;
    }

    .summary,
    .message {
      grid-column: span 12;
    }

    .profile-grid > .card:not(.summary) {
      grid-column: span 6;
    }

    .card,
    .message {
      border-radius: 24px;
      padding: 1.25rem;
      background: rgba(255, 249, 243, 0.9);
      border: 1px solid rgba(140, 121, 104, 0.18);
      box-shadow: 0 24px 50px rgba(48, 31, 19, 0.08);
    }

    .message {
      color: #8b2f24;
      background: rgba(178, 56, 40, 0.1);
    }

    .eyebrow,
    dt,
    .identity-block__eyebrow {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
    }

    h3,
    .identity-block strong {
      margin: 0;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
    }

    h3 {
      margin-bottom: 1rem;
    }

    .identity-block {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .identity-block strong {
      display: block;
      margin-top: 0.35rem;
      font-size: clamp(1.8rem, 4vw, 2.8rem);
    }

    .copy,
    .role-panels p {
      margin: 0.7rem 0 0;
      color: #6f625a;
      line-height: 1.7;
    }

    .roles,
    .role-panels {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .badge {
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      background: rgba(63, 135, 102, 0.12);
      color: #2e6b52;
      text-transform: uppercase;
      font-size: 0.76rem;
      font-weight: 700;
    }

    .detail-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.8rem;
      margin: 0;
    }

    .detail-list div,
    .role-panels article {
      border-radius: 20px;
      padding: 1rem;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
    }

    dd {
      margin: 0.5rem 0 0;
      font-weight: 700;
    }

    @media (max-width: 960px) {
      .profile-grid > .card:not(.summary) {
        grid-column: span 12;
      }
    }

    @media (max-width: 720px) {
      .identity-block,
      .detail-list {
        display: grid;
      }

      .detail-list {
        grid-template-columns: 1fr;
      }
    }

    //editProfile
    .edit-card {
      animation: fadeIn 0.25s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .field.full {
      grid-column: span 2;
    }

    label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #8b6f5a;
      margin-bottom: 0.4rem;
    }

    input {
      padding: 0.8rem 1rem;
      border-radius: 14px;
      border: 1px solid rgba(140, 121, 104, 0.2);
      background: rgba(255, 253, 249, 0.9);
      outline: none;
      transition: all 0.2s ease;
      font-size: 0.95rem;
    }

    input:focus {
      border-color: #8b6f5a;
      box-shadow: 0 0 0 3px rgba(139, 111, 90, 0.15);
    }

    .actions {
      display: flex;
      gap: 0.8rem;
      margin-top: 1.5rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.6rem 1.2rem;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      transition: 0.2s;
    }

    .btn.primary {
      background: #8b6f5a;
      color: white;
    }

    .btn.primary:hover {
      background: #6f5847;
    }

    .btn.ghost {
      background: transparent;
      border: 1px solid rgba(140, 121, 104, 0.3);
      color: #6f625a;
    }

    .btn.ghost:hover {
      background: rgba(140, 121, 104, 0.08);
    }
  `]
})
export class ProfilePageComponent {
  private readonly api = inject(PortalApiService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly profile = signal<any | null>(null);
  readonly isEditing = signal(false);
  form = {
    firstName: '',
    lastName: '',
    email: '',
    dob: ''
  };

  startEdit() {
    const p = this.profile();
    if (!p) return;

    this.form = {
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      dob: p.dob ? p.dob.substring(0, 10) : ''
    };

    this.isEditing.set(true);
  }
  cancel() {
    this.isEditing.set(false);
  }
  constructor() {
    void this.load();
  }

  async save() {
    try {
      await this.api.updateProfile(this.form);

      await this.load(); // reload profile

      this.isEditing.set(false);
    } catch (err) {
      this.error.set('Update thất bại');
    }
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      this.profile.set(await this.api.getProfile());
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Không tải được thông tin profile.'));
    } finally {
      this.loading.set(false);
    }
  }
}
