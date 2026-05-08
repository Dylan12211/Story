import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap, of } from 'rxjs';
import { AuthService } from './auth.service';

// Các endpoint không cần token
const PUBLIC_ENDPOINTS = [
  '/api/login',
  '/api/auth/cccd/login',
  '/api/auth/id-card-login',
  '/api/auth/validate',
  '/api/forgot-password',
  '/api/register',
  '/api/refresh-token',
  '/i18n/' // Không cần auth cho file i18n
];

// Các endpoint cần CSRF protection
const MUTATION_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Tạo CSRF token ngẫu nhiên
 */
function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Lấy CSRF token từ cookie hoặc tạo mới
 */
function getCsrfToken(): string {
  // Thử lấy từ cookie
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  
  // Hoặc tạo mới
  const token = generateCsrfToken();
  // Set cookie với SameSite
  document.cookie = `XSRF-TOKEN=${token}; SameSite=Strict; Path=/`;
  return token;
}

/**
 * Kiểm tra nếu request là public endpoint
 */
function isPublicEndpoint(req: HttpRequest<unknown>): boolean {
  return PUBLIC_ENDPOINTS.some(endpoint => req.url.includes(endpoint));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isPublic = isPublicEndpoint(req);

  // 1. Clone request với các security headers
  let modifiedReq = req.clone({
    setHeaders: {
      // Chỉ thêm X-Requested-With cho non-public endpoints
      ...(isPublic ? {} : { 'X-Requested-With': 'XMLHttpRequest' }),
      // Thêm CSRF token cho mutation methods
      ...(MUTATION_METHODS.includes(req.method) ? { 'X-XSRF-TOKEN': getCsrfToken() } : {}),
      // Ngăn chặn MIME sniffing
      'X-Content-Type-Options': 'nosniff',
      // XSS protection
      'X-XSS-Protection': '1; mode=block',
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });

  // 2. Thêm Authorization header nếu có token và không phải public endpoint
  if (!isPublic) {
    const token = auth.session()?.accessToken;
    if (token) {
      // Kiểm tra token chưa hết hạn trước khi gửi
      try {
        const payload = token.split('.')[1];
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(normalized);
        const claims = JSON.parse(decoded);
        const exp = claims.exp * 1000;
        
        if (Date.now() >= exp) {
          // Token đã hết hạn, logout
          console.error('Token expired during request');
          auth.logout();
          return throwError(() => new Error('Token expired'));
        }
        
        modifiedReq = modifiedReq.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch {
        // Token invalid
        auth.logout();
        return throwError(() => new Error('Invalid token'));
      }
    }
  }

  // 3. Xử lý response errors
  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          if (!isPublic) {
            console.error('401 Unauthorized - Session invalid or expired');
            // Clear storage và logout
            auth.logout();
          }
          return throwError(() => new Error('Unauthorized'));

        case 403:
          console.error('403 Forbidden - Insufficient permissions');
          return throwError(() => new Error('Access forbidden'));

        case 419: // CSRF token mismatch
          console.error('419 CSRF Token Mismatch');
          // Regenerate CSRF token
          document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Path=/;';
          return throwError(() => new Error('Security token expired. Please retry.'));

        case 0:
          // Network error hoặc CORS
          console.error('Network/CORS error');
          return throwError(() => new Error('Network error or CORS issue'));

        default:
          return throwError(() => error);
      }
    })
  );
};
