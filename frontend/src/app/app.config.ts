import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, inject, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { TranslationService } from './core/i18n/translation.service';
import { TokenRefreshService } from './core/token-refresh.service';

export function initializeApp() {
  return () => {
    // Khởi tạo translation service
    const translationService = inject(TranslationService);
    
    // Khởi động token refresh monitoring nếu có session
    const tokenRefreshService = inject(TokenRefreshService);
    tokenRefreshService.startTokenRefreshMonitoring();
    
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
      deps: [TranslationService, TokenRefreshService]
    }
  ]
};
