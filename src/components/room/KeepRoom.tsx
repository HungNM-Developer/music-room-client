'use client';

import { ShieldCheck } from 'lucide-react';
import { useCallback } from 'react';
import { GoogleButton } from '@/components/account/GoogleButton';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAct } from '@/hooks/useAct';
import { useT } from '@/i18n';
import { useMe, useRoom } from '@/state/hooks';

/** One request at a time (double clicks, the banner and the settings). */
let keeping: Promise<unknown> | null = null;

/**
 * A room nobody owns: a signed-in admin keeps it (`room:claim-owner`), so it is tied to their
 * account and never deleted as unused. Always a click of its own, never a side effect of
 * signing in: Google keeps one sign-in callback per page, so any Google button would claim.
 */
export function useKeepRoom(): () => Promise<void> {
  const t = useT();
  const act = useAct();
  const toast = useToast();
  return useCallback(async () => {
    if (keeping) return;
    keeping = act('room:claim-owner', {});
    try {
      if (await keeping) toast(t.keepRoom.kept, 'success');
    } finally {
      keeping = null;
    }
  }, [act, toast, t]);
}

/** Admins of a room with no owner. */
export function useCanKeepRoom(): boolean {
  const me = useMe();
  const orphan = useRoom((s) => Boolean(s.snapshot && s.snapshot.room.ownerUserId === null));
  return orphan && me?.role === 'ADMIN' && !me.isDevice;
}

/** Top of the Settings tab while the room has no owner: "Giữ phòng", in the notice's colours. */
export function KeepRoomSection() {
  const t = useT();
  const user = useRoom((s) => s.user);
  const canKeep = useCanKeepRoom();
  const keep = useKeepRoom();
  if (!canKeep) return null;
  return (
    <section className="space-y-3 rounded-panel border border-amber/35 bg-amber/10 p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-4 w-4 text-amber" aria-hidden /> {t.keepRoom.section}
      </h3>
      <p className="text-[13px] text-sage">{t.keepRoom.hint}</p>
      {user ? (
        <Button variant="primary" className="w-full" onClick={() => void keep()}>
          {t.keepRoom.keep}
        </Button>
      ) : (
        <>
          <p className="text-[13px] text-sage">{t.keepRoom.signInHint}</p>
          <GoogleButton width={260} />
        </>
      )}
    </section>
  );
}
