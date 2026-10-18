'use client';

import { Disc3, ShieldCheck } from 'lucide-react';
import { useT } from '@/i18n';

/** The "@…" word being typed before the caret, or null (spec 2026-10-18-dj-chat). */
export function mentionAt(text: string, caret: number): { start: number; word: string } | null {
  const m = /(^|\s)@([\p{L}]*)$/u.exec(text.slice(0, caret));
  if (!m) return null;
  const word = m[2];
  if (!'dj'.startsWith(word.toLowerCase())) return null;
  return { start: caret - word.length - 1, word };
}

/** Puts "@DJ " in place of the "@…" being typed; returns the new text and caret. */
export function insertMention(text: string, caret: number): { text: string; caret: number } {
  const m = mentionAt(text, caret);
  if (!m) return { text, caret };
  const before = text.slice(0, m.start);
  const after = text.slice(caret).replace(/^\S*/, '').replace(/^\s*/, '');
  const next = `${before}@DJ ${after}`;
  return { text: next, caret: before.length + 4 };
}

/** "@" in the chat box: the DJ to pick, what to ask it and where the words go. */
export function DjMentionHint({ id, optionId, onPick }: { id: string; optionId: string; onPick: () => void }) {
  const t = useT();
  return (
    <div className="absolute inset-x-0 bottom-full z-10 mb-2 rounded-[16px] border border-line bg-panel p-1.5 shadow-[0_-12px_32px_-12px_rgb(0_0_0/0.7)]">
      <ul id={id} role="listbox" aria-label={t.djBot.hintTitle}>
        <li
          id={optionId}
          role="option"
          aria-selected
          // mousedown, so the input keeps its focus
          onMouseDown={(e) => {
            e.preventDefault();
            onPick();
          }}
          className="flex cursor-pointer items-center gap-2.5 rounded-[12px] bg-panel-hi px-2.5 py-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber text-amber-ink" aria-hidden>
            <Disc3 className="h-[18px] w-[18px]" />
          </span>
          <span className="font-semibold">{t.djBot.hintTitle}</span>
        </li>
      </ul>
      <div className="px-2.5 pb-1 pt-2 text-[13px] sm:text-[12px]">
        <p className="text-sage">{t.djBot.hintTry}</p>
        <ul className="mt-0.5 space-y-0.5">
          {t.djBot.examples.map((x) => (
            <li key={x}>“{x}”</li>
          ))}
        </ul>
        <p className="mt-1.5 flex items-start gap-1.5 text-sage">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {t.djBot.privacy}
        </p>
      </div>
    </div>
  );
}
