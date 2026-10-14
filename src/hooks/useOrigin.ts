'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** window.location.origin on the client, '' during SSR — without a hydration mismatch. */
export function useOrigin(): string {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => '',
  );
}
