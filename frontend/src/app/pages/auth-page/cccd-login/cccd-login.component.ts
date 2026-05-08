import { Component, EventEmitter, Output, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-cccd-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  templateUrl: './cccd-login.component.html',
  styleUrls: ['./cccd-login.component.scss']
})
export class CccdLoginComponent {
  @ViewChild(ImageCropperComponent) imageCropper!: ImageCropperComponent;
  @Output() imageCropped = new EventEmitter<Blob | string>();
  @Output() loginSubmit = new EventEmitter<{ image: Blob | string; cccdNumber?: string }>();

  // Image states
  imageChangedEvent: Event | null = null;
  croppedImage: SafeUrl | null = null;
  originalImage: SafeUrl | null = null;
  isImageLoaded = false;
  showCropper = true;

  // Transform states for zoom and rotate
  transform: { scale?: number; rotate?: number; flipH?: boolean; flipV?: boolean } = {};
  scale = signal(1);
  rotation = signal(0);

  // Crop configuration for CCCD (1.6:1 ratio)
  aspectRatio = 1.585; // CCCD ratio: 85.6mm / 54mm ≈ 1.585
  cropperMinWidth = 200;
  cropperMinHeight = 126;

  // Canvas rotation
  canvasRotation = 0;

  // Loading states
  isProcessing = false;
  uploadProgress = 0;

  constructor(private sanitizer: DomSanitizer) {}

  // Handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.resetCropper();
      this.imageChangedEvent = event;
      this.isImageLoaded = true;

      // Store original image for preview
      const file = input.files[0];
      const objectUrl = URL.createObjectURL(file);
      this.originalImage = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
    }
  }

  // Handle image load event
  imageLoaded(image: LoadedImage): void {
    console.log('Image loaded:', image);
    this.showCropper = true;
  }

  // Handle cropper ready
  cropperReady(): void {
    console.log('Cropper ready');
  }

  // Handle image load failure
  loadImageFailed(): void {
    console.error('Failed to load image');
    alert('Không thể tải ảnh. Vui lòng thử lại với ảnh khác.');
  }

  // Handle crop event
  imageCroppedEvent(event: ImageCroppedEvent): void {
    if (event.blob) {
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(event.objectUrl!);
    } else if (event.base64) {
      this.croppedImage = this.sanitizer.bypassSecurityTrustUrl(event.base64);
    }
  }

  // Zoom in
  zoomIn(): void {
    this.scale.update(val => Math.min(val + 0.1, 3));
    this.updateTransform();
  }

  // Zoom out
  zoomOut(): void {
    this.scale.update(val => Math.max(val - 0.1, 0.5));
    this.updateTransform();
  }

  // Rotate left
  rotateLeft(): void {
    this.rotation.update(val => val - 90);
    this.canvasRotation = (this.canvasRotation - 90) % 360;
    this.flipAfterRotate();
  }

  // Rotate right
  rotateRight(): void {
    this.rotation.update(val => val + 90);
    this.canvasRotation = (this.canvasRotation + 90) % 360;
    this.flipAfterRotate();
  }

  // Flip image after rotation if needed
  private flipAfterRotate(): void {
    if (this.canvasRotation < 0) {
      this.canvasRotation += 360;
    }
    if (this.canvasRotation === 90 || this.canvasRotation === 270) {
      // Adjust for aspect ratio change when rotated
      this.updateTransform();
    }
  }

  // Update transform object
  private updateTransform(): void {
    this.transform = {
      scale: this.scale()
    };
  }

  // Reset cropper
  resetCropper(): void {
    this.imageChangedEvent = null;
    this.croppedImage = null;
    this.originalImage = null;
    this.isImageLoaded = false;
    this.showCropper = false;
    this.scale.set(1);
    this.rotation.set(0);
    this.canvasRotation = 0;
    this.transform = {};
  }

  // Confirm crop and get result
  async confirmCrop(event?: Event): Promise<void> {
    // Prevent any default form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.imageCropper) return;

    this.isProcessing = true;

    try {
      // Get cropped image as blob
      const result = await this.imageCropper.crop();

      if (!result) {
        throw new Error('Crop result is empty');
      }

      console.log('Crop result:', result);

      if (result.blob) {
        this.imageCropped.emit(result.blob);
        this.loginSubmit.emit({ image: result.blob });
      } else if (result.base64) {
        this.imageCropped.emit(result.base64);
        this.loginSubmit.emit({ image: result.base64 });
      }
    } catch (error) {
      console.error('Crop error:', error);
      alert('Có lỗi khi cắt ảnh. Vui lòng thử lại.');
    } finally {
      this.isProcessing = false;
    }
  }

  // Get cropped image as base64
  getCroppedImageAsBase64(): string | null {
    if (this.croppedImage) {
      const url = this.croppedImage.toString();
      if (url.startsWith('data:image')) {
        return url;
      }
    }
    return null;
  }

  // Trigger file input
  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Reset all
  onReset(): void {
    this.resetCropper();
  }
}
