import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { normalizeRoomCode } from '@/contracts/text';
import { vi } from '@/i18n/vi';
import { fetchRoomPreview, requestOrigin } from '@/lib/room-preview';

type Params = { params: Promise<{ code: string }> };

/** Bump when the share image layout changes, so Slack & co. re-fetch instead of reusing their cache. */
const SHARE_IMAGE_DESIGN = 2;

/** Cache-buster for the share image: changes with the song, short in the URL. */
function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Link previews (Zalo, Messenger, Slack…): room name, song on air, and the QR image. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const code = normalizeRoomCode((await params).code);
  const [preview, h] = await Promise.all([fetchRoomPreview(code), headers()]);
  const title = preview ? vi.share.metaTitle(preview.name) : vi.appName;
  const description = vi.share.metaDesc(preview?.nowPlaying?.title ?? null);
  const origin = requestOrigin(h);
  // Absolute URL on the origin the visitor used; the card changes with the song.
  const image = {
    url: `${origin}/r/${code}/share-image?v=${shortHash(`${SHARE_IMAGE_DESIGN}:${preview?.nowPlaying?.title ?? ''}`)}`,
    width: 1200,
    height: 630,
    alt: vi.share.imageAlt(preview?.name ?? code),
  };
  return {
    title,
    description,
    manifest: `/r/${code}/app.webmanifest`,
    openGraph: { title, description, type: 'website', siteName: vi.appName, url: `${origin}/r/${code}`, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
