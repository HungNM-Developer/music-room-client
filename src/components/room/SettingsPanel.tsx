'use client';

import { ChevronDown, KeyRound, Settings2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PinField } from '@/components/ui/PinField';
import { useToast } from '@/components/ui/Toast';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { fromForm, type SettingsErrors, type SettingsForm, toForm } from '@/lib/settings-form';
import { isPin } from '@/lib/validate';
import { DeleteRoomDialog } from './DeleteRoomDialog';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { ThemeGrid } from '@/themes/ThemePicker';
import { useRoomTheme } from '@/themes/useTheme';

export function SettingsPanel() {
  const settings = useRoom((s) => s.snapshot?.room.settings);
  const aiEnabled = useRoom((s) => s.snapshot?.aiEnabled ?? false);
  const me = useMe();
  const act = useAct();
  const toast = useToast();
  const [edited, setForm] = useState<SettingsForm | null>(null);
  const form = edited ?? (settings ? toForm(settings) : null);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [busy, setBusy] = useState(false);

  if (me?.role !== 'ADMIN' || !form) return null;
  const set = (patch: Partial<SettingsForm>) => setForm({ ...form, ...patch });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { settings: next, errors: errs } = fromForm(form);
    setErrors(errs);
    if (!next) return;
    setBusy(true);
    const ok = await act('room:settings', next);
    setBusy(false);
    if (ok) toast(vi.settings.saved, 'success');
  }

  return (
    <details className="group rounded-panel bg-panel">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
        <Settings2 className="h-5 w-5 text-sage" aria-hidden />
        <span className="flex-1 font-semibold">{vi.settings.title}</span>
        <ChevronDown className="h-5 w-5 text-sage transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <RoomTheme />
      <form onSubmit={save} className="space-y-4 px-4 pb-4" noValidate>
        <Field label={vi.settings.skipThreshold} inputMode="numeric" value={form.thresholdPct} onChange={(e) => set({ thresholdPct: e.target.value })} hint={vi.settings.errThreshold} invalid={errors.thresholdPct} />
        <Field label={vi.settings.voteWindow} inputMode="numeric" value={form.voteWindow} onChange={(e) => set({ voteWindow: e.target.value })} hint={vi.settings.errVoteWindow} invalid={errors.voteWindow} />
        <Field label={vi.settings.maxQueued} inputMode="numeric" value={form.maxQueued} onChange={(e) => set({ maxQueued: e.target.value })} hint={vi.settings.errQueued} invalid={errors.maxQueued} />
        <Field label={vi.settings.maxDuration} inputMode="numeric" value={form.maxMinutes} onChange={(e) => set({ maxMinutes: e.target.value })} hint={vi.settings.errDuration} invalid={errors.maxMinutes} />
        <div className="space-y-1.5">
          <Field label={vi.settings.repeatGap} inputMode="numeric" value={form.repeatGap} onChange={(e) => set({ repeatGap: e.target.value })} hint={vi.settings.errRepeatGap} invalid={errors.repeatGap} />
          <p className="text-[13px] text-sage">{vi.settings.repeatGapHint}</p>
        </div>
        <div className="space-y-1.5">
          <Field label={vi.settings.fallback} value={form.fallbackUrl} placeholder="https://www.youtube.com/playlist?list=…" onChange={(e) => set({ fallbackUrl: e.target.value })} hint={vi.settings.errFallback} invalid={errors.fallbackUrl} />
          <p className="text-[13px] text-sage">{vi.settings.fallbackHint}</p>
        </div>
        {aiEnabled && (
          <div className="space-y-1">
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked={form.mcIntro} onChange={(e) => set({ mcIntro: e.target.checked })} className="h-5 w-5 accent-amber" />
              {vi.settings.mcIntro}
            </label>
            <p className="pl-8 text-[13px] text-sage">{vi.settings.mcIntroHint}</p>
          </div>
        )}
        <div className="space-y-1">
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={form.autoRadio} onChange={(e) => set({ autoRadio: e.target.checked })} className="h-5 w-5 accent-amber" />
            {vi.settings.autoRadio}
          </label>
          <p className="pl-8 text-[13px] text-sage">{vi.settings.autoRadioHint}</p>
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={form.allowGuestDj} onChange={(e) => set({ allowGuestDj: e.target.checked })} className="h-5 w-5 accent-amber" />
          {vi.settings.allowGuestDj}
        </label>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {vi.settings.save}
        </Button>
      </form>
      <PinSettings />
      <DeleteRoom />
    </details>
  );
}

