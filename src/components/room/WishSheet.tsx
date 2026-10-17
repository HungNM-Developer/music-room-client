'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import type { QueueItemView, Voice } from '@/contracts';
import { LIMITS, VOICES } from '@/contracts/constants';
import { useAct } from '@/hooks/useAct';
import { errorMessage, useT } from '@/i18n';
import { getLang } from '@/i18n/lang';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

export type WishToAdd = { message: string; voice: Voice };

/** A song being added with its wish (`known`: its title came from the server, not a placeholder). */
type Adding = { title: string; artist: string | null; known: boolean; onAdd: (wish: WishToAdd) => void };

/**
 * The dedication slip: a wish the speaker reads aloud before this song plays — for one of my
 * waiting songs (`item`), or for a song being added with it (`adding`).
 */
export function WishSheet({
  item,
  adding,
  onClose,
}: { onClose: () => void } & ({ item: QueueItemView; adding?: undefined } | { item?: undefined; adding: Adding })) {
  const t = useT();
  const act = useAct();
  const [text, setText] = useState(item?.wishMessage ?? '');
  // Nothing picked in advance: the sender chooses the voice (a wish from before voices shows none).
  const [voice, setVoice] = useState<Voice | null>(item?.voice ?? null);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const aiEnabled = useRoom((s) => s.snapshot?.aiEnabled ?? false);
  const toast = useToast();
  const textId = useId();
  const voiceId = useId();

  /** "Nhờ MC viết": the AI drafts a wish from the song (and what is already typed); the sender edits it. */
  async function askMc() {
    setWriting(true);
    const song = item
      ? { queueItemId: item.id }
      : { title: adding.title, ...(adding.artist ? { artist: adding.artist } : {}) };
    const r = await room.send('wish:suggest', {
      ...song,
      ...(text.trim() ? { hint: text.trim() } : {}),
      language: getLang(),
    });
    setWriting(false);
    if (r.ok) setText(r.data.text.slice(0, LIMITS.wish));
    else toast(errorMessage(r.error.code, r.error.params), 'error');
  }

  /** Optimistic: the sheet closes at once and the queue row shows the wish; a refusal rolls it back. */
  function save(message: string) {
    setBusy(true);
    onClose();
    if (adding) {
      if (voice) adding.onAdd({ message, voice });
      return;
    }
    void act(
      'queue:set-message',
      // `voice` only when female: male is what the server assumes, so an older server still accepts it.
      { queueItemId: item.id, wishMessage: message, ...(message && voice === 'female' ? { voice } : {}) },
      { optimistic: { kind: 'wish', itemId: item.id, message: message.trim() || null } },
    );
  }

  return (
    <Dialog open onClose={onClose} title={t.wish.title} description={item ? item.track.title : adding.title}>
      <div className="space-y-4">
        <div className="rounded-box bg-paper p-3 text-dial">
          <label htmlFor={textId} className="text-[13px] font-medium text-dial/70">
            {t.wish.label}
          </label>
          <textarea
            id={textId}
            value={text}
            maxLength={LIMITS.wish}
            // The MC's draft replaces the text: no typing while it is being written.
            readOnly={writing}
            rows={3}
            placeholder={t.wish.placeholder}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full resize-none bg-transparent text-[16px] leading-snug text-dial outline-none placeholder:text-dial/40"
            style={{ caretColor: 'var(--color-dial)' }}
            data-autofocus
          />
          <div className="flex items-center justify-between gap-2">
            {/* A pasted link whose title could not be looked up: the MC would not know the song. */}
            {aiEnabled && (item || adding.known) && (
              <button
                type="button"
                onClick={() => void askMc()}
                disabled={writing}
                aria-busy={writing}
                className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-row px-1 text-[14px] font-medium text-dial/80 hover:text-dial disabled:opacity-60"
              >
                {writing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                {writing ? t.wish.asking : t.wish.ask}
              </button>
            )}
            <p className="ml-auto text-[13px] sm:text-[12px] text-dial/60 tabular-nums">
              {text.length}/{LIMITS.wish}
            </p>
          </div>
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
          {item?.wishMessage && (
            <Button disabled={busy} onClick={() => save('')} className="flex-1">
              {t.wish.clear}
            </Button>
          )}
          <Button variant="primary" disabled={busy || writing || !text.trim() || !voice} onClick={() => save(text)} className="flex-1">
            {adding ? t.wish.addSave : t.wish.save}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
