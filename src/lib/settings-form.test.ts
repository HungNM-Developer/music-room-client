import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/contracts';
import { fromForm, toForm } from './settings-form';

const base = toForm(DEFAULT_SETTINGS);

describe('settings form units & bounds (TC-181…TC-184)', () => {
  it('round-trips the defaults', () => {
    expect(base).toEqual({ thresholdPct: '50', maxQueued: '4', maxMinutes: '10', fallbackUrl: '', allowGuestDj: false });
    expect(fromForm(base).settings).toEqual(DEFAULT_SETTINGS);
  });
  it.each([
    ['9', true], ['10', false], ['100', false], ['101', true], ['50.5', true],
  ])('threshold %s%% invalid=%s', (v, bad) =>
    expect(Boolean(fromForm({ ...base, thresholdPct: v }).errors.thresholdPct)).toBe(bad));
  it.each([['0', true], ['1', false], ['20', false], ['21', true]])('maxQueued %s invalid=%s', (v, bad) =>
    expect(Boolean(fromForm({ ...base, maxQueued: v }).errors.maxQueued)).toBe(bad));
  it('TC-183 minutes → seconds: 0→0, 1→60, 120→7200; 121 and 1.5 invalid', () => {
    expect(fromForm({ ...base, maxMinutes: '0' }).settings!.maxTrackDurationSec).toBe(0);
    expect(fromForm({ ...base, maxMinutes: '1' }).settings!.maxTrackDurationSec).toBe(60);
    expect(fromForm({ ...base, maxMinutes: '120' }).settings!.maxTrackDurationSec).toBe(7200);
    expect(fromForm({ ...base, maxMinutes: '121' }).errors.maxMinutes).toBe(true);
    expect(fromForm({ ...base, maxMinutes: '1.5' }).errors.maxMinutes).toBe(true);
  });
  it('TC-184 fallback must be a playlist link; blank → null', () => {
    expect(fromForm({ ...base, fallbackUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }).errors.fallbackUrl).toBe(true);
    expect(
      fromForm({ ...base, fallbackUrl: 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI' }).settings!
        .fallbackPlaylistUrl,
    ).toContain('list=');
    expect(fromForm({ ...base, fallbackUrl: '  ' }).settings!.fallbackPlaylistUrl).toBeNull();
  });
});
