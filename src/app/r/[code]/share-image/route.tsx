/* eslint-disable @next/next/no-img-element -- this JSX is rendered to a PNG by next/og, never to the DOM */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { normalizeRoomCode } from '@/contracts/text';
import { vi } from '@/i18n/vi';
import { qrSvgDataUri } from '@/lib/qr-svg';
import { fetchRoomPreview, hasCanonicalOrigin, requestOrigin } from '@/lib/room-preview';
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
  const code = normalizeRoomCode((await params).code);
  const [preview, bodyLatin, bodyVi, displayLatin, displayVi] = await Promise.all([
    fetchRoomPreview(code),
    font('be-vietnam-pro-latin-600-normal.woff'),
    font('be-vietnam-pro-vietnamese-600-normal.woff'),
    font('bricolage-grotesque-latin-800-normal.woff'),
    font('bricolage-grotesque-vietnamese-800-normal.woff'),
  ]);
  const url = `${requestOrigin(req.headers)}/r/${code}`;
  const np = preview?.nowPlaying ?? null;
  const art = ytThumbLarge(np?.thumbnailUrl);

  const body = 'Body, BodyVi';
  const display = 'Display, DisplayVi';
  const column = { display: 'flex', flexDirection: 'column' } as const;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: 1200, height: 630, background: C.dial, position: 'relative', fontFamily: body, color: C.paper }}>
        {art && (
          <img src={art} alt="" width={1200} height={900} style={{ position: 'absolute', left: 0, top: -135, width: 1200, height: 900, objectFit: 'cover' }} />
        )}
        {/* satori has no `inset`: size the shade explicitly so the text stays readable */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1200,
            height: 630,
            display: 'flex',
            backgroundImage: `linear-gradient(90deg, ${C.dial} 0%, rgba(15,42,38,0.94) 52%, rgba(15,42,38,0.62) 100%)`,
          }}
        />
        <div style={{ display: 'flex', width: 1200, height: 630, padding: 64, position: 'relative' }}>
          <div style={{ ...column, width: 640, height: 502 }}>
            <div style={{ display: 'flex', alignItems: 'center', color: C.amber, fontSize: 28 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: C.amber, marginRight: 12 }} />
              {vi.appName}
            </div>
            <div style={{ display: 'flex', marginTop: 24, fontFamily: display, fontSize: 72, lineHeight: 1.02, letterSpacing: -1, lineClamp: 2 }}>
              {preview?.name ?? vi.home.headline}
            </div>
            {np ? (
              <div style={{ ...column, marginTop: 32 }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: C.onair, fontSize: 22, padding: '6px 18px', borderRadius: 999 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: C.paper, marginRight: 10 }} />
                    {vi.nowPlaying.live}
                  </div>
                </div>
                <div style={{ display: 'flex', marginTop: 14, fontSize: 34, lineHeight: 1.25, lineClamp: 2 }}>{np.title}</div>
                {np.addedBy ? (
                  <div style={{ display: 'flex', marginTop: 8, fontSize: 26, color: C.sage }}>{vi.nowPlaying.pickedBy(np.addedBy)}</div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: 'flex', marginTop: 32, fontSize: 30, lineHeight: 1.35, color: C.sage }}>{vi.appTagline}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 'auto' }}>
              <div style={{ display: 'flex', fontSize: 26, color: C.sage, marginRight: 18, marginBottom: 10 }}>{vi.share.roomCode}</div>
              <div style={{ display: 'flex', fontFamily: display, fontSize: 64, lineHeight: 1, color: C.amber, letterSpacing: 8 }}>{code}</div>
            </div>
          </div>

          <div style={{ ...column, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', alignSelf: 'center', width: 372, height: 440, background: C.paper, borderRadius: 32 }}>
            <img src={qrSvgDataUri(url, C.dial, C.paper)} alt="" width={292} height={292} />
            <div style={{ display: 'flex', marginTop: 24, fontFamily: display, fontSize: 32, color: C.dial }}>{vi.share.scan}</div>
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
