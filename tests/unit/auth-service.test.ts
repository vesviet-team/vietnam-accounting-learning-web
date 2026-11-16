import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService, type AuthDeps } from '@/services/auth/auth-service';

function makeRedirectDeps(overrides: Partial<AuthDeps> = {}): { deps: AuthDeps; redirected: string[] } {
  const redirected: string[] = [];
  return {
    redirected,
    deps: {
      redirect: (url) => redirected.push(url),
      config: {
        clientId: 'test-client',
        authorizeEndpoint: '/oauth2/auth',
        tokenEndpoint: '/oauth2/token',
        redirectUri: 'https://app.test/oauth2/callback',
        scope: 'read write',
        issuer: 'https://auth.test',
      },
      ...overrides,
    },
  };
}

/** fetch stub routing by URL. */
function fetchRouter(routes: {
  token?: ((body: URLSearchParams) => ResponseInit & { json?: unknown }) | ResponseInit & { json?: unknown };
  me?: { json?: unknown; status?: number };
  default?: (url: string, init?: RequestInit) => ResponseInit & { json?: unknown };
}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const make = (status: number, json: unknown) =>
    ({
      ok: status < 400,
      status,
      json: async () => json,
    }) as unknown as Response;
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : String(url);
    calls.push({ url: u, init });
    if (u.includes('/oauth2/token')) {
      const body = new URLSearchParams(init?.body as string);
      const route = typeof routes.token === 'function' ? routes.token(body) : routes.token;
      if (!route) return make(400, { error: 'invalid_grant' });
      return make(route.status ?? 200, route.json);
    }
    if (u.includes('/me')) {
      return make(routes.me?.status ?? 200, routes.me?.json ?? { id: 'u1', email: 'a@b.c' });
    }
    const d = routes.default?.(u, init);
    return make(d?.status ?? 200, d?.json);
  }) as unknown as typeof fetch;
  return { impl, calls, make };
}

