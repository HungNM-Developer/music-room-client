/** Placeholder shapes while the first snapshot is on its way (slow / waking server). */
export function RoomSkeleton() {
  const bar = 'rounded-full bg-panel-hi motion-safe:animate-pulse';
  return (
    <div className="space-y-5" aria-hidden>
      <div className="rounded-panel bg-panel p-4 sm:p-5">
        <div className={`h-6 w-24 ${bar}`} />
        <div className="mt-3 flex gap-3.5">
          <div className="h-[76px] w-[76px] shrink-0 rounded-row bg-panel-hi motion-safe:animate-pulse" />
          <div className="flex-1 space-y-2 pt-1">
            <div className={`h-5 w-4/5 ${bar}`} />
            <div className={`h-4 w-1/2 ${bar}`} />
          </div>
        </div>
        <div className={`mt-6 h-8 w-full rounded-row bg-panel-hi motion-safe:animate-pulse`} />
      </div>
      <div className="space-y-2">
        <div className={`h-5 w-28 ${bar}`} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-panel bg-panel p-2.5">
            <div className="h-11 w-11 rounded-[10px] bg-panel-hi motion-safe:animate-pulse" />
            <div className={`h-4 flex-1 ${bar}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
