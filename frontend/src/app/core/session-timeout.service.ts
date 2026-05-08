import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MatDialog } from '@angular/material/dialog';

// Thời gian idle trước khi warning (15 phút)
const IDLE_TIMEOUT = 15 * 60 * 1000;
// Thời gian chờ sau warning trước khi logout (2 phút)
const WARNING_TIMEOUT = 2 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly dialog = inject(MatDialog);

  private idleTimer: any = null;
  private warningTimer: any = null;
  private lastActivity: number = Date.now();
  private isWarningShown = false;

  startMonitoring(): void {
    // Chỉ monitor nếu đã đăng nhập
    if (!this.auth.isAuthenticated()) return;

    this.ngZone.runOutsideAngular(() => {
      // Theo dõi các hoạt động của user
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, () => this.resetTimer(), true);
      });
    });

    this.resetTimer();
  }

  private resetTimer(): void {
    this.lastActivity = Date.now();
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }

    // Ẩn warning nếu user hoạt động lại
    if (this.isWarningShown) {
      this.hideWarning();
    }

    // Set timer cho idle timeout
    this.idleTimer = setTimeout(() => {
      this.showWarning();
    }, IDLE_TIMEOUT);
  }

  private showWarning(): void {
    this.isWarningShown = true;
    
    // Tự động logout sau warning timeout
    this.warningTimer = setTimeout(() => {
      this.logout();
    }, WARNING_TIMEOUT);

    // Có thể hiển thị dialog warning ở đây
    console.warn('Session sắp hết hạn do không hoạt động. Click bất kỳ đây để tiếp tục.');
  }

  private hideWarning(): void {
    this.isWarningShown = false;
    // Đóng dialog nếu có
  }

  private logout(): void {
    this.stopMonitoring();
    this.auth.logout();
  }

  stopMonitoring(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  // Kiểm tra nếu đang trong giờ làm việc
  isWithinBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 1-5 = Monday-Friday
    
    // Chỉ cho phép 8h-18h, Thứ 2-Thứ 6
    return day >= 1 && day <= 5 && hour >= 8 && hour <= 18;
  }
}
