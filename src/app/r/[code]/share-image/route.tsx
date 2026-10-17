/* eslint-disable @next/next/no-img-element -- this JSX is rendered to a PNG by next/og, never to the DOM */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { normalizeRoomCode } from '@/contracts/text';
import { dictFor } from '@/i18n/dict';
import { previewLang } from '../room-metadata';
import { qrSvgDataUri } from '@/lib/qr-svg';
import { fetchRoomPreview, hasCanonicalOrigin, requestOrigin } from '@/lib/room-preview';
import { shareUrl } from '@/lib/share-url';
import { ytThumbLarge } from '@/lib/thumbs';

const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

const C = {
  dial: '#0f2a26',
  panel: '#173a34',
  paper: '#f3ecdd',
  sage: '#a9c1b8',
  amber: '#f6a623',
  onair: '#c23b2f',
};

const font = (file: string) => readFile(join(process.cwd(), 'assets/og', file));

/**
 * GET /r/CODE/share-image — 1200×630 share card: song artwork behind, room and song on
 * the left, QR on a paper slip. Referenced by the room's Open Graph tags and the
 * "Tải ảnh" button of the share dialog.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  // `?lang=en`: the card of an English link preview, or the sharer's "Download image".
  const lang = previewLang(new URL(req.url).searchParams.get('lang'));
  const t = dictFor(lang);
  const code = normalizeRoomCode((await params).code);
  const [preview, bodyLatin, bodyVi, displayLatin, displayVi] = await Promise.all([
    fetchRoomPreview(code),
    font('be-vietnam-pro-latin-600-normal.woff'),
    font('be-vietnam-pro-vietnamese-600-normal.woff'),
    font('bricolage-grotesque-latin-800-normal.woff'),
    font('bricolage-grotesque-vietnamese-800-normal.woff'),
  ]);
  const url = shareUrl(requestOrigin(req.headers), code, lang);
  const np = preview?.nowPlaying ?? null;
  const art = ytThumbLarge(np?.thumbnailUrl);

  const body = 'Body, BodyVi';
  const display = 'Display, DisplayVi';
  const column = { display: 'flex', flexDirection: 'column' } as const;
  // Slack / iMessage crop previews to a centred square (x 285–915). The QR and the room
  // code live inside it; room and song details sit on the sides for wide previews.
  const side = { ...column, width: 280, height: 566 } as const;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: 1200, height: 630, background: C.dial, position: 'relative', fontFamily: body, color: C.paper }}>
        {art && (
          <img src={art} alt="" width={1200} height={900} style={{ position: 'absolute', left: 0, top: -135, width: 1200, height: 900, objectFit: 'cover' }} />
        )}
        {/* satori has no `inset`: size the shade explicitly so text and QR stay crisp */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, display: 'flex', background: 'rgba(15,42,38,0.86)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 1200, height: 630, padding: '32px 48px', position: 'relative' }}>
          <div style={{ ...side, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', color: C.amber, fontSize: 24 }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: C.amber, marginRight: 10 }} />
              {t.appName}
            </div>
            <div style={{ display: 'flex', marginTop: 18, fontFamily: display, fontSize: 50, lineHeight: 1.04, letterSpacing: -0.5, lineClamp: 4 }}>
              {preview?.name ?? t.appName}
            </div>
            <div style={{ display: 'flex', marginTop: 18, fontSize: 22, lineHeight: 1.4, color: C.sage, lineClamp: 3 }}>{t.home.headline}</div>
          </div>

          <div style={{ ...column, alignItems: 'center', width: 472, height: 566, padding: '28px 36px 24px', background: C.paper, borderRadius: 32, color: C.dial }}>
            <img src={qrSvgDataUri(url, C.dial, C.paper)} alt="" width={400} height={400} />
            <div style={{ display: 'flex', marginTop: 14, fontFamily: display, fontSize: 64, lineHeight: 1, letterSpacing: 10 }}>{code}</div>
            <div style={{ display: 'flex', marginTop: 10, fontSize: 22, color: '#3f5e57' }}>{t.share.scan}</div>
          </div>

          <div style={{ ...side, justifyContent: 'center' }}>
            {np ? (
              <div style={{ ...column }}>
                {art && (
                  <img src={art} alt="" width={280} height={158} style={{ width: 280, height: 158, objectFit: 'cover', borderRadius: 16 }} />
                )}
                <div style={{ display: 'flex', marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: C.onair, fontSize: 20, padding: '5px 14px', borderRadius: 999 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 5, background: C.paper, marginRight: 8 }} />
                    {t.nowPlaying.live}
                  </div>
                </div>
                <div style={{ display: 'flex', marginTop: 12, fontSize: 26, lineHeight: 1.3, lineClamp: 3 }}>{np.title}</div>
                {np.addedBy ? (
                  <div style={{ display: 'flex', marginTop: 8, fontSize: 20, color: C.sage }}>{t.nowPlaying.pickedBy(np.addedBy)}</div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: 'flex', fontSize: 24, lineHeight: 1.4, color: C.sage }}>{t.share.idle}</div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      // Latin and Vietnamese subsets as separate families; each style lists both so
      // missing glyphs fall back within the same typeface.
      fonts: [
        { name: 'Body', data: bodyLatin, weight: 600, style: 'normal' },
        { name: 'BodyVi', data: bodyVi, weight: 600, style: 'normal' },
        { name: 'Display', data: displayLatin, weight: 800, style: 'normal' },
        { name: 'DisplayVi', data: displayVi, weight: 800, style: 'normal' },
      ],
      // The QR encodes the origin; when it comes from request headers, a shared cache
      // must never keep one visitor's image for another (cache poisoning).
      headers: hasCanonicalOrigin()
        ? { 'Cache-Control': 'public, max-age=60' }
        : { 'Cache-Control': 'private, max-age=60', Vary: 'Host, X-Forwarded-Host, X-Forwarded-Proto' },
    },
  );
}
