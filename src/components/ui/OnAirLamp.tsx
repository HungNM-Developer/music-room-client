/** The studio "on air" lamp: lit red while playing, dark when paused or idle. */
export function OnAirLamp({ live, children }: { live: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        live ? 'bg-onair-deep text-paper' : 'border border-line text-sage'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${live ? 'bg-paper motion-safe:animate-pulse' : 'bg-line'}`} aria-hidden />
      {children}
    </span>
  );
}
