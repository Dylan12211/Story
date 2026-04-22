import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiEnvelope, ProfileResponse, RegisterPayload, SessionState } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:8080';
  private readonly storageKey = 'story.portal.session';

  readonly session = signal<SessionState | null>(this.loadSession());
  readonly isAuthenticated = computed(() => !!this.session());
  readonly isAdmin = computed(() => this.session()?.roles.includes('ROLE_ADMIN') ?? false);

  async login(username: string, password: string): Promise<SessionState> {
    const response = await firstValueFrom(
      this.http.post(`${this.apiBase}/api/login`, { username, password }, { responseType: 'text' })
    );
    const payload = JSON.parse(response) as Record<string, string>;
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
      username: String(claims['preferred_username'] ?? username),
      email: claims['email'] ? String(claims['email']) : undefined,
      roles,
      provider: payload['id_token'] ? 'GOOGLE' : 'LOCAL'
    };

    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.session.set(session);
    return session;
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

    localStorage.removeItem(this.storageKey);
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
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SessionState;
    } catch {
      localStorage.removeItem(this.storageKey);
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
    const idToken = tokenResponse.id_token;

    const claims = this.decodeJwt(accessToken);

    const realmAccess = claims['realm_access'] as { roles?: string[] } | undefined;

    const roles = (realmAccess?.roles ?? []).map(
      (role) => `ROLE_${role.toUpperCase()}`
    );

    const session = {
      accessToken,
      idToken,
      username: String(claims['preferred_username'] ?? ''),
      email: claims['email'] ? String(claims['email']) : undefined,
      roles
    };

    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.session.set(session);
  }
}
