'use client';

import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRoom } from '@/context/RoomContext';
import { LIMITS } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { formatClock } from '@/lib/time';

export function ChatPanel() {
  const { chat, me } = useRoom();
  const act = useAct();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Block body on purpose: Chromium's scrollIntoView() now returns a Promise, which
  // React would treat as an (invalid) cleanup function.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
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
    <section aria-labelledby="chat-title" className="glass-effect rounded-[2rem] p-4 md:p-6 flex flex-col h-[420px]">
      <h2 id="chat-title" className="text-sm font-black uppercase tracking-widest text-slate-300 mb-3">{vi.chat.title}</h2>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {chat.length === 0 && <p className="text-sm text-slate-500">{vi.chat.empty}</p>}
        {chat.map((m) => (
          <div key={m.id} className={`text-sm ${m.memberId === me?.id ? 'text-right' : ''}`}>
            <p className="text-[11px] text-slate-500">
              {m.displayName} · {formatClock(m.createdAt)}
            </p>
            <p className="inline-block max-w-[85%] rounded-2xl bg-white/5 px-3 py-2 text-left whitespace-pre-wrap break-words">{m.content}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label htmlFor="chat-input" className="sr-only">{vi.chat.placeholder}</label>
        <input id="chat-input" value={text} maxLength={LIMITS.chat} onChange={(e) => setText(e.target.value)} placeholder={vi.chat.placeholder} className="flex-1 min-w-0 input-field !py-2" autoComplete="off" />
        <button type="submit" aria-label={vi.chat.send} disabled={!text.trim()} className="btn-primary !px-4 !py-2 disabled:opacity-50">
          <Send className="w-4 h-4" aria-hidden />
        </button>
      </form>
    </section>
  );
}
