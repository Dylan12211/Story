# Hướng dẫn sử dụng i18n (Đa ngôn ngữ)

## Tổng quan

Hệ thống i18n đã được tích hợp vào frontend Angular với 2 ngôn ngữ:
- **Tiếng Việt (vi)** - mặc định
- **Tiếng Anh (en)**

## Cấu trúc

```
public/i18n/
├── vi.json    # Vietnamese translations
└── en.json    # English translations

src/app/core/i18n/
├── translation.service.ts      # Service quản lý ngôn ngữ
├── translate.pipe.ts           # Pipe dịch trong template
├── language-switcher.component.ts  # Component chuyển đổi ngôn ngữ
└── index.ts                    # Export các module
```

## Cách sử dụng

### 1. Trong Template (HTML)

Sử dụng pipe `translate`:

```html
<!-- Dịch text đơn giản -->
<h1>{{ 'nav.dashboard' | translate }}</h1>

<!-- Dịch với tham số -->
<p>{{ 'error.min_length' | translate:{min: 5} }}</p>

<!-- Sử dụng trong attribute -->
<input [placeholder]="'common.name' | translate">
```

### 2. Trong Component (TypeScript)

```typescript
import { TranslationService } from './core/i18n';

export class MyComponent {
  private translationService = inject(TranslationService);

  getTranslatedText() {
    const text = this.translationService.translate('common.save');
    // hoặc với tham số
    const errorMsg = this.translationService.translate('error.min_length', {min: 5});
  }

  changeLanguage() {
    this.translationService.setLanguage('en'); // hoặc 'vi'
  }
}
```

### 3. Component chuyển đổi ngôn ngữ

```html
<!-- Thêm vào bất kỳ đâu trong template -->
<app-language-switcher />
```

## Thêm ngôn ngữ mới

1. Tạo file JSON trong `public/i18n/` (ví dụ: `ja.json` cho tiếng Nhật)
2. Cập nhật `TranslationService`:
   ```typescript
   export type Language = 'vi' | 'en' | 'ja';
   ```
3. Cập nhật `LanguageSwitcherComponent` để thêm button mới

## Thêm key translation mới

1. Thêm vào `public/i18n/vi.json`:
   ```json
   "my.new.key": "Nội dung tiếng Việt"
   ```

2. Thêm vào `public/i18n/en.json`:
   ```json
   "my.new.key": "English content"
   ```

3. Sử dụng trong template:
   ```html
   <p>{{ 'my.new.key' | translate }}</p>
   ```

## Quy ước đặt tên key

- `app.*` - Text ứng dụng chung
- `nav.*` - Navigation menu
- `common.*` - Button và thao tác chung
- `auth.*` - Authentication
- `error.*` - Thông báo lỗi
- `notification.*` - Thông báo
- `metrics.*` - Thống kê

## Lưu ý

- Ngôn ngữ được lưu trong `localStorage` và tự động khôi phục khi reload
- Nếu key không tìm thấy, hệ thống trả về chính key đó
- Các file JSON trong `public/i18n/` được load động qua HTTP
