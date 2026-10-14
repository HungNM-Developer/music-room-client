'use client';

import { Check, Copy, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { OnAirLamp } from '@/components/ui/OnAirLamp';
import { useToast } from '@/components/ui/Toast';
import { vi } from '@/i18n/vi';
import { ytThumbLarge } from '@/lib/thumbs';
import { useRoom } from '@/state/hooks';

/** Invite card: the song on air over its artwork, a QR to scan, and ways to send the link. */
export function ShareDialog({ onClose }: { onClose: () => void }) {
  const code = useRoom((s) => s.snapshot?.room.code ?? s.code ?? '');
  const name = useRoom((s) => s.snapshot?.room.name ?? '');
  const np = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/r/${code}`;
  const art = ytThumbLarge(np?.item.track.thumbnailUrl);
  const canShare = typeof navigator.share === 'function';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(vi.share.copied, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(url);
    }
  }

  return (
    <Dialog open onClose={onClose} title={vi.share.title} description={name}>
      <div className="space-y-4">
        <div className="relative isolate overflow-hidden rounded-panel border border-line bg-dial-deep">
          {art && (
            // eslint-disable-next-line @next/next/no-img-element -- remote YouTube artwork
            <img src={art} alt="" className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-50 blur-[2px]" />
          )}
          <div className="absolute inset-0 -z-10 bg-linear-to-b from-dial/40 via-dial/80 to-dial" />
          <div className="p-4">
            {np ? (
              <>
                <OnAirLamp live={np.status === 'PLAYING'}>{np.status === 'PLAYING' ? vi.nowPlaying.live : vi.nowPlaying.paused}</OnAirLamp>
                <p className="type-display mt-2 line-clamp-2 text-[20px] font-bold leading-tight [unicode-bidi:plaintext]">{np.item.track.title}</p>
                {np.item.addedBy && <p className="mt-0.5 text-[13px] text-sage">{vi.nowPlaying.pickedBy(np.item.addedBy.displayName)}</p>}
              </>
            ) : (
              <p className="text-sage">{vi.share.idle}</p>
            )}
            <div className="mx-auto mt-4 w-fit rounded-panel bg-paper p-4 text-center text-dial">
              <QRCodeSVG value={url} size={176} fgColor="#0f2a26" bgColor="#f3ecdd" marginSize={0} title={url} />
              <p className="type-display mt-3 text-[15px] font-bold">{vi.share.scan}</p>
            </div>
            <p className="mt-3 text-center">
              <span className="text-[13px] text-sage">{vi.share.roomCode} </span>
              <span className="type-display text-[26px] font-extrabold tracking-[0.14em] text-amber">{code}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <label className="sr-only" htmlFor="share-link">
            {vi.share.link}
          </label>
          <input id="share-link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 text-[14px] text-sage" />
          <Button variant="primary" onClick={copy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {vi.share.copy}
          </Button>
        </div>

        <div className="flex gap-2">
          {canShare && (
            <Button
              className="flex-1"
              onClick={() => navigator.share({ title: name, text: vi.share.metaDesc(np?.item.track.title ?? null), url }).catch(() => undefined)}
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {vi.share.native}
            </Button>
          )}
          <a href={`/r/${code}/share-image`} download={`music-room-${code}.png`} className={buttonClass('secondary', 'md', 'flex-1')}>
            <Download className="h-4 w-4" aria-hidden />
            {vi.share.download}
          </a>
        </div>
      </div>
    </Dialog>
  );
}
