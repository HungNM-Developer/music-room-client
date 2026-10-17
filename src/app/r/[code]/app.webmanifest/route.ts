import { normalizeRoomCode } from '@/contracts/text';
import { vi } from '@/i18n/vi';
import { fetchRoomPreview } from '@/lib/room-preview';
import { webManifest } from '@/lib/web-manifest';

/**
 * Installing from a room opens that room; from its speaker page (?host=1), the speaker page.
 * Each is its own app (own id), so one machine can keep both.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeRoomCode((await params).code);
  const host = new URL(req.url).searchParams.get('host') === '1';
  const preview = await fetchRoomPreview(code);
  const room = preview?.name ?? code;
  const path = host ? `/r/${code}/host` : `/r/${code}`;
  const body = webManifest({ id: path, name: host ? vi.pwa.hostName(room) : vi.pwa.roomName(room), startUrl: path });
  return Response.json(body, {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=300' },
  });
}
