import type { PlaybackStatus } from '@/contracts';
import { tr } from '@/i18n';

export { formatDuration } from './duration';

/** serverTime − local receive time (ms). Positive when the local clock is behind (R-50). */
export function clockOffset(serverTime: number, receivedAt: number): number {
  return serverTime - receivedAt;
}

/** Position (s) of the current track right now, corrected for clock skew, clamped to duration. */
export function estimatePosition(
  np: {
    status: PlaybackStatus;
    positionSec: number;
    positionAt: number;
    durationSec?: number | null;
  },
  offsetMs: number,
  localNow: number,
): number {
  const raw =
    np.status === 'PLAYING'
      ? np.positionSec + Math.max(0, localNow + offsetMs - np.positionAt) / 1000
      : np.positionSec;
  return np.durationSec ? Math.min(raw, np.durationSec) : raw;
}

/** ISO timestamp → "HH:mm" in the viewer's own time zone. */
export function formatClock(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(tr().time.locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(iso));
}

/** "vừa xong" / "just now", "5 phút trước" / "5 min ago" … then the date, in the device language. */
export function formatAgo(iso: string, now = Date.now()): string {
  const t = tr();
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return t.time.justNow;
  if (min < 60) return t.time.minutesAgo(min);
  const h = Math.floor(min / 60);
  if (h < 24) return t.time.hoursAgo(h);
  const d = Math.floor(h / 24);
  if (d < 7) return t.time.daysAgo(d);
  return new Intl.DateTimeFormat(t.time.locale, { day: 'numeric', month: 'numeric' }).format(new Date(iso));
}
