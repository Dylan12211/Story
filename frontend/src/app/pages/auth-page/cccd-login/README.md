# CCCD Login Component

Component đăng nhập bằng CCCD với chức năng crop ảnh nâng cao.

## Tính năng

- ✅ Upload ảnh CCCD từ máy tính
- ✅ Crop ảnh với khung tỷ lệ CCCD (1.6:1)
- ✅ Zoom in/out
- ✅ Xoay ảnh trái/phải
- ✅ Preview ảnh sau khi crop
- ✅ Tích hợp API backend

## Cách sử dụng

### 1. Import Component

```typescript
import { CccdLoginComponent } from './cccd-login/cccd-login.component';

@Component({
  imports: [CccdLoginComponent]
})
```

### 2. Sử dụng trong Template

```html
<app-cccd-login
  (imageCropped)="onImageCropped($event)"
  (loginSubmit)="onLoginSubmit($event)">
</app-cccd-login>
```

### 3. Xử lý Events

```typescript
// Khi ảnh được crop
onImageCropped(imageData: Blob | string): void {
  console.log('Cropped image:', imageData);
}

// Khi người dùng xác nhận đăng nhập
async onLoginSubmit(event: { image: Blob | string; cccdNumber?: string }): Promise<void> {
  // Gọi API backend
  const response = await this.cccdService.loginWithCccd(event.image).toPromise();
}
```

## API Backend

Endpoint cần implement:

```
POST /api/auth/cccd/login
Content-Type: multipart/form-data

Parameters:
- image: File (Blob)
- cccdNumber: string (optional)

Response:
{
  "success": true,
  "token": "jwt-token",
  "user": { "id": "...", "name": "...", "cccdNumber": "..." },
  "ocrData": { ... }
}
```

## Cấu hình

Cập nhật `apiUrl` trong `cccd-login.service.ts`:

```typescript
private apiUrl = '/api/auth/cccd'; // Thay đổi theo backend của bạn
```

## Dependencies

- `ngx-image-cropper`: Thư viện crop ảnh
- `@angular/cdk`: CDK cho drag-drop
- `@angular/material`: UI components (optional)

## Cấu trúc Files

```
cccd-login/
├── cccd-login.component.ts      # Logic component
├── cccd-login.component.html    # Template
├── cccd-login.component.scss    # Styles
├── cccd-login.service.ts        # API service
└── README.md                    # Documentation
```
