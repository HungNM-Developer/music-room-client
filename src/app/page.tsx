'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Music } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useRoom } from '@/context/RoomContext';
import { DisplayNameSchema, PinSchema, RoomCodeSchema, RoomNameSchema } from '@/contracts';
import { errorMessage, vi } from '@/i18n/vi';
import { lastName, rememberName } from '@/lib/session-store';

type Mode = 'create' | 'join';
const valid = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: string) =>
  schema.safeParse(v).success;

export default function HomePage() {
  const router = useRouter();
  const room = useRoom();
  const toast = useToast();
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

  const setupRequired = room.health?.setupRequired ?? false;
  const ok = {
    name: valid(DisplayNameSchema, name),
    roomName: valid(RoomNameSchema, roomName),
    pin: valid(PinSchema, pin),
    code: valid(RoomCodeSchema, code),
    setup: !setupRequired || setupPassword.trim().length > 0,
  };
  const canSubmit =
    !busy && ok.name && (mode === 'create' ? ok.roomName && ok.pin && ok.setup : ok.code);
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
    <main className="min-h-dvh relative bg-surface-900 flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] bg-brand-accent/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full glass-effect px-4 py-2 text-xs font-bold text-indigo-300">
            <Music className="w-4 h-4" aria-hidden /> {vi.appName}
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95]">
            Cùng chọn <span className="text-gradient">nhạc</span>, <br /> chung một loa.
          </h1>
          <p className="text-slate-400 text-lg max-w-md">{vi.appTagline}</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-effect rounded-[2rem] p-6 md:p-10 space-y-6"
          noValidate
        >
          <div role="tablist" className="flex gap-2 p-1.5 bg-surface-900/50 rounded-2xl border border-white/5">
            {(['create', 'join'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  mode === m ? 'bg-surface-700 text-white shadow-xl' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'create' ? vi.home.tabCreate : vi.home.tabJoin}
              </button>
            ))}
          </div>

          <Field
            label={vi.home.yourName}
            placeholder={vi.home.yourNamePlaceholder}
            value={name}
            maxLength={30}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => touch('name')}
            hint={vi.home.hintName}
            showHint={touched.name && !ok.name}
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
                showHint={touched.roomName && !ok.roomName}
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
                showHint={touched.pin && !ok.pin}
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
                  showHint={touched.setup && !ok.setup}
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
              className="uppercase tracking-[0.3em] font-black text-center text-xl"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onBlur={() => touch('code')}
              hint={vi.home.hintCode}
              showHint={touched.code && !ok.code}
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}

          <button type="submit" disabled={!canSubmit} className="w-full btn-primary !py-4 text-lg disabled:opacity-50 disabled:pointer-events-none">
            {mode === 'create' ? vi.home.create : vi.home.join}
            <ArrowRight className="w-5 h-5" aria-hidden />
          </button>
        </motion.form>
      </div>
    </main>
  );
}
