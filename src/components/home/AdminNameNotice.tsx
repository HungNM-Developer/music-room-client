'use client';

import { ShieldCheck } from 'lucide-react';
import { PinField } from '@/components/ui/PinField';
import { vi } from '@/i18n/vi';

/**
 * The typed name belongs to the room's admin, who is offline (PIN_REQUIRED). Most people
 * who see this simply picked the same name: offer another name first, the PIN second.
 */
export function AdminNameNotice({
  name,
  pin,
  onPin,
  onOtherName,
}: {
  name: string;
  pin: string;
  onPin: (pin: string) => void;
  onOtherName: () => void;
}) {
  return (
    <div role="status" className="space-y-3 rounded-row border border-amber/40 bg-amber/10 p-3.5">
      <p className="flex gap-2 text-[14px]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
        <span>{vi.adminName.taken(name.trim())}</span>
      </p>
      <button
        type="button"
        onClick={onOtherName}
        className="flex min-h-11 w-full items-center justify-center rounded-row border border-line px-3 text-[14px] font-semibold hover:bg-panel-hi"
      >
        {vi.adminName.otherName}
      </button>
      <div className="space-y-1.5">
        <p className="text-[13px] text-sage">{vi.adminName.isYou}</p>
        <PinField value={pin} onChange={onPin} autoFocus />
      </div>
    </div>
  );
}
