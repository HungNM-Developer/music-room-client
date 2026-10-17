'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { tr } from '@/i18n';
import { useRoom } from '@/state/hooks';

/**
 * The owner deleted the room while this page was open (members and the speaker page):
 * say so and go home. The name is remembered because the snapshot is cleared on revoke.
 */
export function useRoomDeleted(): void {
  const router = useRouter();
  const toast = useToast();
  const revoked = useRoom((s) => s.revoked);
  const name = useRoom((s) => s.snapshot?.room.name ?? null);
  const lastName = useRef<string | null>(null);

  useEffect(() => {
    if (name) lastName.current = name;
  }, [name]);

  useEffect(() => {
    if (revoked !== 'room_deleted') return;
    toast(tr().banners.roomDeleted(lastName.current), 'info');
    router.replace('/');
  }, [revoked, router, toast]);
}
