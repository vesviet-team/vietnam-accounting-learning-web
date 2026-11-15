// Authenticated API helpers for account management endpoints (P1).
// Every call goes through authService.fetchWithAuth (bearer + transparent
// refresh). Network failures throw; UI layers decide how to degrade.
import { authService } from './auth-service';
import type { DeviceSession } from '@/types/auth';
import { getDeviceId } from './device';

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
