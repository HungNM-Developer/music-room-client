'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { panelId, tabId, TabList } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, vi } from '@/i18n/vi';
import { lastName, rememberName } from '@/lib/session-store';
import { isDisplayName, isPin, isRoomCode, isRoomName } from '@/lib/validate';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

type Mode = 'create' | 'join';

export function HomeForm() {
  const router = useRouter();
  const toast = useToast();
  const setupRequired = useRoom((s) => s.health?.setupRequired ?? false);
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [pin, setPin] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill after hydration: the server render has no localStorage.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setName((n) => n || lastName()), []);

  const ok = {
    name: isDisplayName(name),
    roomName: isRoomName(roomName),
    pin: isPin(pin),
    code: isRoomCode(code),
    setup: !setupRequired || setupPassword.trim().length > 0,
  };
  const canSubmit = !busy && ok.name && (mode === 'create' ? ok.roomName && ok.pin && ok.setup : ok.code);
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
            ...(setupRequired ? { setupPassword } : {}),
          })
        : await room.send('room:join', { code, displayName: name });
    setBusy(false);
    if (!r.ok) {
      setError(errorMessage(r.error.code, r.error.params));
      return;
    }
    rememberName(name.trim());
    if (mode === 'create') toast(vi.home.pinNote, 'info');
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
          onChange={(e) => setName(e.target.value)}
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
            <Field
              label={vi.home.pin}
              placeholder={vi.home.pinPlaceholder}
              value={pin}
              inputMode="numeric"
              type="password"
              autoComplete="new-password"
              maxLength={8}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onBlur={() => touch('pin')}
              hint={vi.home.hintPin}
              invalid={touched.pin && !ok.pin}
            />
            {setupRequired && (
              <Field
                label={vi.home.setupPassword}
                type="password"
                value={setupPassword}
                autoComplete="off"
                onChange={(e) => setSetupPassword(e.target.value)}
                onBlur={() => touch('setup')}
                hint={vi.home.hintSetupPassword}
                invalid={touched.setup && !ok.setup}
              />
            )}
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
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onBlur={() => touch('code')}
            hint={vi.home.hintCode}
            invalid={touched.code && !ok.code}
          />
        )}

        {error && (
          <p role="alert" className="rounded-row border border-onair/50 bg-onair/10 p-3 text-[14px]">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canSubmit} className="w-full">
          {mode === 'create' ? vi.home.create : vi.home.join}
        </Button>
      </form>
    </div>
  );
}
