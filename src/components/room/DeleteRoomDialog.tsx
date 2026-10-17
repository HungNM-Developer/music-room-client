'use client';

import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useT } from '@/i18n';

/**
 * Deleting a room cannot be undone: the owner types the room code to confirm (any case).
 * `onConfirm` resolves true when the server deleted it.
 */
export function DeleteRoomDialog({
  name,
  code,
  onConfirm,
  onClose,
}: {
  name: string;
  code: string;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = typed.trim().toUpperCase() === code.toUpperCase();
  return (
    <Dialog open onClose={onClose} title={t.deleteRoom.title(name)}>
      <p className="text-sage">{t.deleteRoom.body}</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!matches || busy) return;
          setBusy(true);
          const ok = await onConfirm();
          setBusy(false);
          if (ok) onClose();
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="block text-[14px] font-medium">
            {t.deleteRoom.typeCode(code)}
          </label>
          <input
            id={inputId}
            data-autofocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="min-h-11 w-full rounded-row border border-line bg-dial-deep px-3 font-mono text-[16px] uppercase tracking-[0.2em] text-paper outline-none focus:border-amber"
          />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onClose}>
            {t.deleteRoom.cancel}
          </Button>
          <Button type="submit" variant="danger" className="flex-1" disabled={!matches || busy} aria-busy={busy}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {t.deleteRoom.confirm}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
