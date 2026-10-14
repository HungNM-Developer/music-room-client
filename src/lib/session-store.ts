// Per-room session tokens. Falls back to memory when localStorage is blocked
// (private mode / disabled storage): the page still works, a reload asks for the name again (TC-022).

const memory = new Map<string, string>();
const PREFIX = 'mr:session:';

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    const probe = `${PREFIX}probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export type SessionKind = 'member' | 'host';
const key = (code: string, kind: SessionKind) =>
  `${PREFIX}${kind === 'host' ? 'host:' : ''}${code}`;

export function getToken(code: string, kind: SessionKind = 'member'): string | null {
  const k = key(code, kind);
  return storage()?.getItem(k) ?? memory.get(k) ?? null;
}

export function setToken(code: string, token: string, kind: SessionKind = 'member'): void {
  const k = key(code, kind);
  memory.set(k, token);
  try {
    storage()?.setItem(k, token);
  } catch {
    // quota / blocked: memory copy is enough for this page
  }
}

export function clearToken(code: string, kind: SessionKind = 'member'): void {
  const k = key(code, kind);
  memory.delete(k);
  try {
    storage()?.removeItem(k);
  } catch {
    // ignore
  }
}

/** Remembered display name to prefill the join form. */
export function lastName(): string {
  try {
    return storage()?.getItem(`${PREFIX}name`) ?? '';
  } catch {
    return '';
  }
}
export function rememberName(name: string): void {
  try {
    storage()?.setItem(`${PREFIX}name`, name);
  } catch {
    // ignore
  }
}
