'use client';

import { ChevronDown, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { fromForm, type SettingsErrors, type SettingsForm, toForm } from '@/lib/settings-form';
import { useMe, useRoom } from '@/state/hooks';

export function SettingsPanel() {
  const settings = useRoom((s) => s.snapshot?.room.settings);
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
      <form onSubmit={save} className="space-y-4 px-4 pb-4" noValidate>
        <Field label={vi.settings.skipThreshold} inputMode="numeric" value={form.thresholdPct} onChange={(e) => set({ thresholdPct: e.target.value })} hint={vi.settings.errThreshold} invalid={errors.thresholdPct} />
        <Field label={vi.settings.maxQueued} inputMode="numeric" value={form.maxQueued} onChange={(e) => set({ maxQueued: e.target.value })} hint={vi.settings.errQueued} invalid={errors.maxQueued} />
        <Field label={vi.settings.maxDuration} inputMode="numeric" value={form.maxMinutes} onChange={(e) => set({ maxMinutes: e.target.value })} hint={vi.settings.errDuration} invalid={errors.maxMinutes} />
        <div className="space-y-1.5">
          <Field label={vi.settings.fallback} value={form.fallbackUrl} placeholder="https://www.youtube.com/playlist?list=…" onChange={(e) => set({ fallbackUrl: e.target.value })} hint={vi.settings.errFallback} invalid={errors.fallbackUrl} />
          <p className="text-[13px] text-sage">{vi.settings.fallbackHint}</p>
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={form.allowGuestDj} onChange={(e) => set({ allowGuestDj: e.target.checked })} className="h-5 w-5 accent-amber" />
          {vi.settings.allowGuestDj}
        </label>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {vi.settings.save}
        </Button>
      </form>
    </details>
  );
}
