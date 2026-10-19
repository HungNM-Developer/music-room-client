'use client';

import { useState } from 'react';
import { readableInk } from '@/lib/readable-ink';

/**
 * The member's Google picture when they signed in with Google, else their initial on their room
 * colour; with an online dot. A picture that fails to load falls back to the initial.
 */
export function Avatar({
  name,
  color,
  online,
  size = 36,
  src,
}: {
  name: string;
  color: string;
  online?: boolean;
  size?: number;
  src?: string | null;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const picture = src && broken !== src ? src : null;
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Google account picture
        <img
          src={picture}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(picture)}
          className="h-full w-full rounded-full object-cover"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span
          className="type-display flex h-full w-full items-center justify-center rounded-full text-[15px] font-bold"
          style={{ backgroundColor: color, color: readableInk(color) }}
        >
          {name.trim().slice(0, 1).toUpperCase()}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel ${online ? 'bg-online' : 'bg-line'}`}
        />
      )}
    </span>
  );
}
