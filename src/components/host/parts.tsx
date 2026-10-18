'use client';

import { Headphones, Palette, Speaker } from 'lucide-react';
import dynamic from 'next/dynamic';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import type { ChatMessageView, MemberView } from '@/contracts';
import { Button, IconButton } from '@/components/ui/Button';
import { LangSwitch } from '@/components/ui/LangSwitch';
import { OnAirLamp } from '@/components/ui/OnAirLamp';
import { PlayerCover } from '@/components/player/PlayerCover';
import { useT } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { readableInk } from '@/lib/readable-ink';
import { chatText } from '@/components/room/DjMessage';
import { formatClock } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { useHost } from './HostContext';

const ThemeDialog = dynamic(() => import('@/themes/ThemePicker').then((m) => m.ThemeDialog), { ssr: false });

const PlayerEngine = dynamic(() => import('@/components/player/PlayerEngine').then((m) => m.PlayerEngine), {
  ssr: false,
  loading: () => <div className="aspect-video w-full rounded-panel bg-dial-deep" />,
});

/** The video, or the "play on this device" card once the sound moved elsewhere. Only HostScreen renders it. */
export function HostVideo() {
  const t = useT();
  const { volume } = useHost();
  const playerRevoked = useRoom((s) => s.playerRevoked);
  if (playerRevoked) {
    return (
      <div className="host-revoked relative aspect-video w-full overflow-hidden rounded-panel">
        <PlayerCover icon={<Speaker />} title={playerRevoked === 'permission' ? t.host.movedByAdmin : t.host.replaced} note={t.host.autoReturn}>
          <Button size="sm" variant="primary" onClick={() => room.clearPlayerRevoked()} className="pc-primary">
            {t.host.takeBack}
          </Button>
        </PlayerCover>
      </div>
    );
  }
  return <PlayerEngine volume={volume} />;
}

/** ON AIR / paused / waiting: the same words in every theme. */
export function HostLamp({ className = '' }: { className?: string }) {
  const t = useT();
  const { np, live } = useHost();
  return (
    <OnAirLamp live={live} className={`host-lamp ${className}`}>
      {live ? t.host.onAir : np ? t.nowPlaying.paused : t.host.waiting}
    </OnAirLamp>
  );
}

export function HostTitle({ className = '' }: { className?: string }) {
  const t = useT();
  const { np } = useHost();
  return (
    <h1 className={`host-title line-clamp-2 [overflow-wrap:anywhere] [unicode-bidi:plaintext] ${className}`}>
      {np ? np.item.track.title : t.host.idle}
    </h1>
  );
}