/** The room's theme: saved as soon as it is picked (not part of the form above). */
function RoomTheme() {
  const theme = useRoomTheme();
  const act = useAct();
  const toast = useToast();
  return (
    <section aria-labelledby="room-theme-title" className="space-y-2 border-b border-line px-4 pb-5">
      <h3 id="room-theme-title" className="font-semibold">
        {vi.theme.roomTitle}
      </h3>
      <p className="text-[13px] text-sage">{vi.theme.roomHint}</p>
      <ThemeGrid
        value={theme}
        onPick={async (v) => {
          if (v === 'room' || v === theme) return;
          if (await act('room:settings', { theme: v })) toast(vi.theme.saved, 'success');
        }}
      />
    </section>
  );
}

/** The room's owner only (signed in as the account that owns it): delete the room. */
function DeleteRoom() {
  const isOwner = useRoom((s) => Boolean(s.user && s.snapshot?.room.ownerUserId === s.user.id));
  const name = useRoom((s) => s.snapshot?.room.name ?? '');
  const code = useRoom((s) => s.snapshot?.room.code ?? '');
  const act = useAct();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!isOwner) return null;
  return (
    <div className="space-y-3 border-t border-line/70 px-4 py-4">
      <h3 className="flex items-center gap-2 font-semibold text-alert">
        <Trash2 className="h-4 w-4" aria-hidden /> {vi.deleteRoom.section}
      </h3>
      <p className="text-[13px] text-sage">{vi.deleteRoom.sectionHint}</p>
      <Button variant="danger" className="w-full" onClick={() => setOpen(true)}>
        {vi.deleteRoom.open}
      </Button>
      {open && (
        <DeleteRoomDialog
          name={name}
          code={code}
          onClose={() => setOpen(false)}
          onConfirm={async () => {
            const ok = await act('room:delete', { code });
            if (!ok) return false;
            room.forgetDeletedRoom();
            toast(vi.deleteRoom.done(name), 'success');
            router.replace('/');
            return true;
          }}
        />
      )}
    </div>
  );
}

/** Set (rooms from before PINs) or change the admin PIN. Separate form: forms cannot nest. */
function PinSettings() {
  const hasPin = useRoom((s) => s.snapshot?.room.hasPin ?? false);
  const act = useAct();
  const toast = useToast();
  const [pin, setPin] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isPin(pin) || busy) return;
    setBusy(true);
    const ok = await act('room:set-pin', { pin });
    setBusy(false);
    if (!ok) return;
    toast(vi.settings.pinSaved, 'success');
    setPin('');
    setTouched(false);
  }

  return (
    <form onSubmit={save} className="space-y-3 border-t border-line/70 px-4 py-4" noValidate>
      <h3 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4 text-sage" aria-hidden /> {vi.settings.pinTitle}
      </h3>
      <p className={`text-[13px] ${hasPin ? 'text-sage' : 'rounded-row border border-amber/35 bg-amber/10 p-3 text-paper'}`}>
        {hasPin ? vi.settings.pinHint : vi.settings.pinMissing}
      </p>
      <PinField label={vi.settings.pinNew} value={pin} onChange={setPin} autoComplete="new-password" invalid={touched && !isPin(pin)} />
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
        {vi.settings.pinSave}
      </Button>
    </form>
  );
}
