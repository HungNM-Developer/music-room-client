'use client';

import { X } from 'lucide-react';
import { useRoom } from '@/context/RoomContext';
import { vi } from '@/i18n/vi';
import { formatClock } from '@/lib/time';

export function ActivityLogPopup({ onClose }: { onClose: () => void }) {
  const { logs } = useRoom();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="log-title" className="w-full max-w-lg max-h-[80dvh] flex flex-col glass-effect rounded-[2rem] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 id="log-title" className="text-lg font-black">{vi.log.title}</h2>
          <button type="button" aria-label={vi.log.close} onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <ol className="overflow-y-auto space-y-2 text-sm">
          {logs.length === 0 && <li className="text-slate-500">{vi.log.empty}</li>}
          {logs.map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="text-slate-500 tabular-nums shrink-0">{formatClock(l.createdAt)}</span>
              <span>
                {l.displayName && <strong className="font-semibold">{l.displayName} </strong>}
                {l.message}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
