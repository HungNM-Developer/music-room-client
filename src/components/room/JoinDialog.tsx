'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { errorMessage, vi } from '@/i18n/vi';
import { lastName, rememberName } from '@/lib/session-store';
import { isDisplayName } from '@/lib/validate';
import { room } from '@/state/room-store';

/** Shown on /r/CODE when there is no valid session (TC-015, TC-021). Cannot be dismissed. */
export function JoinDialog({ code, notice }: { code: string; notice?: string | null }) {
  const [roomName, setRoomName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);

  // Prefill after hydration: the server render has no localStorage.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setName((n) => n || lastName()), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setError(notice ?? null), [notice]);
  useEffect(() => {
    let alive = true;
    void room.send('room:peek', { code }).then((r) => {
      if (!alive) return;
      if (r.ok) setRoomName(r.data.name);
      else setError(errorMessage(r.error.code, r.error.params));
    });
    return () => {
      alive = false;
    };
  }, [code]);

  const valid = isDisplayName(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const r = await room.send('room:join', { code, displayName: name });
    setBusy(false);
    if (!r.ok) setError(errorMessage(r.error.code, r.error.params));
    else rememberName(name.trim());
  }

  return (
    <Dialog open dismissable={false} onClose={() => undefined} title={roomName ? vi.joinDialog.title(roomName) : vi.joinDialog.loading}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label={vi.home.yourName}
          placeholder={vi.home.yourNamePlaceholder}
          value={name}
          maxLength={30}
          autoComplete="nickname"
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-row border border-onair/50 bg-onair/10 p-3 text-[14px]">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={!valid || busy || !roomName} className="w-full">
          {vi.joinDialog.submit}
        </Button>
        <Link href="/" className="block py-2 text-center text-[14px] text-sage hover:text-paper">
          {vi.joinDialog.backHome}
        </Link>
      </form>
    </Dialog>
  );
}
