'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GoogleButton } from '@/components/account/GoogleButton';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { AdminNameNotice } from '@/components/home/AdminNameNotice';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, useT } from '@/i18n';
import { lastName, rememberName } from '@/lib/session-store';
import { isDisplayName, isPin } from '@/lib/validate';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { toThemeId } from '@/themes/registry';
import { setRoomThemeHint } from '@/themes/useTheme';

/** Shown on /r/CODE when there is no valid session (TC-015, TC-021). Cannot be dismissed. */
export function JoinDialog({ code, notice }: { code: string; notice?: string | null }) {
  const t = useT();
  const [roomName, setRoomName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [pin, setPin] = useState('');
  // The name belongs to an offline admin: the server asks for the PIN (PIN_REQUIRED).
  const [needPin, setNeedPin] = useState(false);
  const nameBox = useRef<HTMLDivElement>(null);

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
      if (r.ok) {
        setRoomName(r.data.name);
        // The page wears the room's theme behind this form (unless this browser has its own).
        setRoomThemeHint(code, toThemeId(r.data.theme));
      }
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
      // PIN_REQUIRED: the notice explains it and offers another name, no red error on top.
      if (r.error.code === 'PIN_REQUIRED') {
        setNeedPin(true);
        setError(null);
      } else setError(errorMessage(r.error.code, r.error.params));
    } else {
      rememberName(name.trim(), r.data.code);
      if (r.data.rightsReset) toast(t.home.rightsReset, 'info');
    }
  }

  if (user && auto === 'joining') {
    return (
      <Dialog open dismissable={false} onClose={() => undefined} title={roomName ? t.joinDialog.title(roomName) : t.joinDialog.loading}>
        <p role="status" className="text-sage">
          {t.account.joining(user.name)}
        </p>
      </Dialog>
    );
  }

  return (
    <Dialog open dismissable={false} onClose={() => undefined} title={roomName ? t.joinDialog.title(roomName) : t.joinDialog.loading}>
      <form onSubmit={submit} className="space-y-4">
        <div ref={nameBox}>
          <Field
            label={t.home.yourName}
            placeholder={t.home.yourNamePlaceholder}
            value={name}
            maxLength={30}
            autoComplete="nickname"
            data-autofocus
            onChange={(e) => {
              setName(e.target.value);
              setNeedPin(false);
            }}
          />
        </div>
        {needPin ? (
          <AdminNameNotice
            name={name}
            pin={pin}
            onPin={setPin}
            onOtherName={() => {
              setNeedPin(false);
              setPin('');
              setError(null);
              setName('');
              nameBox.current?.querySelector('input')?.focus();
            }}
          />
        ) : (
          <p className="text-[13px] text-sage">{t.home.rejoinNote}</p>
        )}
        {error && (
          <p role="alert" className="rounded-row border border-onair/50 bg-onair/10 p-3 text-[14px]">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={!valid || busy || !roomName} className="w-full">
          {t.joinDialog.submit}
        </Button>
        {!user && (
          <div className="flex flex-col items-center gap-2 border-t border-line/70 pt-4">
            <GoogleButton width={260} />
          </div>
        )}
        <Link href="/" className="block py-2 text-center text-[14px] text-sage hover:text-paper">
          {t.joinDialog.backHome}
        </Link>
      </form>
    </Dialog>
  );
}
