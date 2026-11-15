// Device & entity identity helpers for sync (P1).
// The device id is a uuid v4 persisted in localStorage; entity uuids give
// each locally-stored synced payload a stable identity for the server-side
// union merges. Everything here is dependency-free and storage-failure
// tolerant (offline-first).

const DEVICE_ID_KEY = 'vnacc_device_id';
const ENTITY_UUIDS_KEY = 'vnacc_entity_uuids';

function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC 4122 v4 from getRandomValues.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Stable uuid v4 for this device (localStorage-persisted). */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Storage unavailable: ephemeral id (still usable for one session).
    return randomUUID();
  }
}

function readEntityUuids(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ENTITY_UUIDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeEntityUuids(map: Record<string, string>): void {
  try {
    localStorage.setItem(ENTITY_UUIDS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Stable entity uuid for a synced storage key (created on first use). */
export function getEntityUuid(key: string): string {
  const map = readEntityUuids();
  if (map[key]) return map[key];
  const id = randomUUID();
  map[key] = id;
  writeEntityUuids(map);
  return id;
}

/** Sent with every push so the server can attribute writes per device. */
export function deviceHeaders(): Record<string, string> {
  return { 'X-Device-ID': getDeviceId() };
}
