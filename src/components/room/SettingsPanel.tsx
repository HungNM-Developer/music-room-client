'use client';

import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useRoom } from '@/context/RoomContext';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { fromForm, type SettingsErrors, type SettingsForm, toForm } from '@/lib/settings-form';

export function SettingsPanel() {
  const { snapshot, me } = useRoom();
  const act = useAct();
  const toast = useToast();
  const settings = snapshot?.room.settings;
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
    <details className="glass-effect rounded-[2rem] p-4 md:p-6 group">
      <summary className="cursor-pointer text-sm font-black uppercase tracking-widest text-slate-300">{vi.settings.title}</summary>
      <form onSubmit={save} className="mt-4 space-y-4" noValidate>
        <Field label={vi.settings.skipThreshold} inputMode="numeric" value={form.thresholdPct} onChange={(e) => set({ thresholdPct: e.target.value })} hint={vi.settings.errThreshold} showHint={errors.thresholdPct} />
        <Field label={vi.settings.maxQueued} inputMode="numeric" value={form.maxQueued} onChange={(e) => set({ maxQueued: e.target.value })} hint={vi.settings.errQueued} showHint={errors.maxQueued} />
        <Field label={vi.settings.maxDuration} inputMode="numeric" value={form.maxMinutes} onChange={(e) => set({ maxMinutes: e.target.value })} hint={vi.settings.errDuration} showHint={errors.maxMinutes} />
        <Field label={vi.settings.fallback} value={form.fallbackUrl} placeholder="https://www.youtube.com/playlist?list=…" onChange={(e) => set({ fallbackUrl: e.target.value })} hint={vi.settings.errFallback} showHint={errors.fallbackUrl} />
        <p className="text-xs text-slate-500 -mt-2">{vi.settings.fallbackHint}</p>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={form.allowGuestDj} onChange={(e) => set({ allowGuestDj: e.target.checked })} className="w-5 h-5 accent-indigo-500" />
          {vi.settings.allowGuestDj}
        </label>
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">{vi.settings.save}</button>
      </form>
    </details>
  );
}
