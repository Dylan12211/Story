import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="auth-page">
      <section class="auth-panel">
        <div class="card">
          <p class="eyebrow">Identity access</p>
          <h2>Sangtacviet</h2>
<!--          <p class="lead">-->
<!--            Form được tách riêng theo luồng login, register và forgot password để bạn dễ thay-->
<!--            endpoint hoặc validation.-->
<!--          </p>-->

          <div class="tab-row">
            <button type="button" [class.active]="activeTab() === 'login'" (click)="activeTab.set('login')">
              Đăng nhập
            </button>

            <button
              type="button"
              [class.active]="activeTab() === 'register'"
              (click)="activeTab.set('register')"
            >
              Đăng ký
            </button>
            <button
              type="button"
              [class.active]="activeTab() === 'forgot'"
              (click)="activeTab.set('forgot')"
            >
              Quên mật khẩu
            </button>
          </div>

          <p class="message error" *ngIf="error()">{{ error() }}</p>
          <p class="message success" *ngIf="success()">{{ success() }}</p>

          <form class="auth-form" *ngIf="activeTab() === 'login'" (ngSubmit)="login()">
            <label>
              Username
              <input
                name="username"
                [ngModel]="loginModel().username"
                (ngModelChange)="updateLoginField('username', $event)"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                [ngModel]="loginModel().password"
                (ngModelChange)="updateLoginField('password', $event)"
              />
            </label>
            <button type="submit" [disabled]="busy()">{{ busy() ? 'Đang đăng nhập...' : 'Vào portal' }}</button>
            <div class="divider">Hoặc</div>

            <button type="button" class="google-btn" (click)="loginWithGoogle()">
              Đăng nhập với Google
            </button>
          </form>

          <form class="auth-form auth-form--grid" *ngIf="activeTab() === 'register'" (ngSubmit)="register()">
            <label>
              Username
              <input
                name="registerUsername"
                [ngModel]="registerModel().username"
                (ngModelChange)="updateRegisterField('username', $event)"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="registerPassword"
                [ngModel]="registerModel().password"
                (ngModelChange)="updateRegisterField('password', $event)"
              />
            </label>
            <label>
              Email
              <input
                name="registerEmail"
                [ngModel]="registerModel().email"
                (ngModelChange)="updateRegisterField('email', $event)"
              />
            </label>
            <label>
              First name
              <input
                name="registerFirstName"
                [ngModel]="registerModel().firstName"
                (ngModelChange)="updateRegisterField('firstName', $event)"
              />
            </label>
            <label>
              Last name
              <input
                name="registerLastName"
                [ngModel]="registerModel().lastName"
                (ngModelChange)="updateRegisterField('lastName', $event)"
              />
            </label>
            <label>
              Ngày sinh
              <input
                type="date"
                name="registerDob"
                [ngModel]="registerModel().dob"
                (ngModelChange)="updateRegisterField('dob', $event)"
              />
            </label>
            <button type="submit" [disabled]="busy()">{{ busy() ? 'Đang tạo tài khoản...' : 'Đăng ký' }}</button>
          </form>

          <form class="auth-form" *ngIf="activeTab() === 'forgot'" (ngSubmit)="forgotPassword()">
            <label>
              Email đăng ký
              <input
                type="email"
                name="forgotEmail"
                [ngModel]="forgotEmail()"
                (ngModelChange)="forgotEmail.set($event)"
              />
            </label>
            <button type="submit" [disabled]="busy()">
              {{ busy() ? 'Đang gửi email...' : 'Gửi link reset mật khẩu' }}
            </button>
          </form>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .auth-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(360px, 52vw) minmax(0, 1fr);
      background: #f5efe7;
    }

    .auth-hero {
      position: relative;
      overflow: hidden;
      background:
        linear-gradient(145deg, rgba(22, 17, 13, 0.94), rgba(86, 45, 24, 0.82)),
        url('https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&q=80')
          center/cover;
      color: #fff7ef;
    }

    .auth-hero__overlay {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.3)),
        repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 4px);
      opacity: 0.35;
    }

    .auth-hero__content {
      position: relative;
      z-index: 1;
      min-height: 100%;
      padding: 3rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.74rem;
      color: #8b6f5a;
    }

    .auth-hero .eyebrow {
      color: rgba(255, 242, 230, 0.74);
    }

    h1,
    h2 {
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      margin: 0;
      line-height: 0.94;
    }

    h1 {
      max-width: 9ch;
      font-size: clamp(3rem, 6vw, 5.5rem);
    }

    .auth-hero__copy,
    .lead {
      margin: 0;
      line-height: 1.7;
    }

    .auth-hero__copy {
      max-width: 34rem;
      color: rgba(255, 242, 230, 0.82);
    }

    .auth-hero__steps {
      display: grid;
      gap: 0.9rem;
    }

    .auth-hero__steps article,
    .card {
      border-radius: 24px;
      background: rgba(255, 249, 243, 0.9);
      border: 1px solid rgba(140, 121, 104, 0.18);
      box-shadow: 0 24px 50px rgba(48, 31, 19, 0.08);
    }

    .auth-hero__steps article {
      max-width: 36rem;
      display: grid;
      gap: 0.6rem;
      padding: 1rem 1.1rem;
      background: rgba(255, 245, 235, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: none;
    }

    .auth-hero__steps span {
      display: inline-flex;
      width: 2rem;
      height: 2rem;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
    }

    .auth-hero__steps p {
      margin: 0;
      line-height: 1.6;
      color: rgba(255, 242, 230, 0.8);
    }

    .auth-panel {
      padding: 2rem;
      display: grid;
      align-items: center;
    }

    .card {
      padding: 1.5rem;
      backdrop-filter: blur(12px);
    }

    .lead {
      color: #6f625a;
      margin-top: 0.7rem;
    }

    .tab-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin: 1rem 0;
    }

    label {
      display: grid;
      gap: 0.55rem;
      color: #6f625a;
    }

    input,
    button {
      font: inherit;
    }

    input {
      width: 100%;
      border-radius: 16px;
      border: 1px solid rgba(140, 121, 104, 0.2);
      background: rgba(255, 253, 249, 0.95);
      padding: 0.95rem 1rem;
    }

    input:focus {
      outline: none;
      border-color: rgba(208, 113, 67, 0.58);
      box-shadow: 0 0 0 4px rgba(208, 113, 67, 0.12);
    }

    .tab-row button,
    .auth-form button {
      border: none;
      cursor: pointer;
      transition: transform 160ms ease, background 160ms ease;
    }

    .tab-row button {
      border-radius: 999px;
      padding: 0.8rem 1rem;
      background: rgba(36, 27, 22, 0.06);
      color: #6f625a;
    }

    .tab-row button.active,
    .auth-form button {
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f2;
    }

    .auth-form {
      display: grid;
      gap: 1rem;
    }

    .auth-form--grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .auth-form button {
      justify-self: start;
      border-radius: 999px;
      padding: 0.95rem 1.3rem;
      font-weight: 700;
    }

    .message {
      margin: 0 0 1rem;
      padding: 0.9rem 1rem;
      border-radius: 18px;
    }

    .message.error {
      color: #8b2f24;
      background: rgba(178, 56, 40, 0.1);
    }

    .message.success {
      color: #2f6b54;
      background: rgba(63, 135, 102, 0.12);
    }

    @media (max-width: 1100px) {
      .auth-page {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .auth-hero__content,
      .auth-panel {
        padding: 1rem;
      }

      .auth-form--grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AuthPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly activeTab = signal<'login' | 'register' | 'forgot'>('login');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly loginModel = signal({ username: '', password: '' });
  readonly registerModel = signal({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    dob: ''
  });
  readonly forgotEmail = signal('');

  updateLoginField(field: 'username' | 'password', value: string): void {
    this.loginModel.update((state) => ({ ...state, [field]: value }));
  }

  updateRegisterField(
    field: 'username' | 'password' | 'email' | 'firstName' | 'lastName' | 'dob',
    value: string
  ): void {
    this.registerModel.update((state) => ({ ...state, [field]: value }));
  }

  async login(): Promise<void> {
    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    try {
      const { username, password } = this.loginModel();
      await this.auth.login(username.trim(), password);
      await this.router.navigate(['/portal/dashboard']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Đăng nhập thất bại.');
    } finally {
      this.busy.set(false);
    }
  }

  async register(): Promise<void> {
    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    try {
      await this.auth.register(this.registerModel());
      this.success.set('Đăng ký thành công. Bạn có thể đăng nhập ngay bằng tài khoản mới.');
      this.activeTab.set('login');
      this.loginModel.update((state) => ({ ...state, username: this.registerModel().username, password: '' }));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Đăng ký thất bại.');
    } finally {
      this.busy.set(false);
    }
  }

  async forgotPassword(): Promise<void> {
    this.error.set('');
    this.success.set('');
    this.busy.set(true);

    try {
      const message = await this.auth.forgotPassword(this.forgotEmail().trim());
      this.success.set(message);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Không gửi được yêu cầu quên mật khẩu.');
    } finally {
      this.busy.set(false);
    }
  }
  async loginWithGoogle(): Promise<void> {
    try {
      const url = await fetch('http://localhost:8080/api/auth/google/url').then(r => r.text());
      window.location.href = url;
    } catch {
      this.error.set('Không thể kết nối Google login');
    }
  }
}
