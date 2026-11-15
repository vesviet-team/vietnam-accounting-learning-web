// OAuth 2.1 authorization-code + PKCE (S256) client for the SPA.
//
// Token handling policy (offline-first, XSS-aware):
//   - access token: memory only (module state), never web storage
//   - refresh token: httpOnly cookie set by the server (vnacc_rt); the JSON
//     body copy is mirrored in sessionStorage as a fallback for plain-http
//     dev environments where the Secure cookie is dropped — never localStorage
//   - on 401 the caller retries once through `fetchWithAuth` (transparent
//     refresh), and auth state changes are published via onAuthChange
import type { AuthUser } from '@/types/auth';
import { getDeviceId } from './device';

const VERIFIER_KEY = 'vnacc_pkce_verifier';
const STATE_KEY = 'vnacc_oauth_state';
const REFRESH_KEY = 'vnacc_rt';

export interface AuthConfig {
  clientId: string;
  authorizeEndpoint: string; // same-origin path
  tokenEndpoint: string;
  logoutEndpoint: string;
  redirectUri: string;
  scope: string;
  issuer: string;
}

export type AuthListener = (state: { user: AuthUser | null }) => void;

function base64url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64url(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** Overridable side effects for tests. */
export interface AuthDeps {
  fetchImpl?: typeof fetch;
  redirect?: (url: string) => void;
  config?: Partial<AuthConfig>;
}

const defaultConfig = (): AuthConfig => {
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hoa.tanhdev.com';
  return {
    clientId: env.VITE_OAUTH_CLIENT_ID || 'vnacc-spa',
    authorizeEndpoint: '/oauth2/auth',
    tokenEndpoint: '/oauth2/token',
    logoutEndpoint: '/oauth2/logout',
    // Must match the server-registered OAUTH_CLIENT_REDIRECT_URI.
    redirectUri: env.VITE_OAUTH_REDIRECT_URI || `${origin}/oauth2/callback`,
    scope: 'read write',
    issuer: env.VITE_OAUTH_ISSUER || 'https://hoa.tanhdev.com',
  };
};

export class AuthService {
  private cfg: AuthConfig;
  private fetchImpl: typeof fetch;
  private redirect: (url: string) => void;

  private accessToken: string | null = null;
  private accessExpiresAt = 0;
  private refreshPromise: Promise<string | null> | null = null;
  private user: AuthUser | null = null;
  private listeners = new Set<AuthListener>();

  constructor(deps: AuthDeps = {}) {
    this.cfg = { ...defaultConfig(), ...deps.config };
    this.fetchImpl = deps.fetchImpl ?? ((...a) => fetch(...a));
    this.redirect =
      deps.redirect ??
      ((url) => {
        window.location.assign(url);
      });
  }

  // --- Public API ---------------------------------------------------------

  /** Starts the authorization-code flow: PKCE + state, then redirect. */
  async login(): Promise<void> {
    const verifier = randomBase64url(32);
    const challenge = await pkceChallenge(verifier);
    const state = randomBase64url(16);
    try {
      sessionStorage.setItem(VERIFIER_KEY, verifier);
      sessionStorage.setItem(STATE_KEY, state);
    } catch {
      /* ignore */
    }
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      scope: this.cfg.scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    this.redirect(`${this.cfg.authorizeEndpoint}?${q.toString()}`);
  }

  /**
   * Completes the flow when the browser lands back with ?code&state
   * (any path — the registered redirect_uri decides where that is).
   * Returns true when a login was completed.
   */
  async handleRedirectIfPresent(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return false;

    let expected: string | null = null;
    try {
      expected = sessionStorage.getItem(STATE_KEY);
    } catch {
      /* ignore */
    }
    this.cleanUrl();
    if (expected && state !== expected) {
      this.emit(null);
      return false;
    }
    const verifier = this.readSession(VERIFIER_KEY) ?? '';
    try {
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
    } catch {
      /* ignore */
    }
    const ok = await this.exchangeCode(code, verifier);
    this.emit(ok ? this.user : null);
    return ok;
  }

  /**
   * Valid access token, refreshing through the httpOnly cookie (or the
   * sessionStorage fallback) when needed. Returns null when unauthenticated.
   */
  async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.accessExpiresAt) {
      return this.accessToken;
    }
    return await this.refreshAccessToken();
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  onAuthChange(cb: AuthListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Best-effort logout: revoke server session, clear all local state. */
  async logout(): Promise<void> {
    const form = new URLSearchParams({ client_id: this.cfg.clientId });
    const refresh = this.readSession(REFRESH_KEY);
    if (refresh) form.set('refresh_token', refresh);
    try {
      await this.fetchImpl(this.cfg.logoutEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Device-ID': getDeviceId(),
        },
        body: form.toString(),
        credentials: 'include',
      });
    } catch {
      /* offline-first: local logout always succeeds */
    }
    this.clearTokens();
    this.user = null;
    this.emit(null);
  }

  /**
   * fetch with bearer auth: on 401 refreshes once and retries. Throws when
   * unauthenticated or the endpoint still fails.
   */
  async fetchWithAuth(input: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    if (!token) throw new Error('auth: not authenticated');
    const doFetch = (t: string) =>
      this.fetchImpl(input, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${t}`,
          'X-Device-ID': getDeviceId(),
        },
        credentials: 'include',
      });
    let res = await doFetch(token);
    if (res.status === 401) {
      const fresh = await this.refreshAccessToken(true);
      if (fresh) res = await doFetch(fresh);
    }
    return res;
  }

  /** Test hook: seed state (unit tests only). */
  _setSessionForTests(token: string, expiresInSeconds: number, user: AuthUser | null): void {
    this.accessToken = token;
    this.accessExpiresAt = Date.now() + expiresInSeconds * 1000;
    this.user = user;
  }

  _resetForTests(): void {
    this.clearTokens();
    this.user = null;
    this.listeners.clear();
  }

  // --- Internals ----------------------------------------------------------

  private async exchangeCode(code: string, verifier: string): Promise<boolean> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.cfg.redirectUri,
      client_id: this.cfg.clientId,
      code_verifier: verifier,
    });
    try {
      const res = await this.fetchImpl(this.cfg.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Device-ID': getDeviceId(),
        },
        body: body.toString(),
        credentials: 'include',
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
        refresh_token?: string;
      };
      if (!tokens.access_token) return false;
      this.setTokens(tokens);
      await this.loadUser();
      return true;
    } catch {
      return false;
    }
  }

  private async refreshAccessToken(force = false): Promise<string | null> {
    if (this.refreshPromise) return await this.refreshPromise;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.cfg.clientId,
    });
    const refresh = this.readSession(REFRESH_KEY);
    if (refresh) body.set('refresh_token', refresh);
    this.refreshPromise = (async () => {
      try {
        const res = await this.fetchImpl(this.cfg.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Device-ID': getDeviceId(),
          },
          body: body.toString(),
          credentials: 'include',
        });
        if (!res.ok) {
          if (force && res.status === 400) {
            // Refresh rejected (revoked/expired): full local sign-out.
            this.clearTokens();
            this.user = null;
            this.emit(null);
          }
          return null;
        }
        const tokens = (await res.json()) as {
          access_token?: string;
          expires_in?: number;
          refresh_token?: string;
        };
        if (!tokens.access_token) return null;
        this.setTokens(tokens);
        if (!this.user) await this.loadUser();
        return tokens.access_token;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return await this.refreshPromise;
  }

  private setTokens(tokens: { access_token?: string; expires_in?: number; refresh_token?: string }): void {
    this.accessToken = tokens.access_token ?? null;
    const ttl = Math.max(1, (tokens.expires_in ?? 900) - 30); // 30s clock skew
    this.accessExpiresAt = Date.now() + ttl * 1000;
    if (tokens.refresh_token) {
      try {
        sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token);
      } catch {
        /* ignore */
      }
    }
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.accessExpiresAt = 0;
    try {
      sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignore */
    }
  }

  private readSession(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private async loadUser(): Promise<void> {
    try {
      const res = await this.fetchImpl('/me', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        credentials: 'include',
      });
      if (res.ok) {
        this.user = (await res.json()) as AuthUser;
      } else {
        this.user = null;
      }
    } catch {
      this.user = null;
    }
  }

  private cleanUrl(): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState(null, '', url.toString());
    } catch {
      /* ignore */
    }
  }

  private emit(user: AuthUser | null): void {
    this.user = user === undefined ? this.user : user;
    for (const cb of this.listeners) {
      try {
        cb({ user: this.user });
      } catch {
        /* listener errors never break auth flow */
      }
    }
  }
}

/** App-wide singleton (access token stays in this module's memory). */
export const authService = new AuthService();
