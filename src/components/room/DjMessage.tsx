'use client';

import { Disc3, Pointer, Undo2 } from 'lucide-react';
import { Thumb } from '@/components/ui/Thumb';
import type { ChatMessageView, DjReply, MemberView } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { type Dict, errorMessage, useT } from '@/i18n';
import { showGuide } from '@/lib/guide';
import { formatClock } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';

function minutes(sec: number): number {
  return Math.max(1, Math.round(sec / 60));
}

function eta(t: Dict, sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '';
  return sec < 45 ? t.djBot.etaSoon : t.djBot.eta(minutes(sec));
}

/** The DJ's answer in the viewer's language: "bạn" for the asker, their name for others. */
export function djReplyText(t: Dict, r: DjReply, meId: string | null, me: MemberView | null): string {
  const mine = r.forMemberId === meId;
  const who = mine ? t.djBot.you : r.forName;
  const whoCap = mine ? t.djBot.youCap : r.forName;
  switch (r.kind) {
    case 'hello':
      return t.djBot.hello;
    case 'other':
      return t.djBot.other;
    case 'guide': {
      if (r.guide === 'add' && r.query) return t.djBot.guide.addQuery(r.query);
      if (r.guide === 'myItem' && !mine) return t.djBot.guide.myItemFor(r.forName);
      if (r.guide === 'skip') {
        const control = Boolean(me && (me.role === 'ADMIN' || me.canControl));
        return control ? t.djBot.guide.skipNow : t.djBot.guide.skipVote;
      }
      return t.djBot.guide[r.guide ?? 'add'];
    }
    case 'info': {
      const i = r.info;
      if (!i) return t.djBot.failed;
      switch (i.kind) {
        case 'nowPlaying':
          return i.title ? t.djBot.info.nowPlaying(i.title) : t.djBot.info.nothing;
        case 'whoPicked':
          if (!i.title) return t.djBot.info.nothing;
          return i.pickedBy ? t.djBot.info.whoPicked(i.pickedBy) : t.djBot.info.whoPickedRoom;
        case 'myNext':
          if (!i.queueItemId) return t.djBot.info.myNextNone(whoCap);
          return i.ahead === 0 ? t.djBot.info.myNextNext(who, eta(t, i.etaSec)) : t.djBot.info.myNext(i.ahead ?? 0, who, eta(t, i.etaSec));
        case 'queueLength':
          return i.count ? t.djBot.info.queueLength(i.count, i.totalSec ? minutes(i.totalSec) : null) : t.djBot.info.queueEmpty;
        case 'myCount':
          return t.djBot.info.myCount(whoCap, i.count ?? 0);
      }
      return t.djBot.failed;
    }
    case 'added': {
      const song = t.djBot.song(r.track?.title ?? '', r.fresh ?? null);
      // 0: the room was idle and the song started at once.
      if (r.position === 0) return t.djBot.addedNow(song, who);
      return t.djBot.added(song, who, r.position ? t.djBot.queuePos(r.position, eta(t, r.etaSec)) : '');
    }
    case 'busy':
      if (!r.retryAfterSec) return t.djBot.busy;
      return mine ? t.djBot.busyIn(minutes(r.retryAfterSec)) : t.djBot.busyInFor(r.forName, minutes(r.retryAfterSec));
    case 'denied':
      if (r.errorCode && r.errorCode !== 'FORBIDDEN') return errorMessage(r.errorCode, r.errorParams);
      return mine ? t.djBot.denied : t.djBot.deniedFor(r.forName);
    case 'error':
      if (r.errorCode === 'TRACK_NOT_FOUND') return t.djBot.notFound;
      return r.errorCode && r.errorCode !== 'INTERNAL' ? errorMessage(r.errorCode, r.errorParams) : t.djBot.failed;
  }
  return t.djBot.failed;
}

/** Any chat line as plain text (tickers, previews): DJ answers in the viewer's language. */
export function chatText(t: Dict, m: ChatMessageView, meId: string | null = null, me: MemberView | null = null): string {
  return m.dj ? djReplyText(t, m.dj, meId, me) : m.content;
}

/** "DJ" in the room chat: an answer to "@DJ …", with "Chỉ cho tôi" / "Gỡ bài này" when they help. */
export function DjMessage({ m }: { m: ChatMessageView }) {
  const t = useT();
  const act = useAct();
  const me = useMe();
  const meId = useRoom((s) => s.memberId);
  const r = m.dj;
  const mine = Boolean(r && r.forMemberId === meId);
  const itemId = r?.kind === 'added' ? r.queueItemId : undefined;
  const stillQueued = useRoom((s) => Boolean(itemId && s.snapshot?.queue.some((q) => q.id === itemId)));

  // An old client's view of a DJ row without its payload: the saved Vietnamese text.
  const text = r ? djReplyText(t, r, meId, me) : m.content;
  // Anyone can be shown the button (answers are public so others learn too); the asker's
  // own queue item only for the asker.
  const guide =
    r && r.kind === 'guide' && r.guide && (r.guide !== 'myItem' || mine)
      ? { target: r.guide, query: r.query, queueItemId: r.queueItemId }
      : r && mine && r.kind === 'info' && r.info?.kind === 'myNext' && r.info.queueItemId
        ? { target: 'myItem' as const, queueItemId: r.info.queueItemId }
        : null;

  return (
    <li className="chat-msg chat-dj flex flex-col items-start">
      <span className="mb-0.5 flex items-center gap-1 px-1 text-[13px] text-sage sm:text-[12px]">
        <Disc3 className="h-3.5 w-3.5 text-amber" aria-hidden />
        <span className="font-semibold text-amber">{t.djBot.name}</span>, {formatClock(m.createdAt)}
      </span>
      <div className="chat-bubble max-w-[85%] rounded-[16px] rounded-bl-[4px] border border-amber/60 bg-panel-hi px-3 py-2">
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</p>
        {r?.kind === 'added' && r.track && (
          // The title is already in the sentence: the card is for the eyes only.
          <div className="mt-2 flex items-center gap-2.5" aria-hidden>
            <Thumb url={r.track.thumbnailUrl} size={56} ratio="wide" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{r.track.title}</p>
              {r.track.channel && <p className="truncate text-[13px] text-sage sm:text-[12px]">{r.track.channel}</p>}
            </div>
          </div>
        )}
        {(guide || (mine && itemId && stillQueued)) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {guide && (
              <button
                type="button"
                onClick={() => showGuide(guide)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber/70 px-3 text-[14px] font-semibold text-amber transition-colors hover:bg-amber hover:text-amber-ink"
              >
                <Pointer className="h-4 w-4" aria-hidden />
                {t.djBot.showMe}
              </button>
            )}
            {mine && itemId && stillQueued && (
              <button
                type="button"
                onClick={() => void act('queue:remove', { queueItemId: itemId })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[14px] text-paper transition-colors hover:bg-panel"
              >
                <Undo2 className="h-4 w-4" aria-hidden />
                {t.djBot.undo}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
