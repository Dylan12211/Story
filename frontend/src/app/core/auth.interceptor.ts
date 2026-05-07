import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Các endpoint không nên redirect khi nhận 401 (login endpoints)
const PUBLIC_ENDPOINTS = [
  '/api/login',
  '/api/auth/cccd/login',
  '/api/auth/id-card-login',
  '/api/auth/validate',
  '/api/forgot-password',
  '/api/register'
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Kiểm tra nếu là public endpoint thì không redirect
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint =>
    req.url.includes(endpoint)
  );

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicEndpoint) {
        console.error('401 Unauthorized, redirecting to login');
        auth.logout();
        return throwError(() => new Error('Unauthorized'));
      }
      // Trả về lỗi gốc cho public endpoints
      return throwError(() => error);
    })
  );
};
