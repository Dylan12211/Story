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

    if (!code) {
      return;
    }

    const res = await fetch(`http://localhost:8080/api/auth/google/callback?code=${code}`);

    const data = await res.json();

    const accessToken = data.access_token;

    // 👇 lưu session
    this.auth.saveSessionFromToken(data);

    await this.router.navigate(['/portal/dashboard']);
  }
}
