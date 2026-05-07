import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalApiService } from '../../core/portal-api.service';
import { CccdLoginComponent } from '../auth-page/cccd-login/cccd-login.component';
import { CccdDetectionService, CCCDAlignmentResult, CCCDFullProcessResult } from '../../core/cccd-detection.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CccdLoginComponent],
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

          <!-- CCCD Information -->
          <div *ngIf="currentProfile.idNumber"><dt>Số CCCD</dt><dd>{{ currentProfile.idNumber }}</dd></div>
          <div *ngIf="currentProfile.gender"><dt>Giới tính</dt><dd>{{ currentProfile.gender }}</dd></div>
          <div *ngIf="currentProfile.nationality"><dt>Quốc tịch</dt><dd>{{ currentProfile.nationality }}</dd></div>
          <div *ngIf="currentProfile.placeOfOrigin"><dt>Quê quán</dt><dd>{{ currentProfile.placeOfOrigin }}</dd></div>
          <div *ngIf="currentProfile.placeOfResidence"><dt>Nơi cư trú</dt><dd>{{ currentProfile.placeOfResidence }}</dd></div>
          <div *ngIf="currentProfile.dateOfExpiry"><dt>Ngày hết hạn</dt><dd>{{ currentProfile.dateOfExpiry | date:'dd/MM/yyyy' }}</dd></div>
        </dl>

        <button (click)="startEdit()" class="btn">Edit Profile</button>
      </section>

      <!-- FORM EDIT -->
      <section class="card edit-card" *ngIf="isEditing()">
        <p class="eyebrow">Edit profile</p>
        <h3>Chỉnh sửa thông tin</h3>

        <!-- CCCD Processing Options -->
        <div class="cccd-options" *ngIf="!showCropper() && !showAlignedPreview()">
          <p class="option-title">Chọn phương thức quét CCCD:</p>

          <!-- Option 1: Python YOLO Detection (Auto Align) -->
          <div class="option-card" (click)="triggerPythonFileInput()">
            <div class="option-content">
              <strong>Nhập CCCD</strong>
              <span>Phát hiện tự động, xoay và căn chỉnh CCCD</span>
            </div>
            <input
              #pythonFileInput
              type="file"
              accept="image/*"
              style="display: none"
              (change)="onPythonFileSelected($event)"
            />
          </div>


        </div>

        <!-- Aligned Image Preview (from Python backend) -->
        <div class="aligned-preview-container" *ngIf="showAlignedPreview()">
          <h4>Ảnh CCCD đã căn thẳng:</h4>
          <div class="aligned-image-wrapper">
            <img
              [src]="detectionService.createImageUrl(alignedImageBase64!)"
              alt="CCCD đã căn thẳng"
              class="aligned-image"
            />
          </div>
          <div class="aligned-actions">
            <button class="btn primary" (click)="confirmAlignedImage()">
              ✓ Xác nhận & OCR
            </button>
            <button class="btn ghost" (click)="cancelAlignedPreview()">
              ✕ Hủy
            </button>
          </div>
        </div>

        <!-- Manual Cropper -->
        <div class="cropper-container" *ngIf="showCropper()">
          <app-cccd-login
            (imageCropped)="onCccdCropped($event)"
            (loginSubmit)="onCccdConfirm($event)">
          </app-cccd-login>
          <button class="btn ghost" (click)="cancelCrop()" style="margin-top: 1rem;">Hủy</button>
        </div>

        <div class="form-section" *ngIf="!showCropper() && !showAlignedPreview()">
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

          <!-- CCCD Edit Fields -->
          <div class="field full">
            <label>Số CCCD</label>
            <input [(ngModel)]="form.idNumber" />
          </div>

          <div class="field">
            <label>Giới tính</label>
            <input [(ngModel)]="form.gender" />
          </div>

          <div class="field">
            <label>Quốc tịch</label>
            <input [(ngModel)]="form.nationality" />
          </div>

          <div class="field full">
            <label>Quê quán</label>
            <input [(ngModel)]="form.placeOfOrigin" />
          </div>

          <div class="field full">
            <label>Nơi cư trú</label>
            <input [(ngModel)]="form.placeOfResidence" />
          </div>

          <div class="field">
            <label>Ngày hết hạn CCCD</label>
            <input type="date" [(ngModel)]="form.dateOfExpiry" />
          </div>
        </div>

        <div class="actions">
          <button class="btn primary" (click)="save()">Save changes</button>
          <button class="btn ghost" (click)="cancel()">Cancel</button>
        </div>
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

    .scan-card {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 4rem;
      margin: 1rem 0;
      border: 1px dashed rgba(140, 121, 104, 0.35);
      border-radius: 14px;
      background: rgba(255, 253, 249, 0.72);
      cursor: pointer;
      color: #6f625a;
      font-weight: 700;
      text-transform: none;
      letter-spacing: 0;
      transition: all 0.2s ease;
    }

    .scan-card:hover {
      background: rgba(255, 253, 249, 0.9);
      border-color: rgba(140, 121, 104, 0.5);
    }

    .scan-card input {
      display: none;
    }

    .cccd-section {
      margin-bottom: 1rem;
    }

    .cropper-container {
      background: white;
      border-radius: 16px;
      padding: 1rem;
      margin: 1rem 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .cropper-container ::ng-deep .cccd-login-container {
      min-height: auto;
      background: transparent;
      padding: 0;
    }

    .cropper-container ::ng-deep .cccd-login-card {
      box-shadow: none;
      padding: 0;
    }

    .form-section {
      animation: fadeIn 0.3s ease-in-out;
    }

    // CCCD Options Styles
    .cccd-options {
      margin: 1rem 0;
    }

    .option-title {
      font-size: 0.85rem;
      color: #8b6f5a;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    .option-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      margin-bottom: 0.75rem;
      background: rgba(255, 253, 249, 0.9);
      border: 2px solid rgba(140, 121, 104, 0.15);
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .option-card:hover {
      border-color: #8b6f5a;
      background: white;
      box-shadow: 0 4px 12px rgba(139, 111, 90, 0.1);
      transform: translateY(-1px);
    }

    .option-icon {
      font-size: 1.75rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(139, 111, 90, 0.1);
      border-radius: 12px;
    }

    .option-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .option-content strong {
      color: #3d3128;
      font-size: 0.95rem;
    }

    .option-content span {
      color: #8b6f5a;
      font-size: 0.8rem;
    }

    // Aligned Preview Styles
    .aligned-preview-container {
      background: white;
      border-radius: 16px;
      padding: 1.25rem;
      margin: 1rem 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      animation: fadeIn 0.3s ease-in-out;
    }

    .aligned-preview-container h4 {
      margin: 0 0 1rem;
      color: #3d3128;
      font-size: 1rem;
    }

    .aligned-image-wrapper {
      display: flex;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .aligned-image {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .aligned-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
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
  readonly scanningIdCard = signal(false);
  readonly showCropper = signal(false);
  readonly showAlignedPreview = signal(false);
  readonly pythonBackendAvailable = signal(false);
  selectedFile: File | null = null;
  alignedImageBase64: string | null = null;
  readonly detectionService = inject(CccdDetectionService);
  form = {
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    idNumber: '',
    gender: '',
    nationality: '',
    placeOfOrigin: '',
    placeOfResidence: '',
    dateOfExpiry: ''
  };

  startEdit() {
    const p = this.profile();
    if (!p) return;

    this.form = {
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: p.email || '',
      dob: p.dob ? p.dob.substring(0, 10) : '',
      idNumber: p.idNumber || '',
      gender: p.gender || '',
      nationality: p.nationality || '',
      placeOfOrigin: p.placeOfOrigin || '',
      placeOfResidence: p.placeOfResidence || '',
      dateOfExpiry: p.dateOfExpiry ? p.dateOfExpiry.substring(0, 10) : ''
    };

    this.isEditing.set(true);
  }
  cancel() {
    this.isEditing.set(false);
    this.showCropper.set(false);
    this.showAlignedPreview.set(false);
    this.alignedImageBase64 = null;
    this.selectedFile = null;
  }

  // ViewChild references for file inputs
  @ViewChild('pythonFileInput') pythonFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('manualFileInput') manualFileInput!: ElementRef<HTMLInputElement>;

  // Trigger file inputs
  triggerPythonFileInput(): void {
    this.pythonFileInput?.nativeElement.click();
  }

  triggerManualFileInput(): void {
    this.manualFileInput?.nativeElement.click();
  }

  // Python YOLO Detection methods
  async onPythonFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.error.set('');
    this.scanningIdCard.set(true);

    try {
      // Call Python backend for detection + alignment
      const result = await this.detectionService.alignCCCD(file, 0.5);

      if (!result.success) {
        this.error.set(result.message || 'Không phát hiện được CCCD trong ảnh');
        return;
      }

      // Store the aligned image
      this.alignedImageBase64 = result.aligned_image;
      this.showAlignedPreview.set(true);
      this.selectedFile = this.detectionService.base64ToFile(result.aligned_image, 'cccd_aligned.jpg');

    } catch (err) {
      this.error.set('Lỗi khi xử lý ảnh. Vui lòng đảm bảo Python backend đang chạy tại port 8000.');
      console.error('Python detection error:', err);
    } finally {
      this.scanningIdCard.set(false);
      input.value = '';
    }
  }

  // Confirm aligned image and run OCR
  async confirmAlignedImage(): Promise<void> {
    if (!this.alignedImageBase64) return;

    this.error.set('');
    this.scanningIdCard.set(true);

    try {
      // Convert base64 to file and send to Java backend for OCR
      const file = this.detectionService.base64ToFile(this.alignedImageBase64, 'cccd_aligned.jpg');
      const data = await this.api.scanIdCardProfile(file);

      // Update form with OCR data
      this.form = {
        ...this.form,
        firstName: data.firstName ?? this.form.firstName,
        lastName: data.lastName ?? this.form.lastName,
        dob: data.dob ?? this.form.dob,
        idNumber: data.idNumber ?? this.form.idNumber,
        gender: data.gender ?? this.form.gender,
        nationality: data.nationality ?? this.form.nationality,
        placeOfOrigin: data.placeOfOrigin ?? this.form.placeOfOrigin,
        placeOfResidence: data.placeOfResidence ?? this.form.placeOfResidence,
        dateOfExpiry: data.dateOfExpiry ?? this.form.dateOfExpiry
      };

      // Hide preview and show form
      this.showAlignedPreview.set(false);
      this.alignedImageBase64 = null;

    } catch (err) {
      this.error.set(this.api.formatError(err, 'Không quét được thông tin CCCD từ ảnh đã căn chỉnh.'));
    } finally {
      this.scanningIdCard.set(false);
    }
  }

  cancelAlignedPreview(): void {
    this.showAlignedPreview.set(false);
    this.alignedImageBase64 = null;
    this.selectedFile = null;
  }

  // CCCD Cropper methods (Manual)
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.showCropper.set(true);
  }

  onCccdCropped(imageData: Blob | string): void {
    console.log('CCCD cropped for profile:', imageData);
  }

  async onCccdConfirm(event: { image: Blob | string; cccdNumber?: string }): Promise<void> {
    this.error.set('');
    this.scanningIdCard.set(true);

    try {
      // Convert blob to file for API
      let file: File;
      if (event.image instanceof Blob) {
        file = new File([event.image], 'cccd.jpg', { type: 'image/jpeg' });
      } else {
        // Base64 case - convert to blob first
        const base64Data = event.image.includes(',') ? event.image.split(',')[1] : event.image;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        file = new File([blob], 'cccd.jpg', { type: 'image/jpeg' });
      }

      const data = await this.api.scanIdCardProfile(file);
      this.form = {
        ...this.form,
        firstName: data.firstName ?? this.form.firstName,
        lastName: data.lastName ?? this.form.lastName,
        dob: data.dob ?? this.form.dob,
        idNumber: data.idNumber ?? this.form.idNumber,
        gender: data.gender ?? this.form.gender,
        nationality: data.nationality ?? this.form.nationality,
        placeOfOrigin: data.placeOfOrigin ?? this.form.placeOfOrigin,
        placeOfResidence: data.placeOfResidence ?? this.form.placeOfResidence,
        dateOfExpiry: data.dateOfExpiry ?? this.form.dateOfExpiry
      };

      // Hide cropper after successful scan
      this.showCropper.set(false);
      this.selectedFile = null;
    } catch (err) {
      this.error.set(this.api.formatError(err, 'Không quét được thông tin CCCD.'));
    } finally {
      this.scanningIdCard.set(false);
    }
  }

  cancelCrop(): void {
    this.showCropper.set(false);
    this.selectedFile = null;
  }

  constructor() {
    void this.load();
  }

  // Legacy method - kept for compatibility if needed
  async scanIdCard(event: Event): Promise<void> {
    // Redirect to new flow
    this.onFileSelected(event);
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
