
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Injectable, computed, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { SecureStorageService } from './secure-storage.service';



import { ApiEnvelope, ProfileResponse, RegisterPayload, SessionState } from './models';



@Injectable({ providedIn: 'root' })

export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly secureStorage = inject(SecureStorageService);

  private readonly apiBase = environment.apiBaseUrl;

  // Không dùng localStorage key nữa - đã chuyển sang SecureStorage



  readonly session = signal<SessionState | null>(this.loadSession());

  readonly isAuthenticated = computed(() => {
    const sess = this.session();
    if (!sess) return false;
    // Kiểm tra token chưa hết hạn
    return !this.isTokenExpired(sess.accessToken);
  });

  readonly isAdmin = computed(() => this.session()?.roles.includes('ROLE_ADMIN') ?? false);

  /**
   * Kiểm tra token đã hết hạn chưa
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const claims = JSON.parse(decoded);
      const exp = claims.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true; // Nếu lỗi decode, coi như expired
    }
  }



  async login(username: string, password: string): Promise<SessionState> {

    try {

      const response = await firstValueFrom(

        this.http.post(`${this.apiBase}/api/login`, { username, password }, { responseType: 'text' })

      );



      console.log('Login response:', response);



      const payload = JSON.parse(response) as Record<string, string>;

      const accessToken = payload['access_token'];



      if (!accessToken) {

        console.error('No access token in response:', payload);

        throw new Error('Backend không trả về access token từ Keycloak.');

      }



      const claims = this.decodeJwt(accessToken);

      const realmAccess = claims['realm_access'] as { roles?: string[] } | undefined;

      const roles = (realmAccess?.roles ?? []).map(

        (role) => `ROLE_${role.toUpperCase()}`

      );



      const session: SessionState = {

        accessToken,

        refreshToken: payload['refresh_token'],

        idToken: payload['id_token'],

        username: String(claims['preferred_username'] ?? username),

        email: claims['email'] ? String(claims['email']) : undefined,

        roles,

        provider: payload['id_token'] ? 'GOOGLE' : 'LOCAL'

      };



      this.secureStorage.setSession(JSON.stringify(session));

      this.session.set(session);

      return session;

    } catch (error) {

      console.error('Login error:', error);

      if (error instanceof Error) {

        throw error;

      }

      throw new Error('Đăng nhập thất bại. Vui lòng thử lại.');

    }

  }



  async register(payload: RegisterPayload): Promise<ProfileResponse> {

    const response = await firstValueFrom(

      this.http.post<ApiEnvelope<ProfileResponse>>(`${this.apiBase}/register`, payload)

    );

    return response.result;

  }



  async forgotPassword(email: string): Promise<string> {

    return firstValueFrom(

      this.http.post(`${this.apiBase}/api/forgot-password`, { email }, { responseType: 'text' })

    );

  }



  logout(): void {

    const session = this.session();



    const baseUrl =

      'http://localhost:8090/realms/story-app/protocol/openid-connect/logout';



    let url =

      baseUrl +

      `?post_logout_redirect_uri=http://localhost:4200` +

      `&client_id=story-app`;



    if (session?.provider === 'GOOGLE' && session.idToken) {

      url += `&id_token_hint=${session.idToken}`;

    }



    if (session?.refreshToken) {

      url += `&refresh_token=${session.refreshToken}`;

    }



    this.secureStorage.clearSession();

    this.session.set(null);



    window.location.href = url;

  }



  authHeaders(): HttpHeaders {

    const token = this.session()?.accessToken;

    if (!token) {

      throw new Error('No active session. Please login again.');

    }

    return new HttpHeaders({

      Authorization: `Bearer ${token}`

    });

  }



  private loadSession(): SessionState | null {
    const raw = this.secureStorage.getSession();

    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as SessionState;
      // Kiểm tra token còn hiệu lực không
      if (this.isTokenExpired(session.accessToken)) {
        this.secureStorage.clearSession();
        return null;
      }
      return session;
    } catch {
      this.secureStorage.clearSession();
      return null;
    }
  }



  private decodeJwt(token: string): Record<string, unknown> {

    const payload = token.split('.')[1] ?? '';

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');

    const decoded = atob(normalized);

    return JSON.parse(decoded) as Record<string, unknown>;

  }

  saveSessionFromToken(tokenResponse: any) {

    const accessToken = tokenResponse.access_token;

    const refreshToken = tokenResponse.refresh_token;

    const idToken = tokenResponse.id_token;



    const claims = this.decodeJwt(accessToken);



    const realmAccess = claims['realm_access'] as { roles?: string[] } | undefined;



    const roles = (realmAccess?.roles ?? []).map(

      (role) => `ROLE_${role.toUpperCase()}`

    );



    const session: SessionState = {

      accessToken,

      refreshToken,

      idToken,

      username: String(claims['preferred_username'] ?? ''),

      email: claims['email'] ? String(claims['email']) : undefined,

      roles,

      provider: idToken ? 'GOOGLE' : 'LOCAL'

    };



    this.secureStorage.setSession(JSON.stringify(session));

    this.session.set(session);

  }



  saveSessionFromTokenResponse(tokenResponse: string | Record<string, string>): SessionState {
    const payload = typeof tokenResponse === 'string'
      ? JSON.parse(tokenResponse) as Record<string, string>
      : tokenResponse;
    const accessToken = payload['access_token'];

    if (!accessToken) {
      throw new Error('Backend không trả về access token từ Keycloak.');
    }

    const claims = this.decodeJwt(accessToken);
    const realmAccess = claims['realm_access'] as { roles?: string[] } | undefined;
    const roles = (realmAccess?.roles ?? []).map(
      (role) => `ROLE_${role.toUpperCase()}`
    );

    const session: SessionState = {
      accessToken,
      refreshToken: payload['refresh_token'],
      idToken: payload['id_token'],
      username: String(claims['preferred_username'] ?? ''),
      email: claims['email'] ? String(claims['email']) : undefined,
      roles,
      provider: payload['id_token'] ? 'GOOGLE' : 'LOCAL'
    };

    this.secureStorage.setSession(JSON.stringify(session));
    this.session.set(session);
    return session;
  }
}
