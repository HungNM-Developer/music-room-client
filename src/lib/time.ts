import type { PlaybackStatus } from '@/contracts';

/** 213 → "3:33", 3723 → "1:02:03". Rounds down; null/NaN → "". */
export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec === null || totalSec === undefined || !Number.isFinite(totalSec)) return '';
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

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
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(iso));
}

/** "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước", then the date. */
export function formatAgo(iso: string, now = Date.now()): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' }).format(new Date(iso));
}
