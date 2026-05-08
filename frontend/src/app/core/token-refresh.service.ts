import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBase = environment.apiBaseUrl;
  
  private refreshTimer: any = null;
  private readonly REFRESH_BEFORE_EXPIRY = 60000; // Refresh 1 phút trước khi hết hạn

  startTokenRefreshMonitoring(): void {
    this.scheduleTokenRefresh();
    
    // Kiểm tra mỗi phút
    setInterval(() => {
      this.checkAndRefreshToken();
    }, 60000);
  }

  private scheduleTokenRefresh(): void {
    const session = this.auth.session();
    if (!session?.accessToken) return;

    const expiryTime = this.getTokenExpiryTime(session.accessToken);
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    // Nếu token sắp hết hạn, refresh ngay
    if (timeUntilExpiry < this.REFRESH_BEFORE_EXPIRY) {
      this.refreshToken();
    }
  }

  private checkAndRefreshToken(): void {
    const session = this.auth.session();
    if (!session?.accessToken || !session?.refreshToken) return;

    const expiryTime = this.getTokenExpiryTime(session.accessToken);
    const now = Date.now();
    
    if (expiryTime - now < this.REFRESH_BEFORE_EXPIRY) {
      this.refreshToken();
    }
  }

  private getTokenExpiryTime(token: string): number {
    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const claims = JSON.parse(decoded);
      return (claims.exp || 0) * 1000;
    } catch {
      return 0;
    }
  }

  private async refreshToken(): Promise<void> {
    const session = this.auth.session();
    if (!session?.refreshToken) return;

    try {
      const response = await firstValueFrom(
        this.http.post(`${this.apiBase}/api/refresh-token`, {
          refresh_token: session.refreshToken
        })
      ) as any;

      if (response.access_token) {
        this.auth.saveSessionFromToken(response);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Nếu refresh thất bại, logout user
      this.auth.logout();
    }
  }

  stopTokenRefreshMonitoring(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