describe('AuthService (OAuth 2.1 + PKCE S256)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('login() builds a PKCE S256 authorize URL and stores verifier + state', async () => {
    const { deps, redirected } = makeRedirectDeps();
    const svc = new AuthService(deps);
    await svc.login();

    expect(redirected).toHaveLength(1);
    const url = new URL(redirected[0], 'https://app.test');
    expect(url.pathname).toBe('/oauth2/auth');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('test-client');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.test/oauth2/callback');
    const challenge = url.searchParams.get('code_challenge') ?? '';
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/); // base64url(SHA-256)
    const state = url.searchParams.get('state') ?? '';
    expect(sessionStorage.getItem('vnacc_oauth_state')).toBe(state);
    const verifier = sessionStorage.getItem('vnacc_pkce_verifier') ?? '';
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    // S256 correctness: challenge == base64url(sha256(verifier))
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const bin = Array.from(new Uint8Array(digest), (b) => String.fromCharCode(b)).join('');
    expect(btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')).toBe(challenge);
  });

  it('handleRedirectIfPresent() exchanges the code and loads /me', async () => {
    const { impl } = fetchRouter({
      token: (body) => {
        expect(body.get('grant_type')).toBe('authorization_code');
        expect(body.get('code')).toBe('the-code');
        expect(body.get('code_verifier')).toBe(verifier);
        return { status: 200, json: { access_token: 'at', expires_in: 900, refresh_token: 'rt', token_type: 'Bearer', scope: 'read write' } };
      },
      me: { json: { id: 'u1', email: 'a@b.c', display_name: 'An' } },
    });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);
    await svc.login();
    const verifier = sessionStorage.getItem('vnacc_pkce_verifier') ?? '';
    window.history.replaceState(null, '', '/?code=the-code&state=' + sessionStorage.getItem('vnacc_oauth_state'));

    const fired: (null | { id: string })[] = [];
    svc.onAuthChange(({ user }) => fired.push(user ? { id: user.id } : null));

    const ok = await svc.handleRedirectIfPresent();
    expect(ok).toBe(true);
    expect(svc.isAuthenticated()).toBe(true);
    expect(svc.getUser()?.id).toBe('u1');
    expect(fired[fired.length - 1]).toEqual({ id: 'u1' });
    // Access token stays in memory only; refresh is not in localStorage.
    expect(await svc.getAccessToken()).toBe('at');
    expect(localStorage.getItem('vnacc_rt')).toBeNull();
    expect(localStorage.getItem('at')).toBeNull();
    // URL cleaned of code/state.
    expect(window.location.search).toBe('');
  });

  it('rejects a state mismatch (CSRF) without logging in', async () => {
    const { impl, calls } = fetchRouter({ token: { status: 200, json: { access_token: 'at' } } });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);
    await svc.login();
    window.history.replaceState(null, '', '/?code=x&state=evil-state');
    const ok = await svc.handleRedirectIfPresent();
    expect(ok).toBe(false);
    expect(svc.isAuthenticated()).toBe(false);
    expect(calls.filter((c) => c.url.includes('token'))).toHaveLength(0);
  });

  it('getAccessToken() transparently refreshes when expired', async () => {
    const { impl } = fetchRouter({
      token: (body) => {
        expect(body.get('grant_type')).toBe('refresh_token');
        return { status: 200, json: { access_token: 'fresh', expires_in: 900 } };
      },
    });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);
    // Expired access token in memory + refresh fallback in sessionStorage.
    svc._setSessionForTests('stale', -10, { id: 'u1', email: 'a@b.c' });
    sessionStorage.setItem('vnacc_rt', 'rt-1');
    expect(await svc.getAccessToken()).toBe('fresh');
  });

  it('logout() posts to the logout-capable token revoke path and clears state', async () => {
    const logoutCalls: { url: string; init?: RequestInit }[] = [];
    const { impl } = fetchRouter({
      token: (body) => {
        if (body.get('grant_type')) return { status: 200, json: {} };
        return { status: 200, json: { revoked: true } };
      },
      default: (url, init) => {
        logoutCalls.push({ url, init });
        return { status: 200, json: { revoked: true } };
      },
    });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);
    svc._setSessionForTests('at', 900, { id: 'u1', email: 'a@b.c' });
    sessionStorage.setItem('vnacc_rt', 'rt-1');

    const fired: (null | { id: string })[] = [];
    svc.onAuthChange(({ user }) => fired.push(user ? { id: user.id } : null));
    await svc.logout();
    expect(svc.isAuthenticated()).toBe(false);
    expect(fired[fired.length - 1]).toBeNull();
    expect(sessionStorage.getItem('vnacc_rt')).toBeNull();
    expect(logoutCalls.length).toBeGreaterThan(0);
  });

  it('init() silently restores session on page reload using refresh token', async () => {
    const { impl } = fetchRouter({
      token: (body) => {
        expect(body.get('grant_type')).toBe('refresh_token');
        return { status: 200, json: { access_token: 'restored-at', expires_in: 900, refresh_token: 'rt-2' } };
      },
      me: { json: { id: 'u1', email: 'a@b.c', display_name: 'An' } },
    });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);
    sessionStorage.setItem('vnacc_rt', 'rt-1');

    const fired: (null | { id: string })[] = [];
    svc.onAuthChange(({ user }) => fired.push(user ? { id: user.id } : null));

    const user = await svc.init();
    expect(user?.id).toBe('u1');
    expect(svc.isAuthenticated()).toBe(true);
    expect(fired[fired.length - 1]).toEqual({ id: 'u1' });
  });

  it('handleRedirectIfPresent() rejects callback when stored state is missing (CSRF protection) and cleans error URLs', async () => {
    const { impl, calls } = fetchRouter({ token: { status: 200, json: { access_token: 'at' } } });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);

    window.history.replaceState(null, '', '/oauth2/callback?code=stolen&state=arbitrary');
    expect(await svc.handleRedirectIfPresent()).toBe(false);
    expect(calls.filter((c) => c.url.includes('token'))).toHaveLength(0);

    window.history.replaceState(null, '', '/oauth2/callback?error=access_denied&state=abc');
    expect(await svc.handleRedirectIfPresent()).toBe(false);
    expect(window.location.search).toBe('');
  });

  it('init() skips POST /oauth2/token for anonymous visitors with no session hint', async () => {
    const { impl, calls } = fetchRouter({ token: { status: 400, json: { error: 'invalid_request' } } });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);

    const user = await svc.init();
    expect(user).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('init() clears stale session hint when silent refresh fails', async () => {
    const { impl, calls } = fetchRouter({ token: { status: 400, json: { error: 'invalid_grant' } } });
    const { deps } = makeRedirectDeps({ fetchImpl: impl });
    const svc = new AuthService(deps);
    localStorage.setItem('vnacc_session_hint', '1');

    const user = await svc.init();
    expect(user).toBeNull();
    expect(calls.filter((c) => c.url.includes('/oauth2/token'))).toHaveLength(1);
    expect(localStorage.getItem('vnacc_session_hint')).toBeNull();
  });
});
