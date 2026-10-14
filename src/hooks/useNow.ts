'use client';

import { useEffect, useState } from 'react';

/** Re-renders every `ms` with the current time (progress bars). */
export function useNow(ms = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
