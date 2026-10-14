'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Field } from '@/components/ui/Field';
import { useRoom } from '@/context/RoomContext';
import { DisplayNameSchema } from '@/contracts';
import { errorMessage, vi } from '@/i18n/vi';
import { lastName, rememberName } from '@/lib/session-store';

/** Shown on /r/CODE when there is no valid session (TC-015, TC-021). */
export function JoinDialog({ code, notice }: { code: string; notice?: string | null }) {
  const room = useRoom();
  const [roomName, setRoomName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);

  // Prefill after hydration: the server render has no localStorage.
  useEffect(() => setName((n) => n || lastName()), []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const valid = DisplayNameSchema.safeParse(name).success;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        className="w-full max-w-md glass-effect rounded-[2rem] p-8 space-y-5"
      >
        <h1 id="join-title" className="text-2xl font-black">
          {roomName ? vi.joinDialog.title(roomName) : vi.joinDialog.loading}
        </h1>
        <Field
          label={vi.home.yourName}
          placeholder={vi.home.yourNamePlaceholder}
          value={name}
          maxLength={30}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            {error}
          </p>
        )}
        <button type="submit" disabled={!valid || busy || !roomName} className="w-full btn-primary disabled:opacity-50">
          {vi.joinDialog.submit}
        </button>
        <Link href="/" className="block text-center text-sm text-slate-400 hover:text-white">
          {vi.joinDialog.backHome}
        </Link>
      </form>
    </div>
  );
}
