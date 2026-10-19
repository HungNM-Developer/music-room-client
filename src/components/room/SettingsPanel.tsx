'use client';

import { KeyRound, Settings2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PinField } from '@/components/ui/PinField';
import { useToast } from '@/components/ui/Toast';
import { useAct } from '@/hooks/useAct';
import { useT } from '@/i18n';
import { fromForm, type SettingsErrors, type SettingsForm, toForm } from '@/lib/settings-form';
import { isPin } from '@/lib/validate';
import { DeleteRoomDialog } from './DeleteRoomDialog';
import { KeepRoomSection } from './KeepRoom';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { ThemeGrid } from '@/themes/ThemePicker';
import { useRoomTheme } from '@/themes/useTheme';

export function SettingsPanel() {
  const t = useT();
  const settings = useRoom((s) => s.snapshot?.room.settings);
  const aiEnabled = useRoom((s) => s.snapshot?.aiEnabled ?? false);
  // Someone here acts from a linked Slack channel: the minimum matters for this room.
  const hasSlack = useRoom((s) => Boolean(s.snapshot?.members.some((m) => m.viaSlack)));
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
    if (ok) toast(t.settings.saved, 'success');
  }

  return (
    // The Settings tab (admins): keeping the room first while it has no owner, then one card.
    <div className="space-y-4">
      <KeepRoomSection />
      <section aria-labelledby="room-settings-title" className="rounded-panel bg-panel" data-guide="settings">
        <h2 id="room-settings-title" className="flex min-h-14 items-center gap-3 px-4 font-semibold">
          <Settings2 className="h-5 w-5 text-sage" aria-hidden />
          {t.settings.title}
        </h2>
        <form onSubmit={save} className="space-y-4 px-4 pb-4" noValidate>
          <Field label={t.settings.skipThreshold} inputMode="numeric" value={form.thresholdPct} onChange={(e) => set({ thresholdPct: e.target.value })} hint={t.settings.errThreshold} invalid={errors.thresholdPct} />
          <div className="space-y-1.5">
            <Field label={t.settings.minVotes} inputMode="numeric" value={form.minVotes} onChange={(e) => set({ minVotes: e.target.value })} hint={t.settings.errMinVotes} invalid={errors.minVotes} />
            <p className="text-[13px] text-sage">{t.settings.minVotesHint}</p>
            {hasSlack && <p className="rounded-box border border-amber/35 bg-amber/10 p-3 text-[13px] text-paper">{t.settings.minVotesSlack}</p>}
          </div>
          <Field label={t.settings.voteWindow} inputMode="numeric" value={form.voteWindow} onChange={(e) => set({ voteWindow: e.target.value })} hint={t.settings.errVoteWindow} invalid={errors.voteWindow} />
          <Field label={t.settings.maxQueued} inputMode="numeric" value={form.maxQueued} onChange={(e) => set({ maxQueued: e.target.value })} hint={t.settings.errQueued} invalid={errors.maxQueued} />
          <Field label={t.settings.maxDuration} inputMode="numeric" value={form.maxMinutes} onChange={(e) => set({ maxMinutes: e.target.value })} hint={t.settings.errDuration} invalid={errors.maxMinutes} />
          <div className="space-y-1.5">
            <Field label={t.settings.repeatGap} inputMode="numeric" value={form.repeatGap} onChange={(e) => set({ repeatGap: e.target.value })} hint={t.settings.errRepeatGap} invalid={errors.repeatGap} />
            <p className="text-[13px] text-sage">{t.settings.repeatGapHint}</p>
          </div>
          <div className="space-y-1.5">
            <Field label={t.settings.fallback} value={form.fallbackUrl} placeholder="https://www.youtube.com/playlist?list=…" onChange={(e) => set({ fallbackUrl: e.target.value })} hint={t.settings.errFallback} invalid={errors.fallbackUrl} />
            <p className="text-[13px] text-sage">{t.settings.fallbackHint}</p>
          </div>
          {aiEnabled && (
            <div className="space-y-1">
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={form.mcIntro} onChange={(e) => set({ mcIntro: e.target.checked })} className="h-5 w-5 accent-amber" />
                {t.settings.mcIntro}
              </label>
              <p className="pl-8 text-[13px] text-sage">{t.settings.mcIntroHint}</p>
            </div>
          )}
          <div className="space-y-1">
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked={form.autoRadio} onChange={(e) => set({ autoRadio: e.target.checked })} className="h-5 w-5 accent-amber" />
              {t.settings.autoRadio}
            </label>
            <p className="pl-8 text-[13px] text-sage">{t.settings.autoRadioHint}</p>
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={form.allowGuestDj} onChange={(e) => set({ allowGuestDj: e.target.checked })} className="h-5 w-5 accent-amber" />
            {t.settings.allowGuestDj}
          </label>
          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {t.settings.save}
          </Button>
        </form>
        <RoomTheme />
        <PinSettings />
        <DeleteRoom />
      </section>
    </div>
  );
}

/** The room's theme: saved as soon as it is picked (not part of the form above). */
function RoomTheme() {
  const t = useT();
  const theme = useRoomTheme();
  const act = useAct();
  const toast = useToast();
  return (
    <section aria-labelledby="room-theme-title" className="space-y-2 border-t border-line/70 px-4 py-4">
      <h3 id="room-theme-title" className="font-semibold">
        {t.theme.roomTitle}
      </h3>
      <p className="text-[13px] text-sage">{t.theme.roomHint}</p>
      <ThemeGrid
        value={theme}
        onPick={async (v) => {
          if (v === 'room' || v === theme) return;
          if (await act('room:settings', { theme: v })) toast(t.theme.saved, 'success');
        }}
      />
    </section>
  );
}

/** The room's owner only (signed in as the account that owns it): delete the room. */
function DeleteRoom() {
  const t = useT();
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
        <Trash2 className="h-4 w-4" aria-hidden /> {t.deleteRoom.section}
      </h3>
      <p className="text-[13px] text-sage">{t.deleteRoom.sectionHint}</p>
      <Button variant="danger" className="w-full" onClick={() => setOpen(true)}>
        {t.deleteRoom.open}
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
            toast(t.deleteRoom.done(name), 'success');
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
  const t = useT();
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
    toast(t.settings.pinSaved, 'success');
    setPin('');
    setTouched(false);
  }

  return (
    <form onSubmit={save} className="space-y-3 border-t border-line/70 px-4 py-4" noValidate>
      <h3 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4 text-sage" aria-hidden /> {t.settings.pinTitle}
      </h3>
      <p className={`text-[13px] ${hasPin ? 'text-sage' : 'rounded-box border border-amber/35 bg-amber/10 p-3 text-paper'}`}>
        {hasPin ? t.settings.pinHint : t.settings.pinMissing}
      </p>
      <PinField label={t.settings.pinNew} value={pin} onChange={setPin} autoComplete="new-password" invalid={touched && !isPin(pin)} />
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
        {t.settings.pinSave}
      </Button>
    </form>
  );
}
