import { describe, it, expect, afterEach, vi } from 'vitest';
import { registerAccount, RegisterError } from '@/services/auth/api';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('registerAccount (POST /auth/register)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the server contract body and returns the created account', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(201, { id: 'u-1', email: 'a@b.vn', display_name: 'An' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await registerAccount('a@b.vn', 'password123', 'An');
    expect(out).toEqual({ id: 'u-1', email: 'a@b.vn', display_name: 'An' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe('/auth/register');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'a@b.vn',
      password: 'password123',
      display_name: 'An',
    });
  });

  it('maps 409 email_taken to a RegisterError with status + code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(409, { error: 'email_taken', error_description: 'email already registered' })),
    );
    try {
      await registerAccount('a@b.vn', 'password123', '');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RegisterError);
      const re = err as RegisterError;
      expect(re.status).toBe(409);
      expect(re.code).toBe('email_taken');
    }
  });

  it('maps 429 slow_down (rate limited) to RegisterError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(429, { error: 'slow_down', error_description: '' })),
    );
    await expect(registerAccount('a@b.vn', 'password123', '')).rejects.toMatchObject({
      status: 429,
      code: 'slow_down',
    });
  });

  it('maps a non-JSON error body to a generic server_error RegisterError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused');
      }),
    );
    await expect(registerAccount('a@b.vn', 'password123', '')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    });
  });
});
