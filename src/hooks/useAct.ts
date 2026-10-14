'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { CommandName, CommandPayload } from '@/contracts';
import { errorMessage } from '@/i18n/vi';
import type { CommandResult } from '@/lib/socket';
import { room } from '@/state/room-store';

/** Sends a command; on failure shows the exact Vietnamese message and returns null. */
export function useAct() {
  const toast = useToast();
  return useCallback(
    async <K extends CommandName>(
      name: K,
      payload: CommandPayload<K>,
      opts: { silent?: boolean } = {},
    ): Promise<CommandResult<K> | null> => {
      const r = await room.send(name, payload);
      if (r.ok) return r.data;
      if (!opts.silent) toast(errorMessage(r.error.code, r.error.params), 'error');
      return null;
    },
    [toast],
  );
}
