# Hướng dẫn Bảo mật Auth trong Angular

## Các tính năng bảo mật đã thêm

### 1. SecureStorageService (`src/app/core/secure-storage.service.ts`)
**Thay thế localStorage bằng memory store + sessionStorage mã hóa**

```typescript
// Lưu trong memory + sessionStorage mã hóa
this.secureStorage.setSession(JSON.stringify(session));

// Lấy từ memory (nhanh) hoặc sessionStorage (sau reload)
const session = this.secureStorage.getSession();
```

**Lợi ích:**
- Token không lưu plain text trong localStorage
- Chống XSS đọc token trực tiếp
- Memory store tự động xóa khi đóng tab

### 2. TokenRefreshService (`src/app/core/token-refresh.service.ts`)
**Tự động refresh token trước khi hết hạn**

```typescript
// Tự động refresh 1 phút trước khi token hết hạn
private readonly REFRESH_BEFORE_EXPIRY = 60000;

// Kiểm tra mỗi phút
setInterval(() => this.checkAndRefreshToken(), 60000);
```

### 3. SessionTimeoutService (`src/app/core/session-timeout.service.ts`)
**Tự động logout khi user không hoạt động**

- **Idle timeout:** 15 phút không hoạt động → Hiển thị cảnh báo
- **Warning timeout:** 2 phút sau cảnh báo → Auto logout
- Theo dõi: `mousedown`, `keydown`, `scroll`, `touchstart`

### 4. Enhanced Auth Interceptor
**Bảo vệ CSRF + Security Headers**

```typescript
// CSRF token cho POST/PUT/DELETE/PATCH
'X-XSRF-TOKEN': getCsrfToken()

// Security headers
'X-Content-Type-Options': 'nosniff'
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'

// Validate token trước khi gửi request
if (this.isTokenExpired(token)) {
  auth.logout();
}
```

### 5. Enhanced Auth Guards (`src/app/core/auth.guard.ts`)

```typescript
// authGuard: Kiểm tra login + role + idle monitoring
export const authGuard: CanActivateFn = (route, state) => {
  // 1. Kiểm tra authenticated
  // 2. Kiểm tra requiredRoles
  // 3. Bật session timeout monitoring
}

// adminGuard: Chỉ cho admin
export const adminGuard: CanActivateFn = () => {...}

// publicGuard: Không cho vào nếu đã login
export const publicGuard: CanActivateFn = () => {...}
```

### 6. Enhanced AuthService
**Kiểm tra token expiration trong real-time**

```typescript
readonly isAuthenticated = computed(() => {
  const sess = this.session();
  if (!sess) return false;
  return !this.isTokenExpired(sess.accessToken); // Real-time check
});
```

## Cách sử dụng

### Trong Routes:
```typescript
{
  path: 'admin',
  component: AdminPageComponent,
  canActivate: [adminGuard] // Chỉ admin
},
{
  path: 'dashboard',
  component: DashboardPageComponent,
  canActivate: [authGuard],
  data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] } // Kiểm tra role
}
```

### Trong Component:
```typescript
export class MyComponent {
  private sessionTimeout = inject(SessionTimeoutService);
  
  ngOnInit() {
    // Bắt đầu monitor idle time
    this.sessionTimeout.startMonitoring();
  }
}
```

## Security Best Practices đã áp dụng

| Vấn đề | Giải pháp |
|--------|-----------|
| Token XSS | SecureStorage (memory store) |
| Token expiration | Real-time check + auto refresh |
| Session hijacking | Session timeout sau idle |
| CSRF attack | CSRF token + SameSite cookies |
| Clickjacking | X-Frame-Options (cần backend) |
| MIME sniffing | X-Content-Type-Options: nosniff |
| Role escalation | Guard kiểm tra role chặt chẽ |

## Backend cần hỗ trợ

1. **Token Refresh Endpoint:**
   ```
   POST /api/refresh-token
   Body: { refresh_token: string }
   Response: { access_token, refresh_token }
   ```

2. **CSRF Validation:**
   - Đọc header `X-XSRF-TOKEN`
   - Validate với cookie `XSRF-TOKEN`

3. **Security Headers:**
   ```
   X-Frame-Options: DENY
   Strict-Transport-Security: max-age=31536000
   ```

## Cấu hình thêm (nếu cần)

### Nginx/Apache (Security Headers):
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Content Security Policy (CSP):
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline'; 
           style-src 'self' 'unsafe-inline';
           img-src 'self' data: https:;">
```
