// Authenticated API helpers for account management endpoints (P1).
// Every call goes through authService.fetchWithAuth (bearer + transparent
// refresh). Network failures throw; UI layers decide how to degrade.
import { authService } from './auth-service';
import type { DeviceSession } from '@/types/auth';
import { getDeviceId } from './device';

// --- Registration (unauthenticated: POST /auth/register) --------------------

export interface RegisterResult {
  id: string;
  email: string;
  display_name: string;
}

/** Typed error from /auth/register: HTTP status + OAuth-style error code. */
export class RegisterError extends Error {
  constructor(
    public status: number,
    public code: string,
    public description: string,
  ) {
    super(description || code);
    this.name = 'RegisterError';
  }
}

/**
 * Registers a new account. Plain fetch (no bearer — the user is not logged
 * in yet). Server contract (server/internal/user/handler.go):
 *   POST /auth/register {"email","password","display_name"}
 *   -> 201 {"id","email","display_name"}
 *   -> 400 invalid_request (invalid email / weak password / malformed JSON)
 *   -> 409 email_taken, 429 slow_down (rate limited), 500 server_error
 */
export async function registerAccount(email: string, password: string, displayName: string): Promise<RegisterResult> {
  let res: Response;
  try {
    res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
  } catch {
    throw new RegisterError(0, 'network_error', '');
  }
  if (res.ok) return (await res.json()) as RegisterResult;
  let code = 'server_error';
  let description = '';
  try {
    const body = (await res.json()) as { error?: string; error_description?: string };
    code = body.error ?? code;
    description = body.error_description ?? '';
  } catch {
    /* non-JSON error body: keep defaults */
  }
  throw new RegisterError(res.status, code, description);
}

export async function listSessions(): Promise<DeviceSession[]> {
  const res = await authService.fetchWithAuth('/me/sessions');
  if (!res.ok) throw new Error(`sessions: HTTP ${res.status}`);
  const body = (await res.json()) as { sessions: DeviceSession[] };
  return body.sessions ?? [];
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  const res = await authService.fetchWithAuth('/me/sessions/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return res.ok;
}

/** Full account data as a JSON string (downloaded by the UI). */
export async function exportAccountData(): Promise<string> {
  const res = await authService.fetchWithAuth('/me/export');
  if (!res.ok) throw new Error(`export: HTTP ${res.status}`);
  return await res.text();
}

export async function deleteAccount(): Promise<boolean> {
  const res = await authService.fetchWithAuth('/me/delete', {
    method: 'POST',
    headers: { 'X-Device-ID': getDeviceId() },
  });
  return res.ok;
}
