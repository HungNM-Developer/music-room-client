import { readableInk } from '@/lib/readable-ink';

/** Member initial on their room colour, with an online dot. */
export function Avatar({ name, color, online, size = 36 }: { name: string; color: string; online?: boolean; size?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <span
        className="type-display flex h-full w-full items-center justify-center rounded-full text-[15px] font-bold"
        style={{ backgroundColor: color, color: readableInk(color) }}
      >
        {name.trim().slice(0, 1).toUpperCase()}
      </span>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel ${online ? 'bg-online' : 'bg-line'}`}
        />
      )}
    </span>
  );
}
