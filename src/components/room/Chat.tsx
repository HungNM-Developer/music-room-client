'use client';

import { ChevronDown, ChevronUp, Disc3, MessageCircle, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import type { ChatMessageView } from '@/contracts';
import { LIMITS, REACTIONS } from '@/contracts/constants';
import { useAct } from '@/hooks/useAct';
import { DjMentionHint, insertMention, mentionAt } from './DjMentionHint';
import { chatText, DjMessage } from './DjMessage';
import { triggerReaction } from './HeartCanvas';
import { errorMessage, useT } from '@/i18n';
import { onGuide } from '@/lib/guide';
import { formatClock } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { type PendingChat, room } from '@/state/room-store';
import type { Dict } from '@/i18n';

const DjPads = dynamic(() => import('./DjPads').then((m) => m.DjPads), { ssr: false });

/**
 * Message list that follows new messages only while the reader is at the bottom,
 * so scrolling back through history is never yanked away.
 */
function ChatMessages({ className = '' }: { className?: string }) {
  const t = useT();
  const chat = useRoom((s) => s.chat);
  const chatPending = useRoom((s) => s.chatPending);
  const meId = useRoom((s) => s.memberId);
  const ref = useRef<HTMLOListElement>(null);
  const atBottom = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [chat.length, chatPending.length]);

  return (
    <ol
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      }}
      className={`space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3 ${className}`}
      aria-live="polite"
    >
      {chat.length === 0 && chatPending.length === 0 && <li className="py-8 text-center text-sage">{t.chat.empty}</li>}
      {chat.map((m) => (m.kind === 'dj' ? <DjMessage key={m.id} m={m} /> : <Bubble key={m.id} m={m} mine={m.memberId === meId} />))}
      {chatPending.map((m) => (
        <PendingBubble key={m.id} m={m} />
      ))}
    </ol>
  );
}

