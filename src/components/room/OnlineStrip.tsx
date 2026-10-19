'use client';

import { useMemo } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useT } from '@/i18n';
import { useMe, useRoom } from '@/state/hooks';

const SHOWN = 5;

/**
 * ≥1024 px, under the chat: who is in the room right now (people, not the speaker screen) as
 * overlapping pictures and a count. A click opens "Mọi người". Themes restyle `.room-online`.
 */
export function OnlineStrip({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  const me = useMe();
  const members = useRoom((s) => s.snapshot?.members);
  const people = useMemo(() => {
    const here = (members ?? []).filter((m) => m.online && !m.isDevice);
    // You first, then the rest in room order.
    return [...here].sort((a, b) => Number(b.id === me?.id) - Number(a.id === me?.id));
  }, [members, me?.id]);
  if (!people.length) return null;
  const shown = people.slice(0, SHOWN);
  const more = people.length - shown.length;
  return (
    // Between the chat and the tabs: 12 px on each side instead of the column's 20.
    <div className="hidden lg:block" style={{ marginBlock: '-8px 12px' }}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${t.people.title}: ${t.people.online(people.length)}`}
        className="room-online group flex w-full items-center gap-2 rounded-box px-1 py-0.5 text-[13px] text-sage"
      >
        <span className="room-online-faces flex -space-x-2" aria-hidden>
          {shown.map((m) => (
            <span key={m.id} className="room-online-face" title={m.displayName}>
              <Avatar name={m.displayName} color={m.color} size={26} src={m.avatarUrl} />
            </span>
          ))}
        </span>
        {more > 0 && (
          <span className="room-online-more tabular-nums" aria-hidden>
            +{more}
          </span>
        )}
        <span className="room-online-count ml-auto inline-flex items-center gap-1.5 group-hover:text-paper" aria-hidden>
          <span className="room-online-dot" />
          {t.people.online(people.length)}
        </span>
      </button>
    </div>
  );
}
