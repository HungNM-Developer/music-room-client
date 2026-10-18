'use client';

import { Check, Disc3, Plus, Pointer, Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Thumb } from '@/components/ui/Thumb';
import type { ChatMessageView, DjReply, DjStep, MemberView, TrackSummary } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { type Dict, errorMessage, useT } from '@/i18n';
import { showGuide } from '@/lib/guide';
import { helpText } from './HelpButton';
import { formatClock } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';

function minutes(sec: number): number {
  return Math.max(1, Math.round(sec / 60));
}

function eta(t: Dict, sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '';
  return sec < 45 ? t.djBot.etaSoon : t.djBot.eta(minutes(sec));
}

/** One task of a combo answer, in the viewer's language. */
export function stepLine(t: Dict, s: DjStep): string {
  const st = t.djBot.steps;
  const song = t.djBot.song(s.track?.title ?? '', s.action === 'add' ? (s.fresh ?? null) : null);
  const by = s.artist ? st.by(s.artist) : '';
  const titles = (s.tracks ?? []).map((x) => `"${x.title}"`);
  if (s.ok)
    switch (s.action) {
      case 'add': {
        const wish = s.wish ? st.wish(s.wish) : '';
        if (s.position === 0) return st.addedNow(song + by) + wish;
        return st.added(song + by, s.position ? t.djBot.queuePos(s.position, eta(t, s.etaSec)) : '') + wish;
      }
      case 'suggest':
        return `${st.suggested(by)} ${titles.join(', ')}`;
      case 'save':
        if (!s.track && s.added) return st.savedMany(s.added);
        return st.saved(song);
      case 'playlistSave':
        if (!s.track && s.added) return st.playlistSavedMany(s.added, s.playlist?.name ?? '', Boolean(s.playlist?.created));
        return st.playlistSaved(song, s.playlist?.name ?? '', Boolean(s.playlist?.created));
      case 'playlistCreate':
        return st.playlistCreated(s.playlist?.name ?? '', Boolean(s.playlist?.created), s.added ?? 0, by);
      case 'playlistPlay':
        return st.playlistPlayed(s.added ?? 0, s.total ?? 0, s.playlist?.name ?? '');
      case 'heart':
        if (s.reason === 'alreadyHearted') return st.alreadyHearted(song);
        return st.hearted(song) + (s.reason === 'oneHeart' ? st.oneHeart : '');
      case 'remove':
        if (s.reason === 'kept')
          return (
            `${st.kept(titles.length, by)}: ${titles.slice(0, 5).join(', ')}${titles.length > 5 ? ` +${titles.length - 5}` : ''}` +
            (s.unsure ? st.keptUnsure(s.unsure) : '')
          );
        return st.removed(song);
      case 'pin':
        return s.now ? st.pinnedNow(song) : st.pinned(song);
      case 'skip':
        return st.skipped(song);
      case 'vote':
        return st.voted(song);
      case 'pause':
        return st.paused;
      case 'resume':
        return st.resumed;
    }
  switch (s.reason) {
    case 'notFound':
      if (s.action === 'playlistPlay') return st.playlistEmpty(s.playlist?.name ?? '');
      if (s.got !== undefined) return st.short(s.got, s.wanted ?? s.got);
      return s.query ? st.notFound(s.query) : st.noneFound;
    case 'busy':
      return st.busy;
    case 'nothingPlaying':
      return st.nothingPlaying;
    case 'notMine':
      return st.notMine;
    case 'ownSong':
      return st.ownSong(song);
    case 'tooMany':
      return st.tooMany(s.got ?? 0, s.wanted ?? 0);
    case 'needSignIn':
      return st.needSignIn;
    case 'noPlaylist':
      return st.noPlaylist(s.query ?? '');
  }
  const why =
    s.errorCode === 'FORBIDDEN'
      ? s.action === 'remove'
        ? st.notMine
        : st.needControl
      : s.errorCode && s.errorCode !== 'INTERNAL'
        ? errorMessage(s.errorCode, s.errorParams)
        : t.djBot.failed;
  // Pause / resume are about the room, not a song.
  const what = s.action === 'pause' || s.action === 'resume' ? '' : s.track ? ` "${s.track.title}"` : s.query ? ` "${s.query}"` : '';
  return st.failed(s.action === 'pin' && s.now ? st.verbs.skipTo : st.verbs[s.action], what, why);
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
    case 'done':
      return [t.djBot.done(who), ...(r.steps ?? []).map((s) => `- ${stepLine(t, s)}`)].join('\n');
    case 'guide': {
      if (r.guide === 'add' && r.query) return t.djBot.guide.addQuery(r.query);
      if (r.guide === 'myItem' && !mine) return t.djBot.guide.myItemFor(r.forName);
      if (r.guide === 'skip') {
        const control = Boolean(me && (me.role === 'ADMIN' || me.canControl));
        return control ? t.djBot.guide.skipNow : t.djBot.guide.skipVote;
      }
      const g = r.guide ?? 'add';
      if (g in t.djBot.guide) return t.djBot.guide[g as keyof Dict['djBot']['guide']] as string;
      // How-to topics: the "Hướng dẫn" item's own words.
      return helpText(t, g)?.body ?? t.djBot.other;
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
        case 'nextSong':
          return i.title ? t.djBot.info.nextSong(i.title, i.pickedBy ?? null, eta(t, i.etaSec)) : t.djBot.info.queueEmpty;
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
    case 'chat':
      return r.chatReply ?? t.djBot.other;
    case 'clarify': {
      const q = t.djBot.clarify[r.clarify?.about ?? 'whichSong'];
      const options = r.clarify?.options ?? [];
      return options.length ? `${q} ${options.map((o) => `"${o}"`).join(', ')}` : q;
    }
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
        {r?.kind === 'done' ? (
          <>
            <p className="[overflow-wrap:anywhere]">{t.djBot.done(mine ? t.djBot.you : r.forName)}</p>
            <ul className="mt-1.5 space-y-2">
              {(r.steps ?? []).map((s, i) => (
                <DoneStep key={i} step={s} mine={mine} />
              ))}
            </ul>
            {mine && <UndoRemove steps={r.steps ?? []} />}
          </>
        ) : (
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</p>
        )}
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

/** A task of a combo: done or not (and why); an added song with its card and "Gỡ" for the asker. */
function DoneStep({ step, mine }: { step: DjStep; mine: boolean }) {
  const t = useT();
  const act = useAct();
  const itemId = step.ok && step.action === 'add' ? step.queueItemId : undefined;
  const stillQueued = useRoom((s) => Boolean(itemId && s.snapshot?.queue.some((q) => q.id === itemId)));
  const Icon = step.ok ? Check : X;
  return (
    <li className="text-[14px] leading-snug">
      <p className="flex gap-1.5 [overflow-wrap:anywhere]">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${step.ok ? 'text-amber' : 'text-sage'}`} aria-hidden />
        <span className="min-w-0">
          {/* Suggestions: the cards below carry the titles. */}
          {step.ok && step.action === 'suggest'
            ? t.djBot.steps.suggested(step.artist ? t.djBot.steps.by(step.artist) : '')
            : stepLine(t, step)}
        </span>
      </p>
      {step.ok && step.action === 'suggest' && step.tracks?.length ? (
        <ul className="mt-1.5 space-y-1.5 pl-5">
          {step.tracks.map((tr) => (
            <SuggestCard key={tr.id} track={tr} />
          ))}
        </ul>
      ) : null}
      {itemId && step.track && (
        <div className="mt-1.5 flex items-center gap-2 pl-5">
          <Thumb url={step.track.thumbnailUrl} size={48} ratio="wide" />
          <span className="min-w-0 flex-1 truncate text-[13px] text-sage sm:text-[12px]" aria-hidden>
            {step.track.channel ?? step.track.title}
          </span>
          {mine && stillQueued && (
            <button
              type="button"
              onClick={() => void act('queue:remove', { queueItemId: itemId })}
              aria-label={`${t.djBot.undo}: ${step.track.title}`}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-line px-2.5 text-[13px] text-paper transition-colors hover:bg-panel"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              {t.djBot.undoShort}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** A suggested song: anyone can add it, with their own rights. */
function SuggestCard({ track }: { track: TrackSummary }) {
  const t = useT();
  const act = useAct();
  const inRoom = useRoom((s) =>
    Boolean(
      s.snapshot &&
        (s.snapshot.nowPlaying?.item.track.externalId === track.externalId ||
          s.snapshot.queue.some((q) => q.track.externalId === track.externalId)),
    ),
  );
  return (
    <li className="flex items-center gap-2">
      <Thumb url={track.thumbnailUrl} size={48} ratio="wide" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-snug">{track.title}</p>
        {track.channel && <p className="truncate text-[12px] text-sage">{track.channel}</p>}
      </div>
      <button
        type="button"
        disabled={inRoom}
        onClick={() => void act('queue:add', { input: `https://www.youtube.com/watch?v=${track.externalId}` })}
        aria-label={`${inRoom ? t.djBot.steps.alreadyIn : t.djBot.steps.addOne}: ${track.title}`}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-amber/70 px-2.5 text-[13px] font-semibold text-amber transition-colors hover:bg-amber hover:text-amber-ink disabled:border-line disabled:text-sage disabled:hover:bg-transparent"
      >
        {inRoom ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
        {inRoom ? t.djBot.steps.alreadyIn : t.djBot.steps.addOne}
      </button>
    </li>
  );
}

/** How long the dots wait for the DJ's answer (an AI call takes a few seconds). */
const THINKING_MS = 45_000;
const MENTION = /(^|[\s([{"'“])@dj(?=$|[\s,.:;!?)\]}"'”])/i;

/**
 * "@DJ …" messages the DJ has not answered yet, from the chat everyone sees: the latest
 * request of each member until a DJ message for them arrives (or THINKING_MS pass).
 */
export function useDjThinking(): { memberId: string; name: string; at: string }[] {
  const chat = useRoom((s) => s.chat);
  const offset = useRoom((s) => s.offset);
  const [now, setNow] = useState(() => Date.now());
  const waiting = new Map<string, { memberId: string; name: string; at: string }>();
  for (const m of chat) {
    if (m.kind === 'dj') {
      if (m.dj) waiting.delete(m.dj.forMemberId);
    } else if (MENTION.test(m.content)) waiting.set(m.memberId, { memberId: m.memberId, name: m.displayName, at: m.createdAt });
  }
  const serverNow = now + offset;
  const open = [...waiting.values()].filter((w) => serverNow - Date.parse(w.at) < THINKING_MS);
  const oldest = open.length ? Math.min(...open.map((w) => Date.parse(w.at))) : null;
  // Re-check once the oldest request runs out of time (the answer usually comes first).
  useEffect(() => {
    if (oldest === null) return;
    const id = setTimeout(() => setNow(Date.now()), Math.max(500, oldest + THINKING_MS - (Date.now() + offset)));
    return () => clearTimeout(id);
  }, [oldest, offset, chat.length]);
  return open;
}

/** The DJ's bubble with three rising dots while it works on someone's request. */
export function DjThinking({ memberId, name }: { memberId: string; name: string }) {
  const t = useT();
  const meId = useRoom((s) => s.memberId);
  const who = memberId === meId ? t.djBot.you : name;
  return (
    <li className="chat-msg chat-dj flex flex-col items-start" role="status" aria-label={t.djBot.thinking(who)}>
      <span className="mb-0.5 flex items-center gap-1 px-1 text-[13px] text-sage sm:text-[12px]" aria-hidden>
        <Disc3 className="h-3.5 w-3.5 animate-spin text-amber [animation-duration:2.4s]" />
        <span className="font-semibold text-amber">{t.djBot.name}</span>
      </span>
      <div className="chat-bubble rounded-[16px] rounded-bl-[4px] border border-amber/60 bg-panel-hi px-3 py-2" aria-hidden>
        <span className="dj-dots flex h-5 items-center gap-1 text-amber">
          <span />
          <span />
          <span />
        </span>
      </div>
    </li>
  );
}

/**
 * The DJ removed songs for the asker: one button puts the ones not back yet into the queue
 * (at the end, the room's usual rules apply). Gone once they are all back.
 */
function UndoRemove({ steps }: { steps: DjStep[] }) {
  const t = useT();
  const act = useAct();
  const removed = steps.filter((s) => s.ok && s.action === 'remove' && s.reason !== 'kept' && s.track).map((s) => s.track!);
  const back = useRoom((st) => {
    const q = st.snapshot;
    const ids = new Set([...(q?.queue ?? []).map((x) => x.track.id), q?.nowPlaying?.item.track.id]);
    return removed.filter((tr) => !ids.has(tr.id)).map((tr) => tr.id).join(',');
  });
  if (!back) return null;
  const trackIds = back.split(',');
  return (
    <button
      type="button"
      onClick={() => void act('queue:add-many', { trackIds })}
      className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[14px] text-paper transition-colors hover:bg-panel"
    >
      <Undo2 className="h-4 w-4" aria-hidden />
      {t.djBot.undoRemove(trackIds.length)}
    </button>
  );
}
