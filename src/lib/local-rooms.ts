/**
 * Rooms this device created or joined, for "Phòng của tôi" on the home page when nobody is
 * signed in (signed in, the account's list is shown instead; the two stay separate). Kept in
 * localStorage; blocked storage simply means an empty list.
 */
export interface LocalRoom {
  code: string;
  name: string;
  /** Admin here (the creator, or someone who took admin with the PIN). */
  admin: boolean;
  /** Epoch ms. */
  lastVisitedAt: number;
}

const KEY = 'mr:rooms';
/** Matches the server's `rooms:status` limit. */
export const MAX_LOCAL_ROOMS = 20;

const listeners = new Set<() => void>();
let cache: LocalRoom[] | null = null;

function read(): LocalRoom[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(list)
      ? list.filter(
          (r): r is LocalRoom =>
            typeof r === 'object' && r !== null && typeof r.code === 'string' && typeof r.name === 'string' && typeof r.lastVisitedAt === 'number',
        )
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: LocalRoom[]): void {
  cache = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // private mode / quota: this visit still sees it
  }
  for (const fn of listeners) fn();
}

const EMPTY: LocalRoom[] = [];

/** Most recent first. */
export function localRooms(): LocalRoom[] {
  return typeof window === 'undefined' ? EMPTY : read();
}

export function onLocalRooms(fn: () => void): () => void {
  listeners.add(fn);
  // Another tab changed the list.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * The room was opened as a member (not the speaker): first on the list. Writes only when
 * something changed or the last visit is over a minute old, since snapshots arrive often.
 */
export function rememberRoom(room: { code: string; name: string; admin: boolean }): void {
  const list = read();
  const old = list.find((r) => r.code === room.code);
  const now = Date.now();
  if (old && old.name === room.name && old.admin === room.admin && now - old.lastVisitedAt < 60_000 && list[0] === old) return;
  write([{ ...room, lastVisitedAt: now }, ...list.filter((r) => r.code !== room.code)].slice(0, MAX_LOCAL_ROOMS));
}

/** Off this device's list (the room and the session in it stay). */
export function forgetRoom(code: string): void {
  const list = read();
  if (list.some((r) => r.code === code)) write(list.filter((r) => r.code !== code));
}

/** Rooms the server no longer has (deleted, expired). */
export function forgetRooms(codes: string[]): void {
  const gone = new Set(codes);
  const list = read();
  if (list.some((r) => gone.has(r.code))) write(list.filter((r) => !gone.has(r.code)));
}

/** The server's current name (renamed rooms). */
export function renameRooms(names: Map<string, string>): void {
  const list = read();
  if (list.some((r) => names.has(r.code) && names.get(r.code) !== r.name))
    write(list.map((r) => (names.has(r.code) ? { ...r, name: names.get(r.code)! } : r)));
}
