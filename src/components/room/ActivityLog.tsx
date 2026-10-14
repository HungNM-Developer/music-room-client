'use client';

import { Dialog } from '@/components/ui/Dialog';
import { vi } from '@/i18n/vi';
import { formatClock } from '@/lib/time';
import { useRoom } from '@/state/hooks';

export function ActivityLog({ onClose }: { onClose: () => void }) {
  const logs = useRoom((s) => s.logs);
  return (
    <Dialog open onClose={onClose} title={vi.log.title} closeLabel={vi.log.close}>
      <ol className="max-h-[60dvh] space-y-2.5 overflow-y-auto overscroll-contain text-[14px]">
        {logs.length === 0 && <li className="text-sage">{vi.log.empty}</li>}
        {logs.map((l) => (
          <li key={l.id} className="flex gap-3">
            <time dateTime={l.createdAt} className="type-display shrink-0 pt-px text-sage tabular-nums">
              {formatClock(l.createdAt)}
            </time>
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {l.displayName && <strong className="font-semibold">{l.displayName} </strong>}
              {l.message}
            </span>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
