'use client';

import { useRoomDeleted } from '@/hooks/useRoomDeleted';
import { Radio } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HostScreen } from '@/components/host/HostScreen';
import { triggerReaction } from '@/components/room/HeartCanvas';
import { Button } from '@/components/ui/Button';
import { normalizeRoomCode } from '@/contracts/text';
import { getToken } from '@/lib/session-store';
import { errorMessage, useT } from '@/i18n';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/** /r/CODE/host — the speaker device (D8, TC-120…TC-131). */
export default function HostPage() {
  const t = useT();
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? '');
  const memberId = useRoom((s) => s.memberId);
  const connection = useRoom((s) => s.connection);
  const revoked = useRoom((s) => s.revoked);
  // No PIN: any browser with the room code becomes the speaker. Registration runs
  // automatically; a failure (network, unknown room) shows the reason and a retry.
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const needsLogin = connection === 'connected' && !memberId;

  useRoomDeleted();
  useEffect(() => room.enter(code, 'host'), [code]);
  useEffect(
    () => room.onReaction((e) => triggerReaction(window.innerWidth * (0.1 + Math.random() * 0.8), window.innerHeight - 80, e.emoji)),
    [],
  );

  useEffect(() => {
    if (!needsLogin) return;
    // A saved device token resumes the same speaker: session:ready follows the connect
    // event a moment later. Registering in that gap made every reload a new device while
    // the room's player stayed the old, offline one. Register only without a token or
    // after the server rejected it (session:revoked clears it and sets `revoked`).
    if (getToken(code, 'host') && !revoked) return;
    void (async () => {
      const r = await room.send('host:register', { code });
      if (!r.ok) setFailure(errorMessage(r.error.code, r.error.params));
    })();
  }, [needsLogin, code, attempt, revoked]);

  if (needsLogin && failure) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-5 rounded-panel bg-panel p-6 text-center sm:p-8">
          <p role="alert">{failure}</p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              setFailure(null);
              setAttempt((n) => n + 1);
            }}
          >
            {t.host.retry}
          </Button>
        </div>
      </main>
    );
  }
  if (needsLogin) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="flex items-center gap-2 text-sage" role="status">
          <Radio className="h-5 w-5 text-amber motion-safe:animate-pulse" aria-hidden /> {t.host.opening}
        </p>
      </main>
    );
  }
  return <HostScreen code={code} />;
}
