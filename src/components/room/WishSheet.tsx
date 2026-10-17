'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { QueueItemView, Voice } from '@/contracts';
import { LIMITS, VOICES } from '@/contracts/constants';
import { useAct } from '@/hooks/useAct';
import { useT } from '@/i18n';

/** The dedication slip: a wish the speaker reads aloud before this song plays. */
export function WishSheet({ item, onClose }: { item: QueueItemView; onClose: () => void }) {
  const t = useT();
  const act = useAct();
  const [text, setText] = useState(item.wishMessage ?? '');
  // Nothing picked in advance: the sender chooses the voice (a wish from before voices shows none).
  const [voice, setVoice] = useState<Voice | null>(item.voice ?? null);
  const [busy, setBusy] = useState(false);
  const textId = useId();
  const voiceId = useId();

  /** Optimistic: the sheet closes at once and the queue row shows the wish; a refusal rolls it back. */
  function save(message: string) {
    setBusy(true);
    onClose();
    void act(
      'queue:set-message',
      // `voice` only when female: male is what the server assumes, so an older server still accepts it.
      { queueItemId: item.id, wishMessage: message, ...(message && voice === 'female' ? { voice } : {}) },
      { optimistic: { kind: 'wish', itemId: item.id, message: message.trim() || null } },
    );
  }

  return (
    <Dialog open onClose={onClose} title={t.wish.title} description={item.track.title}>
      <div className="space-y-4">
        <div className="rounded-row bg-paper p-3 text-dial">
          <label htmlFor={textId} className="text-[13px] font-medium text-dial/70">
            {t.wish.label}
          </label>
          <textarea
            id={textId}
            value={text}
            maxLength={LIMITS.wish}
            rows={3}
            placeholder={t.wish.placeholder}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full resize-none bg-transparent text-[16px] leading-snug text-dial outline-none placeholder:text-dial/40"
            style={{ caretColor: 'var(--color-dial)' }}
          />
          <p className="text-right text-[13px] sm:text-[12px] text-dial/60 tabular-nums">
            {text.length}/{LIMITS.wish}
          </p>
        </div>

        <div>
          <p id={voiceId} className="mb-2 text-[13px] font-medium text-sage">
            {t.wish.voice}
          </p>
          <div role="radiogroup" aria-labelledby={voiceId} className="grid grid-cols-2 gap-2">
            {VOICES.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={voice === v}
                onClick={() => setVoice(v)}
                className={`min-h-11 rounded-row border px-2 text-[14px] font-medium transition-colors ${
                  voice === v ? 'border-amber bg-amber/15 text-paper' : 'border-line text-sage hover:text-paper'
                }`}
              >
                {v === 'male' ? t.wish.voiceMale : t.wish.voiceFemale}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[13px] text-sage">{text.trim() && !voice ? t.wish.pickVoice : t.wish.note}</p>

        <div className="flex gap-2">
          {item.wishMessage && (
            <Button disabled={busy} onClick={() => save('')} className="flex-1">
              {t.wish.clear}
            </Button>
          )}
          <Button variant="primary" disabled={busy || !text.trim() || !voice} onClick={() => save(text)} className="flex-1">
            {t.wish.save}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
