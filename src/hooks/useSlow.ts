'use client';

import { useEffect, useState } from 'react';

/** True once `active` has stayed true for `ms` — for "still working…" hints on slow servers. */
export function useSlow(active: boolean, ms = 2500): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [active, ms]);
  return active && slow;
}