const MENTION = /(^|[\s([{"'“])(@dj)(?=$|[\s,.:;!?)\]}"'”])/gi;

/** "@DJ" stands out in a member's message (the same word the server listens for). */
function withMentions(content: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of content.matchAll(MENTION)) {
    const at = (m.index ?? 0) + m[1].length;
    parts.push(content.slice(last, at), <b key={at}>{m[2]}</b>);
    last = at + m[2].length;
  }
  if (!parts.length) return content;
  parts.push(content.slice(last));
  return parts;
}

function Bubble({ m, mine }: { m: ChatMessageView; mine: boolean }) {
  return (
    <li data-mine={mine || undefined} className={`chat-msg flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <span className="mb-0.5 px-1 text-[13px] sm:text-[12px] text-sage">{mine ? formatClock(m.createdAt) : `${m.displayName}, ${formatClock(m.createdAt)}`}</span>
      <p
        className={`chat-bubble max-w-[85%] whitespace-pre-wrap rounded-[16px] px-3 py-2 [overflow-wrap:anywhere] ${
          mine ? 'rounded-br-[4px] bg-amber text-amber-ink' : 'rounded-bl-[4px] bg-panel-hi'
        }`}
      >
        {withMentions(m.content)}
      </p>
    </li>
  );
}

/** My message before the server confirmed it: dimmed while sending, "Gửi lại" if it failed. */
function PendingBubble({ m }: { m: PendingChat }) {
  const t = useT();
  return (
    <li className="flex flex-col items-end" aria-busy={!m.failed}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-[16px] rounded-br-[4px] px-3 py-2 [overflow-wrap:anywhere] ${
          m.failed ? 'border border-onair/60 bg-onair/15' : 'bg-amber/70 text-amber-ink'
        }`}
      >
        {withMentions(m.content)}
      </p>
      {m.failed ? (
        <span className="mt-0.5 flex max-w-[85%] flex-wrap items-center justify-end gap-x-2 px-1 text-right text-[13px] sm:text-[12px] text-alert">
          {m.error ? errorMessage(m.error.code, m.error.params) : t.chat.failed}
          <button type="button" className="font-semibold text-amber hover:underline" onClick={() => void room.sendChat(m.content, m.id)}>
            {t.chat.retry}
          </button>
          <button type="button" className="text-sage hover:underline" onClick={() => room.discardChat(m.id)}>
            {t.chat.discard}
          </button>
        </span>
      ) : (
        <span className="mt-0.5 px-1 text-[13px] sm:text-[12px] text-sage">{t.chat.sending}</span>
      )}
    </li>
  );
}

/**
 * Quick reactions: float up on every screen in the room and on the speaker. Mine float
 * at once (the server's echo of my own reaction is ignored by the room page).
 */
function ReactionRow() {
  const t = useT();
  const act = useAct();
  return (
    <div role="group" aria-label={t.chat.reactions} data-guide="reactions" className="flex min-w-0 flex-1 justify-between">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={t.chat.react(emoji)}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            triggerReaction(r.left + r.width / 2, r.top, emoji);
            void act('room:reaction', { emoji }, { silent: true });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[20px] transition-transform hover:scale-110 hover:bg-panel-hi active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ChatComposer({ inputRef, placeholder }: { inputRef: React.RefObject<HTMLInputElement | null>; placeholder?: string }) {
  const t = useT();
  placeholder ??= t.chat.placeholder;
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [hintOff, setHintOff] = useState(false);
  const id = useId();
  const hintId = useId();
  const optionId = useId();
  const hint = !hintOff && mentionAt(text, caret) !== null;

  const pick = () => {
    const el = inputRef.current;
    const next = insertMention(text, el?.selectionStart ?? caret);
    setText(next.text);
    setCaret(next.caret);
    requestAnimationFrame(() => el?.setSelectionRange(next.caret, next.caret));
  };

  /** Optimistic: the box clears and the message shows at once ("Đang gửi…"). */
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText('');
    setCaret(0);
    // Failures (rate limit, network) are explained under the bubble, next to "Gửi lại".
    void room.sendChat(content);
  }

  return (
    <form onSubmit={submit} className="relative flex gap-2">
      {hint && <DjMentionHint id={hintId} optionId={optionId} onPick={pick} />}
      <label className="sr-only" htmlFor={id}>
        {t.chat.label}
      </label>
      <input
        ref={inputRef}
        id={id}
        data-guide="djMention"
        value={text}
        maxLength={LIMITS.chat}
        onChange={(e) => {
          setText(e.target.value);
          setCaret(e.target.selectionStart ?? e.target.value.length);
          setHintOff(false);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onBlur={() => setHintOff(true)}
        onFocus={() => setHintOff(false)}
        onKeyDown={(e) => {
          if (!hint) return;
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            pick();
          } else if (e.key === 'Escape') {
            // Closes the list only, not the chat window.
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            setHintOff(true);
          }
        }}
        role="combobox"
        aria-expanded={hint}
        aria-controls={hint ? hintId : undefined}
        aria-activedescendant={hint ? optionId : undefined}
        aria-autocomplete="list"
        placeholder={placeholder}
        className="field min-w-0 flex-1 !min-h-11 rounded-full"
        autoComplete="off"
        enterKeyHint="send"
      />
      <Button type="submit" variant="primary" aria-label={t.chat.send} disabled={!text.trim()} className="!min-h-11 w-11 shrink-0 rounded-full !px-0">
        <Send className="h-[18px] w-[18px]" aria-hidden />
      </Button>
    </form>
  );
}

/**
 * Phones: the chat bubble steps aside while the page scrolls down (it would sit on the
 * "+ Thêm" buttons at the right edge of lists) and comes back on scrolling up or at the end.
 */
function useTuckOnScroll(): boolean {
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 24;
      if (y < 80 || atEnd || y < last - 4) setTucked(false);
      else if (y > last + 4) setTucked(true);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return tucked;
}

/**
 * Facebook-style chat. Desktop (≥1024 px): a bar docked to the bottom edge that opens
 * a window docked to the same edge. Phones/tablets: a chat bubble above the tab bar
 * (with a short preview of new messages) that opens a sheet / floating window.
 * Quick reactions and the DJ keys live in the window's toolbar.
 */
/** How a theme dresses the chat: its own heading / placeholder and a CSS hook. */
export interface InlineChatSkin {
  /** Read from the dictionary at render time, so they follow the device language. */
  title?: (t: Dict) => string;
  placeholder?: (t: Dict) => string;
  variant?: string;
}

export function ChatOverlay({ title, placeholder, variant }: InlineChatSkin = {}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [djOpen, setDjOpen] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const last = useRoom((s) => s.chat[s.chat.length - 1] ?? null);
  const chatLength = useRoom((s) => s.chat.length);
  const unread = useRoom((s) => s.chatUnread);
  const roomName = useRoom((s) => s.snapshot?.room.name);
  const me = useMe();
  const canDj = Boolean(me && (me.canDj || me.role === 'ADMIN'));
  const inputRef = useRef<HTMLInputElement>(null);
  const headRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const windowId = useId();
  const titleId = useId();
  const tucked = useTuckOnScroll() && !open;

  const minimize = () => {
    restoreFocus.current = true;
    setOpen(false);
  };
  // After minimising, focus whichever launcher is on screen (the desktop bar only
  // exists again once this render has committed).
  useEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    // offsetParent is always null for position:fixed, so test for rendered boxes instead.
    (barRef.current?.getClientRects().length ? barRef : headRef).current?.focus();
  }, [open]);

  // "Chỉ cho tôi": the sheet steps aside so the lit button can be seen.
  useEffect(() => onGuide(() => setOpen(false)), []);

  // Read while open.
  useEffect(() => {
    if (open) room.markChatRead();
  }, [open, chatLength]);

  // A new message from someone else pops a preview next to the bubble for a few seconds.
  const preview = !open && unread > 0 && last && last.memberId !== me?.id && last.id !== dismissedId ? last : null;
  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setDismissedId(preview.id), 5000);
    return () => clearTimeout(t);
  }, [preview]);

  // Esc minimises; a mouse user gets the cursor in the input (phones keep the keyboard down).
  useEffect(() => {
    if (!open) return;
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') minimize();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const badge = unread > 0 && (
    <span className="min-w-[22px] rounded-full bg-onair px-1.5 text-center text-[11px] font-bold leading-[20px] text-paper tabular-nums">
      {unread > 99 ? '99+' : unread}
    </span>
  );

  return (
    <>
      {open && (
        <section
          id={windowId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          data-variant={variant}
          className={[
            'chat-window fixed z-50 flex animate-rise flex-col border border-line bg-dial-deep shadow-[0_-16px_48px_-12px_rgb(0_0_0/0.7)]',
            // phones: tall sheet from the bottom edge
            'inset-x-0 bottom-0 h-[min(85dvh,640px)] rounded-t-panel border-b-0',
            // tablets: floating window above the chat bubble
            'sm:inset-x-auto sm:right-4 sm:bottom-[calc(57px+5.25rem+env(safe-area-inset-bottom))] sm:h-[min(70dvh,560px)] sm:w-[380px] sm:rounded-panel sm:border-b',
            // desktop: Facebook-style window docked to the bottom edge
            'lg:bottom-0 lg:right-6 lg:h-[min(72dvh,560px)] lg:w-[360px] lg:rounded-b-none lg:rounded-t-panel lg:border-b-0',
          ].join(' ')}
        >
          <header className="flex items-center gap-3 border-b border-line py-2 pl-4 pr-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-amber-ink" aria-hidden>
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} aria-label={t.chat.title} className="type-display text-[18px] font-bold leading-tight">
                {title?.(t) ?? t.chat.title}
              </h2>
              {roomName && <p className="truncate text-[13px] sm:text-[12px] text-sage">{roomName}</p>}
            </div>
            <IconButton label={t.chat.minimize} onClick={minimize}>
              <ChevronDown className="h-5 w-5" aria-hidden />
            </IconButton>
          </header>

          <ChatMessages className="min-h-0 flex-1" />

          <div className="space-y-2 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <ReactionRow />
              {canDj && (
                <button
                  type="button"
                  aria-pressed={djOpen}
                  data-guide="djPads"
                  aria-label={t.chat.djToggle}
                  title={t.chat.djToggle}
                  onClick={() => setDjOpen((v) => !v)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    djOpen ? 'border-amber bg-amber text-amber-ink' : 'border-line text-sage hover:text-paper'
                  }`}
                >
                  <Disc3 className={`h-5 w-5 ${djOpen ? 'motion-safe:animate-spin [animation-duration:3s]' : ''}`} aria-hidden />
                </button>
              )}
            </div>
            {canDj && djOpen && <DjPads />}
            <ChatComposer inputRef={inputRef} placeholder={placeholder?.(t)} />
          </div>
        </section>
      )}

      {/* Desktop launcher: a bar docked to the bottom edge, like Facebook chat. */}
      {!open && (
        <button
          ref={barRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={windowId}
          aria-label={`${t.chat.open}${unread ? `, ${t.chat.unread(unread)}` : ''}`}
          className={`fixed bottom-0 right-6 z-40 hidden h-12 w-[360px] items-center gap-3 rounded-t-panel border border-b-0 bg-panel px-4 text-left shadow-[0_-12px_32px_-12px_rgb(0_0_0/0.6)] transition-colors hover:bg-panel-hi lg:flex ${
            unread > 0 ? 'border-amber/70' : 'border-line'
          }`}
        >
          <MessageCircle className="h-5 w-5 shrink-0 text-amber" aria-hidden />
          <span className="type-display shrink-0 text-[16px] font-bold">{t.chat.title}</span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-sage">
            {last && `${last.memberId === me?.id ? t.chat.you : last.displayName}: ${chatText(t, last, me?.id ?? null, me)}`}
          </span>
          {badge}
          <ChevronUp className="h-4 w-4 shrink-0 text-sage" aria-hidden />
        </button>
      )}

      {/* Phone / tablet launcher: a chat bubble above the tab bar, with a short preview. */}
      <div
        className={`fixed bottom-[calc(57px+1rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-end gap-2 transition-[transform,opacity] duration-200 motion-reduce:transition-none lg:hidden ${
          tucked ? 'pointer-events-none translate-x-[calc(100%+1rem)] opacity-0' : ''
        }`}
      >
        {preview && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mb-1 max-w-[240px] animate-rise rounded-[16px] rounded-br-[4px] border border-line bg-panel px-3 py-2 text-left text-[14px] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)]"
          >
            <span className="block text-[13px] sm:text-[12px] text-sage">{preview.displayName}</span>
            <span className="line-clamp-2 [overflow-wrap:anywhere]">{chatText(t, preview, me?.id ?? null, me)}</span>
          </button>
        )}
        <button
          ref={headRef}
          type="button"
          data-guide="chat"
          onClick={() => (open ? minimize() : setOpen(true))}
          aria-expanded={open}
          aria-controls={windowId}
          aria-label={open ? t.chat.minimize : `${t.chat.open}${unread ? `, ${t.chat.unread(unread)}` : ''}`}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-[0_12px_32px_-8px_rgb(0_0_0/0.7)] transition-transform hover:scale-105 active:scale-95 ${
            open ? 'bg-panel-hi text-paper max-sm:hidden' : 'bg-amber text-amber-ink'
          }`}
        >
          {open ? <ChevronDown className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}
          {!open && unread > 0 && <span className="absolute -right-1 -top-1 rounded-full border-2 border-dial">{badge}</span>}
        </button>
      </div>
    </>
  );
}

/** Speaker screen: the last few messages, large enough to read across the office. */
/**
 * Desktop (≥1024 px): the chat always open in the side column, like the speaker page.
 * Seen on screen = read. Phones keep the floating chat (ChatOverlay).
 */
export function InlineChat({ title, placeholder, variant }: InlineChatSkin = {}) {
  const t = useT();
  const me = useMe();
  const canDj = Boolean(me && (me.canDj || me.role === 'ADMIN'));
  const chatLength = useRoom((s) => s.chat.length);
  const [djOpen, setDjOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLElement>(null);

  // Hidden below 1024 px (display: none never intersects), so phones keep their unread count.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (visible) room.markChatRead();
  }, [visible, chatLength]);

  return (
    <section ref={boxRef} aria-labelledby="inline-chat-title" data-guide="chat" data-variant={variant} className="chat-inline flex flex-col rounded-panel border border-line bg-panel/70">
      <h2 id="inline-chat-title" aria-label={t.chat.title} className="type-display px-4 pt-3 text-[22px] font-bold">
        {title?.(t) ?? t.chat.title}
      </h2>
      <ChatMessages className="h-[300px]" />
      <div className="space-y-2 border-t border-line p-3">
        <div className="flex items-center gap-2">
          <ReactionRow />
          {canDj && (
            <button
              type="button"
              aria-pressed={djOpen}
              data-guide="djPads"
              aria-label={t.chat.djToggle}
              title={t.chat.djToggle}
              onClick={() => setDjOpen((v) => !v)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                djOpen ? 'border-amber bg-amber text-amber-ink' : 'border-line text-sage hover:text-paper'
              }`}
            >
              <Disc3 className={`h-5 w-5 ${djOpen ? 'motion-safe:animate-spin [animation-duration:3s]' : ''}`} aria-hidden />
            </button>
          )}
        </div>
        {canDj && djOpen && <DjPads />}
        <ChatComposer inputRef={inputRef} placeholder={placeholder?.(t)} />
      </div>
    </section>
  );
}

