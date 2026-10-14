import { describe, expect, it } from 'vitest';
import { clockOffset, estimatePosition, formatClock, formatDuration } from './time';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [59.9, '0:59'],
    [213, '3:33'],
    [600, '10:00'],
    [601, '10:01'],
    [3723, '1:02:03'],
  ])('%s → %s', (s, out) => expect(formatDuration(s)).toBe(out));
  it('empty for null', () => expect(formatDuration(null)).toBe(''));
});

describe('TC-109 clock skew and time zones (R-50)', () => {
  it('a client 5 minutes ahead still shows the right position', () => {
    const serverNow = 1_000_000;
    const localNow = serverNow + 5 * 60_000; // local clock is 5 min fast
    const offset = clockOffset(serverNow, localNow);
    const np = { status: 'PLAYING' as const, positionSec: 30, positionAt: serverNow };
    expect(estimatePosition(np, offset, localNow)).toBeCloseTo(30, 3);
    expect(estimatePosition(np, offset, localNow + 2000)).toBeCloseTo(32, 3);
  });
  it('paused position does not move; clamps at duration', () => {
    expect(
      estimatePosition({ status: 'PAUSED', positionSec: 30, positionAt: 0 }, 0, 999_999),
    ).toBe(30);
    expect(
      estimatePosition(
        { status: 'PLAYING', positionSec: 190, positionAt: 0, durationSec: 200 },
        0,
        60_000,
      ),
    ).toBe(200);
  });
  it('formats chat times in the viewer zone (UTC−5 vs Asia/Ho_Chi_Minh)', () => {
    const iso = '2026-10-14T03:05:00.000Z';
    expect(formatClock(iso, 'America/New_York')).toBe('23:05');
    expect(formatClock(iso, 'Asia/Ho_Chi_Minh')).toBe('10:05');
  });
});
