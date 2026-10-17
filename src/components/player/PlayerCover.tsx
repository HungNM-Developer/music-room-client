'use client';

import './player-cover.css';

/**
 * A card over the video area (no song, the sound on another device, the player moved away):
 * an icon, one short line, the actions, an optional small note. Each theme dresses it in
 * player-cover.css; the default theme uses the plain tokens.
 */
export function PlayerCover({
  icon,
  title,
  note,
  children,
  className = '',
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  note?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`player-cover absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 overflow-hidden p-3 text-center sm:gap-3 sm:p-5 ${className}`}>
      <span className="pc-icon" aria-hidden>
        {icon}
      </span>
      <p className="pc-title type-display">{title}</p>
      {children && <div className="pc-actions flex w-full max-w-md flex-col items-center gap-1 sm:gap-2">{children}</div>}
      {note && <p className="pc-note">{note}</p>}
    </div>
  );
}
