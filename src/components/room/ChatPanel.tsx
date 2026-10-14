'use client';

import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LIMITS } from '@/contracts/constants';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { formatClock } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';

export function ChatPanel() {
  const chat = useRoom((s) => s.chat);
  const me = useMe();
  const act = useAct();
  const [text, setText] = useState('');
  const logRef = useRef<HTMLOListElement>(null);

  // Keep the newest message in view (scroll the list, not the page).
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);
  if (me?.isDevice) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    const ok = await act('chat:send', { content });
    if (ok) setText('');
  }

  return (
    <section aria-labelledby="chat-title">
      <h2 id="chat-title" className="type-display mb-2 px-1 text-[20px] font-bold">
        {vi.chat.title}
      </h2>
      <div className="flex h-[400px] flex-col rounded-panel bg-panel p-3">
        <ol ref={logRef} className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-1" aria-live="polite">
          {chat.length === 0 && <li className="py-6 text-center text-sage">{vi.chat.empty}</li>}
          {chat.map((m) => {
            const mine = m.memberId === me?.id;
            return (
              <li key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <span className="mb-0.5 text-[12px] text-sage">
                  {mine ? formatClock(m.createdAt) : `${m.displayName}, ${formatClock(m.createdAt)}`}
                </span>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-[14px] px-3 py-2 [overflow-wrap:anywhere] ${
                    mine ? 'rounded-br-[4px] bg-amber/15' : 'rounded-bl-[4px] bg-dial'
                  }`}
                >
                  {m.content}
                </p>
              </li>
            );
          })}
        </ol>
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            {vi.chat.label}
          </label>
          <input
            id="chat-input"
            value={text}
            maxLength={LIMITS.chat}
            onChange={(e) => setText(e.target.value)}
            placeholder={vi.chat.placeholder}
            className="field min-w-0 flex-1"
            autoComplete="off"
            enterKeyHint="send"
          />
          <Button type="submit" variant="primary" aria-label={vi.chat.send} disabled={!text.trim()} className="w-12 shrink-0 !px-0">
            <Send className="h-5 w-5" aria-hidden />
          </Button>
        </form>
      </div>
    </section>
  );
}
