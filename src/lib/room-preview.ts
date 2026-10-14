import type { RoomPreview } from '@/contracts';

/**
 * Server-side fetch of the public room card (link previews). INTERNAL_SERVER_URL wins
 * when the API is reachable on a private address (Docker: http://api:3001).
 */
export async function fetchRoomPreview(code: string): Promise<RoomPreview | null> {
  const base = process.env.INTERNAL_SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL;
  if (!base) return null;
  try {
    const r = await fetch(`${base}/api/rooms/${encodeURIComponent(code)}/preview`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? ((await r.json()) as RoomPreview) : null;
  } catch {
    return null;
  }
}

/** True when PUBLIC_APP_URL pins the canonical origin (production). */
export const hasCanonicalOrigin = () => Boolean(process.env.PUBLIC_APP_URL);

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * Origin for absolute links in previews (og:url, og:image, the QR code). Production sets
 * PUBLIC_APP_URL so nothing depends on request headers. Without it (dev, LAN) the Host
 * header is used, but only if it looks like a host name — and callers must then keep
 * responses out of shared caches, since Host / X-Forwarded-Host are client-controlled.
 */
export function requestOrigin(h: Headers): string {
  const configured = process.env.PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].trim();
  if (!HOST.test(host)) return 'http://localhost:3000';
  const fwdProto = h.get('x-forwarded-proto')?.split(',')[0].trim();
  const proto = fwdProto === 'https' || fwdProto === 'http' ? fwdProto : /^(localhost|\d)/.test(host) ? 'http' : 'https';
  return `${proto}://${host}`;
}
