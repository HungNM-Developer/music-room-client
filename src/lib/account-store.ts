// L1: the Google-backed account token, kept on this device. Separate from the per-room
// member tokens in session-store: signing out leaves guest sessions alone.
import type { UserView } from '@/contracts';

const KEY = 'mr:account';

export interface StoredAccount {
  token: string;
  user: UserView;
}

export function readAccount(): StoredAccount | null {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(KEY);
    const a = raw ? (JSON.parse(raw) as StoredAccount) : null;
    return a && typeof a.token === 'string' && a.user?.id ? a : null;
  } catch {
    return null;
  }
}

export function writeAccount(a: StoredAccount | null): void {
  try {
    if (a) window.localStorage.setItem(KEY, JSON.stringify(a));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the account lasts for this page only
  }
}
