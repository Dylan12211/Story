import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { CccdDetectionService, CCCDDetectionResult } from '../../core/cccd-detection.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrls: ['./auth-page.component.scss']
})
export class AuthPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cccdDetection = inject(CccdDetectionService);

  readonly activeTab = signal<'login' | 'register' | 'forgot' | 'id-card'>('login');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly selectedFile = signal<File | null>(null);

  // CCCD Detection flow states
  readonly cccdStep = signal<'upload' | 'detect' | 'preview' | 'aligned'>('upload');
  readonly detectionResult = signal<CCCDDetectionResult | null>(null);
  readonly alignedImage = signal<string | null>(null);
  readonly alignedFile = signal<File | null>(null);

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
      this.error.set('Không thể kết nối với Google login');
    }
  }

  switchToIdCard(): void {
    this.activeTab.set('id-card');
    this.error.set('');
    this.success.set('');
  }

  switchToLogin(): void {
    this.activeTab.set('login');
    this.selectedFile.set(null);
    this.error.set('');
    this.success.set('');
  }

  // ========== CCCD Detect Flow Methods ==========

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  async onCccdFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile.set(file);
    this.error.set('');
    this.busy.set(true);

    try {
      // Step 1: Detect CCCD
      console.log('Detecting CCCD...');
      const detectResult = await this.cccdDetection.detectCCCD(file);
      console.log('Detect result:', detectResult);

      if (!detectResult.success || !detectResult.detection) {
        this.error.set('Không nhận diện được thẻ CCCD trong ảnh. Vui lòng thử ảnh khác.');
        this.busy.set(false);
        return;
      }

      this.detectionResult.set(detectResult);
      this.cccdStep.set('preview');
    } catch (error) {
      console.error('Detect error:', error);
      this.error.set('Lỗi khi nhận diện CCCD. Vui lòng thử lại.');
    } finally {
      this.busy.set(false);
    }
  }

  async alignCccdImage(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.busy.set(true);
    this.error.set('');

    try {
      // Step 2: Align CCCD
      console.log('Aligning CCCD...');
      const alignResult = await this.cccdDetection.alignCCCD(file);
      console.log('Align result:', alignResult);

      if (!alignResult.success || !alignResult.aligned_image) {
        this.error.set('Không thể căn chỉnh ảnh CCCD.');
        this.busy.set(false);
        return;
      }

      this.alignedImage.set(alignResult.aligned_image);

      // Convert base64 to File for upload
      const alignedFile = this.cccdDetection.base64ToFile(
        alignResult.aligned_image,
        'cccd_aligned.jpg'
      );
      this.alignedFile.set(alignedFile);

      this.cccdStep.set('aligned');
    } catch (error) {
      console.error('Align error:', error);
      this.error.set('Lỗi khi căn chỉnh ảnh. Vui lòng thử lại.');
    } finally {
      this.busy.set(false);
    }
  }

  async loginWithAlignedImage(): Promise<void> {
    const file = this.alignedFile();
    if (!file) {
      this.error.set('Không có ảnh để đăng nhập');
      return;
    }

    this.busy.set(true);
    this.error.set('');

    try {
      console.log('Logging in with aligned image...');

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('http://localhost:8080/api/auth/cccd/login', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Đăng nhập bằng CCCD thất bại');
      }

      const result = await response.json() as { success: boolean; token: string; message?: string };

      if (result.success && result.token) {
        this.auth.saveSessionFromTokenResponse(result.token);
        await this.router.navigate(['/portal/dashboard']);
      } else {
        throw new Error(result.message || 'Đăng nhập CCCD thất bại');
      }
    } catch (error) {
      console.error('CCCD Login error:', error);
      this.error.set(error instanceof Error ? error.message : 'Đăng nhập bằng CCCD thất bại.');
    } finally {
      this.busy.set(false);
    }
  }

  resetCccdFlow(): void {
    this.cccdStep.set('upload');
    this.selectedFile.set(null);
    this.detectionResult.set(null);
    this.alignedImage.set(null);
    this.alignedFile.set(null);
    this.error.set('');
  }
}