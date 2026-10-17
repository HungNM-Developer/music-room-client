'use client';

import { Dialog } from '@/components/ui/Dialog';
import { useT } from '@/i18n';
import { logLine } from '@/i18n/activity';
import { formatClock } from '@/lib/time';
import { useRoom } from '@/state/hooks';

export function ActivityLog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const logs = useRoom((s) => s.logs);
  return (
    <Dialog open onClose={onClose} title={t.log.title} closeLabel={t.log.close}>
      <ol className="max-h-[60dvh] space-y-2.5 overflow-y-auto overscroll-contain text-[14px]">
        {logs.length === 0 && <li className="text-sage">{t.log.empty}</li>}
        {logs.map((l) => {
          const line = logLine(l, t);
          return (
            <li key={l.id} className="flex gap-3">
              <time dateTime={l.createdAt} className="type-display shrink-0 pt-px text-sage tabular-nums">
                {formatClock(l.createdAt)}
              </time>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {line.actor && <strong className="font-semibold">{line.actor} </strong>}
                {line.text}
              </span>
            </li>
          );
        })}
      </ol>
    </Dialog>
  );
}
