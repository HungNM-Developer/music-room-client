import { describe, expect, it } from 'vitest';
import { CONTRACTS_VERSION } from '@/contracts';
import { isVersionMismatch } from './version';

describe('isVersionMismatch (R-44, TC-192)', () => {
  it('same version → no banner', () =>
    expect(isVersionMismatch({ contractsVersion: CONTRACTS_VERSION })).toBe(false));
  it('different version → banner', () =>
    expect(isVersionMismatch({ contractsVersion: '1999-01-01.1' })).toBe(true));
  it('health unknown (offline) → no banner', () => {
    expect(isVersionMismatch(null)).toBe(false);
    expect(isVersionMismatch({})).toBe(false);
  });
});
