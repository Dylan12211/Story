import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SessionTimeoutService } from './session-timeout.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const sessionTimeout = inject(SessionTimeoutService);

  // 1. Kiểm tra đã đăng nhập
  if (!auth.isAuthenticated()) {
    console.warn('AuthGuard: User not authenticated, redirecting to login');
    return router.createUrlTree(['/auth'], { 
      queryParams: { returnUrl: state.url }
    });
  }

  // 2. Kiểm tra role nếu route có yêu cầu
  const requiredRoles = route.data?.['roles'] as string[] | undefined;
  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = auth.session()?.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      console.warn('AuthGuard: User lacks required role');
      return router.createUrlTree(['/portal/dashboard']);
    }
  }

  // 3. Bắt đầu idle monitoring khi vào protected route
  sessionTimeout.startMonitoring();

  return true;
};

/**
 * Guard cho admin-only routes
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth']);
  }

  if (!auth.isAdmin()) {
    console.warn('AdminGuard: User is not admin');
    return router.createUrlTree(['/portal/dashboard']);
  }

  return true;
};

/**
 * Guard cho public routes (không cho phép vào nếu đã login)
 */
export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    // Đã login thì redirect về dashboard
    return router.createUrlTree(['/portal/dashboard']);
  }

  return true;
};
