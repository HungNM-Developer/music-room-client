/** The studio "on air" lamp: lit red while playing, dark when paused or idle. */
export function OnAirLamp({ live, children, className = '' }: { live: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span
      // Same border in both states (transparent when live), so switching never shifts the layout.
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
        live ? 'border-transparent bg-onair-deep text-paper' : 'border-line text-sage'
      } ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${live ? 'bg-paper motion-safe:animate-pulse' : 'bg-line'}`} aria-hidden />
      {children}
    </span>
  );
}
