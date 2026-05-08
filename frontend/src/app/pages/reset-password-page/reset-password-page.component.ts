import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './reset-password-page.component.scss',
  template: `
    <main class="auth-portal-viewport">
      <div class="stars-container"></div>
      <div class="glow-sphere-top"></div>
      <div class="glow-sphere-bottom"></div>

      <section class="auth-container animate-fade-in">
        <div class="glass-auth-card">

          <header class="auth-header">
            <h2 class="portal-title">Đặt lại mật khẩu</h2>
            <p class="eyebrow">Sangtacviet Identity Portal</p>
          </header>

          <div class="status-messages">
            @if (error()) {
              <div class="message error-msg animate-shake">
                <span class="material-icons">report_problem</span>
                <span>{{ error() }}</span>
              </div>
            }
            @if (success()) {
              <div class="message success-msg animate-pulse">
                <span class="material-icons">verified</span>
                <span>{{ success() }}</span>
              </div>
            }
          </div>

          <div class="auth-content-area">
            @if (!isTokenValid()) {
              <div class="token-invalid">
                <span class="material-icons" style="font-size: 64px; color: #ff6b6b;">error_outline</span>
                <h3>Link không hợp lệ</h3>
                <p>Link reset mật khẩu đã hết hạn hoặc không tồn tại.</p>
                <button class="btn-primary-glow" (click)="goToLogin()">Quay lại đăng nhập</button>
              </div>
            } @else if (isSuccess()) {
              <div class="success-view">
                <span class="material-icons" style="font-size: 64px; color: #4ade80;">check_circle</span>
                <h3>Đổi mật khẩu thành công!</h3>
                <p>Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập ngay bây giờ.</p>
                <button class="btn-primary-glow" (click)="goToLogin()">Đăng nhập ngay</button>
              </div>
            } @else {
              <form class="fantasy-form" (ngSubmit)="resetPassword()">
                <div class="form-group">
                  <label for="newPassword">Mật khẩu mới</label>
                  <div class="input-container">
                    <input
                      id="newPassword"
                      type="password"
                      name="newPassword"
                      [(ngModel)]="newPassword"
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      [disabled]="busy()"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="confirmPassword">Xác nhận mật khẩu</label>
                  <div class="input-container">
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      [(ngModel)]="confirmPassword"
                      placeholder="Nhập lại mật khẩu mới"
                      [disabled]="busy()"
                    />
                  </div>
                </div>

                <button type="submit" class="btn-primary-glow full-width" [disabled]="busy()">
                  @if (busy()) {
                    <span class="loader"></span>
                    Đang cập nhật...
                  } @else {
                    <span>Đổi mật khẩu</span>
                  }
                </button>

                <button type="button" class="btn-outline full-width" (click)="goToLogin()">
                  Quay lại đăng nhập
                </button>
              </form>
            }
          </div>

          <footer class="auth-footer">
            <p>&copy; 2026 Sangtacviet • Huyền thoại trong từng chữ</p>
          </footer>

        </div>
      </section>
    </main>
  `
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  token = signal<string>('');
  newPasswordValue = '';
  confirmPasswordValue = '';
  
  error = signal<string>('');
  success = signal<string>('');
  busy = signal<boolean>(false);
  isTokenValid = signal<boolean>(true);
  isSuccess = signal<boolean>(false);

  get newPassword(): string { return this.newPasswordValue; }
  set newPassword(value: string) { this.newPasswordValue = value; }
  
  get confirmPassword(): string { return this.confirmPasswordValue; }
  set confirmPassword(value: string) { this.confirmPasswordValue = value; }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');
      if (!token) {
        this.isTokenValid.set(false);
        this.error.set('Không tìm thấy token reset mật khẩu');
      } else {
        this.token.set(token);
        // Token cơ bản có độ dài 36 ký tự (UUID)
        if (token.length < 10) {
          this.isTokenValid.set(false);
          this.error.set('Token không hợp lệ');
        }
      }
    });
  }

  async resetPassword(): Promise<void> {
    this.error.set('');
    this.success.set('');

    const password = this.newPasswordValue;
    const confirm = this.confirmPasswordValue;

    if (!password || password.length < 6) {
      this.error.set('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirm) {
      this.error.set('Mật khẩu xác nhận không khớp');
      return;
    }

    this.busy.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.apiBase}/api/reset-password`,
          { token: this.token(), password: password },
          { responseType: 'text' }
        )
      );

      this.success.set(response);
      this.isSuccess.set(true);
    } catch (err: any) {
      if (err.error) {
        this.error.set(err.error);
      } else {
        this.error.set('Có lỗi xảy ra, vui lòng thử lại sau');
      }
    } finally {
      this.busy.set(false);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth']);
  }
}
