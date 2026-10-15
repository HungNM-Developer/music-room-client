'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GoogleButton } from '@/components/account/GoogleButton';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { PinField } from '@/components/ui/PinField';
import { errorMessage, vi } from '@/i18n/vi';
import { lastName, rememberName } from '@/lib/session-store';
import { isDisplayName, isPin } from '@/lib/validate';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/** Shown on /r/CODE when there is no valid session (TC-015, TC-021). Cannot be dismissed. */
export function JoinDialog({ code, notice }: { code: string; notice?: string | null }) {
  const [roomName, setRoomName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [pin, setPin] = useState('');
  // The name belongs to an offline admin: the server asks for the PIN (PIN_REQUIRED).
  const [needPin, setNeedPin] = useState(false);

  // Prefill after hydration (the server render has no localStorage). The name used in
  // this room before comes first: typing it again brings back the same member.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setName((n) => n || lastName(code)), [code]);
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

  // L1: signed in → straight in as the account's member (no name needed). Not after a
  // kick or a "left" notice: then the person decides.
  const user = useRoom((s) => s.user);
  const [auto, setAuto] = useState<'idle' | 'joining' | 'failed'>('idle');
  const tried = useRef(false);
  useEffect(() => {
    if (!user || notice || tried.current) return;
    tried.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one automatic attempt per dialog
    setAuto('joining');
    void room.send('room:join', { code }).then((r) => {
      if (r.ok) return;
      setAuto('failed');
      setError(errorMessage(r.error.code, r.error.params));
    });
  }, [user, notice, code]);

  const valid = isDisplayName(name) && (!needPin || isPin(pin));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const r = await room.send('room:join', { code, displayName: name, ...(needPin ? { adminPin: pin } : {}) });
    setBusy(false);
    if (!r.ok) {
      if (r.error.code === 'PIN_REQUIRED') setNeedPin(true);
      setError(errorMessage(r.error.code, r.error.params));
    } else {
      rememberName(name.trim(), r.data.code);
      if (r.data.rightsReset) toast(vi.home.rightsReset, 'info');
    }
  }

  if (user && auto === 'joining') {
    return (
      <Dialog open dismissable={false} onClose={() => undefined} title={roomName ? vi.joinDialog.title(roomName) : vi.joinDialog.loading}>
        <p role="status" className="text-sage">
          {vi.account.joining(user.name)}
        </p>
      </Dialog>
    );
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
          data-autofocus
          onChange={(e) => {
            setName(e.target.value);
            setNeedPin(false);
          }}
        />
        {needPin ? <PinField value={pin} onChange={setPin} autoFocus /> : <p className="text-[13px] text-sage">{vi.home.rejoinNote}</p>}
        {error && (
          <p role="alert" className="rounded-row border border-onair/50 bg-onair/10 p-3 text-[14px]">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={!valid || busy || !roomName} className="w-full">
          {vi.joinDialog.submit}
        </Button>
        {!user && (
          <div className="flex flex-col items-center gap-2 border-t border-line/70 pt-4">
            <GoogleButton width={260} />
          </div>
        )}
        <Link href="/" className="block py-2 text-center text-[14px] text-sage hover:text-paper">
          {vi.joinDialog.backHome}
        </Link>
      </form>
    </Dialog>
  );
}