/** "Artist · Picked by …"; nothing when no song is on. */
export function HostMeta({ show = ['artist', 'picker'], className = '' }: { show?: ('artist' | 'picker')[]; className?: string }) {
  const t = useT();
  const { np, artist, picker } = useHost();
  if (!np) return null;
  const parts = [
    show.includes('artist') ? artist : null,
    show.includes('picker') ? (picker ? t.nowPlaying.pickedBy(picker) : addedByLabel(np.item)) : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className={`host-meta truncate [unicode-bidi:plaintext] ${className}`}>{parts.join(' · ')}</p>;
}

/** The picker's wish; nothing without one. */
export function HostWish({ withFrom = false, className = '' }: { withFrom?: boolean; className?: string }) {
  const t = useT();
  const { np, picker } = useHost();
  const wish = np?.item.wishMessage;
  if (!wish || !picker) return null;
  return (
    <figure className={`host-wish ${className}`}>
      {withFrom && <figcaption className="host-wish-from">{t.nowPlaying.wishFrom(picker)}</figcaption>}
      <blockquote className="line-clamp-2 [overflow-wrap:anywhere]">{wish}</blockquote>
    </figure>
  );
}

/**
 * The join QR, drawn at 512 and sized by its box. Themed screens: always dark on white with a
 * quiet zone, so every phone camera reads it.
 */
export function HostQr({ className = '' }: { className?: string }) {
  const { joinUrl, theme } = useHost();
  const style = { width: '100%', height: 'auto', display: 'block' } as const;
  return (
    <div className={`host-qr-code aspect-square ${className}`}>
      {joinUrl &&
        (theme === 'default' ? (
          <QRCodeSVG value={joinUrl} size={512} fgColor="#0f2a26" bgColor="#f3ecdd" marginSize={0} title={joinUrl} style={style} />
        ) : (
          <QRCodeSVG value={joinUrl} size={512} fgColor="#111111" bgColor="#ffffff" marginSize={2} title={joinUrl} style={style} />
        ))}
    </div>
  );
}

export function HostCode({ className = '' }: { className?: string }) {
  const { code } = useHost();
  return <p className={`host-code leading-none ${className}`}>{code}</p>;
}

export function HostLink({ className = '' }: { className?: string }) {
  const { joinUrl } = useHost();
  return <p className={`host-link [overflow-wrap:anywhere] ${className}`}>{joinUrl}</p>;
}

export function HostNextEmpty({ className = '' }: { className?: string }) {
  const t = useT();
  return <p className={`host-next-empty ${className}`}>{t.host.nextEmpty}</p>;
}

export function useHostChat(n: number): ChatMessageView[] {
  const chat = useRoom((s) => s.chat);
  return chat.slice(-n);
}

/** The latest chat lines: sender + message. */
export function HostChatLines({ n, showTime = false, className = '' }: { n: number; showTime?: boolean; className?: string }) {
  const t = useT();
  const recent = useHostChat(n);
  return (
    <section aria-label={t.chat.title} className={`host-chat ${className}`}>
      {recent.length === 0 ? (
        <p className="host-chat-empty">{t.chat.hostEmpty}</p>
      ) : (
        <ol aria-live="polite">
          {recent.map((m) => (
            <li key={m.id} className="line-clamp-2 [overflow-wrap:anywhere]">
              <b className="host-chat-name">{m.kind === 'dj' ? t.djBot.name : m.displayName}</b>
              {showTime && <span className="host-chat-time"> {formatClock(m.createdAt)}</span>}{' '}
              {chatText(t, m)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Volume, language and theme: small, but on every theme. */
export function HostControls({ className = '' }: { className?: string }) {
  const t = useT();
  const { volume, setVolume } = useHost();
  const [themeOpen, setThemeOpen] = useState(false);
  return (
    <div className={`host-controls flex flex-wrap items-center gap-x-6 gap-y-3 ${className}`}>
      <label className="host-volume flex w-full max-w-sm items-center gap-3 text-[14px] text-sage">
        {t.host.volume}
        <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="min-w-0 flex-1" />
        <span className="w-10 text-right tabular-nums">{t.host.volumeValue(volume)}</span>
      </label>
      <LangSwitch compact />
      <IconButton label={t.theme.button} onClick={() => setThemeOpen(true)}>
        <Palette className="h-5 w-5" aria-hidden />
      </IconButton>
      {themeOpen && <ThemeDialog onClose={() => setThemeOpen(false)} />}
    </div>
  );
}

/** People listening along right now (online, listen-along on). */
export function useListeners(): MemberView[] {
  const members = useRoom((s) => s.snapshot?.members);
  return (members ?? []).filter((m) => m.listening && m.online);
}

/** Who listens along: round initials + "N đang nghe cùng". Sized by the theme (`--u`); nothing when nobody. */
export function HostListeners({ max = 5, className = '' }: { max?: number; className?: string }) {
  const t = useT();
  const me = useMe();
  const people = useListeners();
  if (!people.length) return null;
  const shown = people.slice(0, max);
  return (
    <div className={`host-listeners ${className}`}>
      <span className="host-faces" aria-hidden>
        {shown.map((m) => (
          <i key={m.id} style={{ backgroundColor: m.color, color: readableInk(m.color) }} title={m.displayName}>
            {m.displayName.trim().slice(0, 1).toUpperCase()}
          </i>
        ))}
        {people.length > shown.length && <b>+{people.length - shown.length}</b>}
      </span>
      <span className="host-listeners-text">
        <Headphones aria-hidden />
        {people.length === 1 && people[0].id === me?.id ? t.listen.onlyYou : t.listen.count(people.length)}
      </span>
    </div>
  );
}
