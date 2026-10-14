import { afterEach, describe, expect, it, vi } from 'vitest';

describe('session-store (TC-022)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses localStorage when available', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
        removeItem: (k: string) => void data.delete(k),
      },
    });
    const s = await import('./session-store');
    s.setToken('K7M2QX', 't1');
    expect(data.get('mr:session:K7M2QX')).toBe('t1');
    expect(s.getToken('K7M2QX')).toBe('t1');
    s.setToken('K7M2QX', 'h1', 'host');
    expect(s.getToken('K7M2QX', 'host')).toBe('h1');
    s.clearToken('K7M2QX');
    expect(s.getToken('K7M2QX')).toBeNull();
  });

  it('falls back to memory when storage throws', async () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('SecurityError');
      },
    });
    const s = await import('./session-store');
    s.setToken('K7M2QX', 't2');
    expect(s.getToken('K7M2QX')).toBe('t2');
    expect(s.lastName()).toBe('');
  });
});
