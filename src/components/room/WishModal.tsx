'use client';

import { useState } from 'react';
import type { QueueItemView, VoicePreset } from '@/contracts';
import { LIMITS, VOICE_PRESETS } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';

export function WishModal({ item, onClose }: { item: QueueItemView; onClose: () => void }) {
  const act = useAct();
  const [text, setText] = useState(item.wishMessage ?? '');
  const [voice, setVoice] = useState<VoicePreset>(item.voicePreset ?? 'radio');
  const [busy, setBusy] = useState(false);

  async function save(message: string) {
    setBusy(true);
    const ok = await act('queue:set-message', { queueItemId: item.id, wishMessage: message, voicePreset: voice });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wish-title"
        className="w-full max-w-md glass-effect rounded-[2rem] p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="wish-title" className="text-xl font-black">{vi.wish.title}</h2>
        <p className="text-sm text-slate-400 truncate">{item.track.title}</p>
        <textarea
          value={text}
          maxLength={LIMITS.wish}
          rows={3}
          placeholder={vi.wish.placeholder}
          onChange={(e) => setText(e.target.value)}
          className="w-full input-field resize-none"
          aria-label={vi.wish.title}
        />
        <p className="text-xs text-slate-500 text-right tabular-nums">{text.length}/{LIMITS.wish}</p>
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-400">{vi.wish.voice}</legend>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={voice === v}
                onClick={() => setVoice(v)}
                className={`rounded-xl px-2 py-2 text-xs font-bold border ${voice === v ? 'border-brand-primary bg-brand-primary/20' : 'border-white/10 bg-white/5'}`}
              >
                {vi.wish.voices[v]}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-slate-500">{vi.wish.note}</p>
        <div className="flex gap-2">
          {item.wishMessage && (
            <button type="button" disabled={busy} onClick={() => save('')} className="btn-secondary flex-1">
              {vi.wish.clear}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary flex-1">{vi.wish.cancel}</button>
          <button type="button" disabled={busy || !text.trim()} onClick={() => save(text)} className="btn-primary flex-1 disabled:opacity-50">
            {vi.wish.save}
          </button>
        </div>
      </div>
    </div>
  );
}
