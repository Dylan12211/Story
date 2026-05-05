// google-callback.component.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  template: `<p>Đang đăng nhập Google...</p>`
})
export class GoogleCallbackComponent {

  private auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.handle();
  }

  async handle() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      await this.router.navigate(['/auth']);
      return;
    }

    if (!code) {
      console.error('No code received from Google');
      await this.router.navigate(['/auth']);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/auth/google/callback?code=${code}`);
      
      if (!res.ok) {
        console.error('Backend error:', res.status, await res.text());
        await this.router.navigate(['/auth']);
        return;
      }

      const data = await res.json();
      const accessToken = data.access_token;

      if (!accessToken) {
        console.error('No access_token in response');
        await this.router.navigate(['/auth']);
        return;
      }

      // 👇 lưu session
      this.auth.saveSessionFromToken(data);
      
      // Đợi signal cập nhật rồi mới navigate
      setTimeout(async () => {
        await this.router.navigate(['/portal/dashboard']);
      }, 100);
      
    } catch (err) {
      console.error('Login error:', err);
      await this.router.navigate(['/auth']);
    }
  }
}
