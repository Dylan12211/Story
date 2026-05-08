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
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss']})
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
