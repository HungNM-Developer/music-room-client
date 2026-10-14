import { describe, expect, it } from 'vitest';
import type { RoomSnapshot } from '@/contracts';
import { applySnapshot } from './room-store';

const snap = (version: number, code = 'K7M2QX') =>
  ({ version, room: { code } }) as unknown as RoomSnapshot;

describe('applySnapshot (R-49, TC-193)', () => {
  it('accepts newer, ignores older and equal versions', () => {
    const v5 = snap(5);
    expect(applySnapshot(null, v5)).toBe(v5);
    expect(applySnapshot(v5, snap(4))).toBe(v5);
    expect(applySnapshot(v5, snap(5))).toBe(v5);
    const v6 = snap(6);
    expect(applySnapshot(v5, v6)).toBe(v6);
  });
  it('a different room always replaces', () => {
    const other = snap(1, 'ZZZZZZ');
    expect(applySnapshot(snap(9), other)).toBe(other);
  });
});
