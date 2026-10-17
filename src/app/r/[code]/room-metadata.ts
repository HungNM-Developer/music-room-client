import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { Lang } from '@/contracts';
import { dictFor } from '@/i18n/dict';
import { fetchRoomPreview, requestOrigin } from '@/lib/room-preview';
import { shareUrl } from '@/lib/share-url';

/** Bump when the share image layout changes, so Slack & co. re-fetch instead of reusing their cache. */
const SHARE_IMAGE_DESIGN = 2;

/** Cache-buster for the share image: changes with the song and the language, short in the URL. */
function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** `?lang=en` on a shared link → English preview; anything else → Vietnamese. */
export const previewLang = (lang: unknown): Lang => (lang === 'en' ? 'en' : 'vi');

/** Link previews (Zalo, Messenger, Slack…) in the sharer's language: room name, song on air, and the QR image. */
export async function roomMetadata(code: string, lang: Lang): Promise<Metadata> {
  const t = dictFor(lang);
  const [preview, h] = await Promise.all([fetchRoomPreview(code), headers()]);
  const title = preview ? t.share.metaTitle(preview.name) : t.appName;
  const description = t.share.metaDesc(preview?.nowPlaying?.title ?? null);
  const origin = requestOrigin(h);
  const langParam = lang === 'en' ? 'lang=en&' : '';
  // Absolute URL on the origin the visitor used; the card changes with the song and the language.
  const image = {
    url: `${origin}/r/${code}/share-image?${langParam}v=${shortHash(`${SHARE_IMAGE_DESIGN}:${lang}:${preview?.nowPlaying?.title ?? ''}`)}`,
    width: 1200,
    height: 630,
    alt: t.share.imageAlt(preview?.name ?? code),
  };
  return {
    title,
    description,
    manifest: `/r/${code}/app.webmanifest`,
    openGraph: { title, description, type: 'website', siteName: t.appName, url: shareUrl(origin, code, lang), images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
