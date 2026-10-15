'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PinField } from '@/components/ui/PinField';
import { panelId, tabId, TabList } from '@/components/ui/Tabs';
import { useSlow } from '@/hooks/useSlow';
import { errorMessage, vi } from '@/i18n/vi';
import { lastName, rememberName } from '@/lib/session-store';
import { isDisplayName, isPin, isRoomCode, isRoomName } from '@/lib/validate';
import { room } from '@/state/room-store';

type Mode = 'create' | 'join';

export function HomeForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  // Joining under the name of an offline admin: the server asks for the PIN (PIN_REQUIRED).
  const [needPin, setNeedPin] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slow = useSlow(busy, 3000);

  // Prefill after hydration: the server render has no localStorage.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setName((n) => n || lastName()), []);

  const ok = {
    name: isDisplayName(name),
    roomName: isRoomName(roomName),
    code: isRoomCode(code),
    pin: isPin(pin),
  };
  const canSubmit =
    !busy && ok.name && (mode === 'create' ? ok.roomName && ok.pin : ok.code && (!needPin || ok.pin));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const r =
      mode === 'create'
        ? await room.send('room:create', {
            name: roomName,
            displayName: name,
            adminPin: pin,
          })
        : await room.send('room:join', { code, displayName: name, ...(needPin ? { adminPin: pin } : {}) });
    setBusy(false);
    if (!r.ok) {
      if (r.error.code === 'PIN_REQUIRED') setNeedPin(true);
      setError(errorMessage(r.error.code, r.error.params));
      return;
    }
    rememberName(name.trim(), r.data.code);
    router.push(`/r/${r.data.code}`);
  }

  return (
    <div className="rounded-panel bg-panel p-5 sm:p-7">
      <TabList
        variant="pill"
        idPrefix="home"
        label={vi.appName}
        tabs={[
          { key: 'create', label: vi.home.tabCreate },
          { key: 'join', label: vi.home.tabJoin },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
          setPin('');
          setNeedPin(false);
        }}
      />
      <form
        id={panelId('home', mode)}
        role="tabpanel"
        aria-labelledby={tabId('home', mode)}
        onSubmit={submit}
        className="mt-6 space-y-4"
        noValidate
      >
        <Field
          label={vi.home.yourName}
          placeholder={vi.home.yourNamePlaceholder}
          value={name}
          maxLength={30}
          autoComplete="nickname"
          onChange={(e) => {
            setName(e.target.value);
            setNeedPin(false);
          }}
          onBlur={() => touch('name')}
          hint={vi.home.hintName}
          invalid={touched.name && !ok.name}
        />
        {mode === 'create' ? (
          <>
            <Field
              label={vi.home.roomName}
              placeholder={vi.home.roomNamePlaceholder}
              value={roomName}
              maxLength={50}
              onChange={(e) => setRoomName(e.target.value)}
              onBlur={() => touch('roomName')}
              hint={vi.home.hintRoomName}
              invalid={touched.roomName && !ok.roomName}
            />
            <div className="space-y-1.5" onBlur={() => touch('pin')}>
              <PinField value={pin} onChange={setPin} autoComplete="new-password" invalid={touched.pin && !ok.pin} />
              <p className="text-[13px] text-sage">{vi.home.adminPinNote}</p>
            </div>
          </>
        ) : (
          <Field
            label={vi.home.roomCode}
            placeholder={vi.home.roomCodePlaceholder}
            value={code}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            className="type-display text-center text-[24px] font-bold uppercase tracking-[0.3em]"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setNeedPin(false);
            }}
            onBlur={() => touch('code')}
            hint={vi.home.hintCode}
            invalid={touched.code && !ok.code}
          />
        )}
        {mode === 'join' && needPin && <PinField value={pin} onChange={setPin} autoFocus />}
        {mode === 'join' && !needPin && <p className="text-[13px] text-sage">{vi.home.rejoinNote}</p>}

        {error && (
          <p role="alert" className="rounded-row border border-onair/50 bg-onair/10 p-3 text-[14px]">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canSubmit} aria-busy={busy} className="w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {mode === 'create' ? vi.home.create : vi.home.join}
        </Button>
        {slow && (
          <p role="status" className="text-center text-[13px] text-sage">
            {vi.home.slow}
          </p>
        )}
      </form>
    </div>
  );
}
