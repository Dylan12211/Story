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
            <button type="button" [class.active]="activeTab() === 'login' || activeTab() === 'id-card'" (click)="switchToLogin()">
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

          <!-- NORMAL LOGIN FORM -->
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

            <!-- <button type="button" class="google-btn" (click)="loginWithGoogle()">
              Đăng nhập với Google
            </button> -->

            <button type="button" class="id-card-btn" (click)="switchToIdCard()">
              📷 Đăng nhập bằng CCCD
            </button>
          </form>

          <!-- ID CARD LOGIN với Detect Khung -->
          <div class="cccd-login-wrapper" *ngIf="activeTab() === 'id-card'">
            <button type="button" class="back-btn" (click)="switchToLogin()">
              ← Quay lại đăng nhập
            </button>

            <!-- Step 1: Upload ảnh -->
            <div *ngIf="cccdStep() === 'upload'" class="upload-step">
              <div class="upload-area" (click)="triggerFileInput()">
                <input
                  type="file"
                  #fileInput
                  accept="image/*"
                  (change)="onCccdFileSelected($event)"
                  hidden
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>Click để chọn ảnh CCCD</p>
                <small>Hỗ trợ: JPG, PNG (tối đa 10MB)</small>
              </div>
            </div>

            <!-- Step 2: Detect và Preview -->
            <div *ngIf="cccdStep() === 'detect' || cccdStep() === 'preview'" class="detect-step">
              <h4>Kết quả nhận diện:</h4>
              <div class="preview-container">
                <img *ngIf="detectionResult()?.preview_image"
                     [src]="detectionResult()?.preview_image"
                     alt="CCCD Detected"
                     class="detected-image" />
              </div>
              <p *ngIf="detectionResult()?.detection" class="detect-info">
                Độ tin cậy: {{ (detectionResult()?.detection?.confidence || 0) * 100 | number:'1.0-0' }}%
              </p>
              <div class="action-buttons">
                <button type="button" class="btn btn-secondary" (click)="resetCccdFlow()">
                  Chọn ảnh khác
                </button>
                <button type="button" class="btn btn-primary" (click)="alignCccdImage()" [disabled]="busy()">
                  {{ busy() ? 'Đang xử lý...' : 'Tiếp tục' }}
                </button>
              </div>
            </div>

            <!-- Step 3: Aligned Image & Login -->
            <div *ngIf="cccdStep() === 'aligned'" class="aligned-step">
              <h4>Ảnh đã căn chỉnh:</h4>
              <div class="preview-container">
                <img *ngIf="alignedImage()"
                     [src]="alignedImage()"
                     alt="CCCD Aligned"
                     class="aligned-image" />
              </div>
              <div class="action-buttons">
                <button type="button" class="btn btn-secondary" (click)="resetCccdFlow()">
                  Làm lại
                </button>
                <button type="button" class="btn btn-success" (click)="loginWithAlignedImage()" [disabled]="busy()">
                  {{ busy() ? 'Đang đăng nhập...' : 'Đăng nhập' }}
                </button>
              </div>
            </div>
          </div>

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

    /* CCCD Login Wrapper - same as auth-form but not a form */
    .cccd-login-wrapper {
      display: grid;
      gap: 1rem;
    }

    .upload-step .upload-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      border: 2px dashed rgba(140, 121, 104, 0.3);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255, 253, 249, 0.6);
    }

    .upload-step .upload-area:hover {
      border-color: rgba(208, 113, 67, 0.5);
      background: rgba(255, 253, 249, 0.9);
    }

    .upload-step svg {
      color: #8b6f5a;
      margin-bottom: 1rem;
    }

    .upload-step p {
      color: #6f625a;
      font-weight: 500;
      margin: 0;
    }

    .upload-step small {
      color: #a09080;
      margin-top: 0.5rem;
    }

    .detect-step, .aligned-step {
      display: grid;
      gap: 1rem;
    }

    .detect-step h4, .aligned-step h4 {
      margin: 0;
      color: #4a4035;
    }

    .preview-container {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(140, 121, 104, 0.2);
      background: #f5efe7;
    }

    .detected-image, .aligned-image {
      width: 100%;
      height: auto;
      display: block;
    }

    .detect-info {
      color: #2f6b54;
      font-weight: 500;
      margin: 0;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .action-buttons button {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f2;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(208, 113, 67, 0.3);
    }

    .btn-secondary {
      background: rgba(140, 121, 104, 0.15);
      color: #6f625a;
    }

    .btn-secondary:hover {
      background: rgba(140, 121, 104, 0.25);
    }

    .btn-success {
      background: linear-gradient(135deg, #2f6b54, #3f8766);
      color: #fff8f2;
    }

    .btn-success:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(47, 107, 84, 0.3);
    }

    .btn-primary:disabled,
    .btn-success:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    /* ID Card Button */
    .id-card-btn {
      background: linear-gradient(135deg, #2f6b54, #3f8766) !important;
      color: #fff8f2;
    }

    .id-card-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(47, 107, 84, 0.3);
    }

    /* Back Button */
    .back-btn {
      background: transparent !important;
      border: 1px solid rgba(140, 121, 104, 0.4) !important;
      color: #6f625a !important;
      padding: 0.6rem 1rem !important;
      font-size: 0.9rem;
    }

    .back-btn:hover {
      background: rgba(140, 121, 104, 0.1) !important;
    }

    /* ID Card Upload Styles */
    .id-card-upload {
      margin: 0.5rem 0;
    }

    .upload-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      border: 2px dashed rgba(140, 121, 104, 0.3);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255, 253, 249, 0.6);
      min-height: 180px;
    }

    .upload-area:hover {
      border-color: rgba(208, 113, 67, 0.5);
      background: rgba(255, 253, 249, 0.9);
    }

    .upload-area.has-file {
      border-color: rgba(63, 135, 102, 0.5);
      background: rgba(63, 135, 102, 0.08);
    }

    .upload-placeholder {
      text-align: center;
      color: #8b6f5a;
    }

    .upload-placeholder svg {
      margin-bottom: 1rem;
      opacity: 0.6;
    }

    .upload-placeholder p {
      margin: 0.5rem 0;
      font-weight: 500;
    }

    .upload-placeholder small {
      color: #a09080;
    }

    .file-preview {
      text-align: center;
    }

    .file-preview p {
      margin: 0.5rem 0;
      font-weight: 500;
      color: #2f6b54;
    }

    .file-preview small {
      color: #6f625a;
    }

    .hint {
      text-align: center;
      font-size: 0.85rem;
      color: #8b6f5a;
      margin: 0.5rem 0 0;
    }
  `]
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
      this.error.set('Không thể kết nối Google login');
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
