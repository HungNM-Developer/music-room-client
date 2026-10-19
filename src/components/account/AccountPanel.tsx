'use client';

import { Crown, LogOut, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { MyRoomView, RoomStatusView } from '@/contracts';
import { forgetRoom, forgetRooms, type LocalRoom, localRooms, onLocalRooms, renameRooms } from '@/lib/local-rooms';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { DeleteRoomDialog } from '@/components/room/DeleteRoomDialog';
import { errorMessage, useT } from '@/i18n';

/** L1 / L6 on the home page: sign in, or the account with "Phòng của tôi". */
export function AccountPanel() {
  const t = useT();
  const user = useRoom((s) => s.user);
  const clientId = useRoom((s) => s.health?.googleClientId ?? null);
  const toast = useToast();
  const [rooms, setRooms] = useState<MyRoomView[] | null>(null);
  const [deleting, setDeleting] = useState<MyRoomView | null>(null);

  useEffect(() => room.start(), []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void room.send('me:rooms', {}).then((r) => {
      if (alive) setRooms(r.ok ? r.data.rooms : []);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return <GuestPanel signIn={Boolean(clientId)} />;

  return (
    <div className="space-y-4 rounded-panel bg-panel/70 p-5">
      <div className="flex items-center gap-3">
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google avatar, tiny, no optimisation needed
          <img src={user.picture} alt="" width={40} height={40} referrerPolicy="no-referrer" className="h-10 w-10 rounded-full" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-hi font-bold">{user.name.slice(0, 1)}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-[13px] text-sage">{user.email}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            room.signOut();
            setRooms(null);
            toast(t.account.signedOut, 'info');
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden /> {t.account.signOut}
        </Button>
      </div>

      <section aria-labelledby="my-rooms">
        <h2 id="my-rooms" className="type-display mb-2 text-[18px] font-bold">
          {t.account.myRooms}
        </h2>
        {rooms && rooms.length === 0 && <p className="text-[14px] text-sage">{t.account.myRoomsEmpty}</p>}
        {rooms && rooms.length > 0 && (
          <ul className="divide-y divide-line/70">
            {rooms.map((r) => (
              <li key={r.code} className="flex items-center gap-1">
                <Link href={`/r/${r.code}`} aria-label={t.account.open(r.name)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 hover:text-amber">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{r.name}</span>
                      {r.isOwner && <Crown className="h-3.5 w-3.5 shrink-0 text-amber" aria-label={t.account.owner} />}
                    </span>
                    <span className="block truncate text-[12px] text-sage">
                      {r.nowPlaying ? t.account.playing(r.nowPlaying) : t.account.online(r.onlineCount)}
                    </span>
                  </span>
                  <span className="type-display shrink-0 text-[14px] tracking-[0.12em] text-sage">{r.code}</span>
                </Link>
                {r.isOwner && (
                  <IconButton label={t.deleteRoom.more(r.name)} onClick={() => setDeleting(r)} className="text-sage hover:text-alert">
                    <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {deleting && (
        <DeleteRoomDialog
          name={deleting.name}
          code={deleting.code}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const r = await room.send('me:room-delete', { code: deleting.code });
            if (!r.ok) {
              toast(errorMessage(r.error.code, r.error.params), 'error');
              return false;
            }
            // This browser may still hold a session in that room (Back from the room page).
            if (room.getState().code === deleting.code) room.forgetDeletedRoom();
            setRooms((list) => list?.filter((x) => x.code !== deleting.code) ?? null);
            toast(t.deleteRoom.done(deleting.name), 'success');
            return true;
          }}
        />
      )}
    </div>
  );
}

const NO_ROOMS: LocalRoom[] = [];

/**
 * Not signed in: "Phòng của tôi" from this device (sign-in itself sits in the home form) —
 * rooms created or joined here, with who is online and the song on air from the server.
 * Kept apart from the account's list.
 */
function GuestPanel({ signIn }: { signIn: boolean }) {
  const t = useT();
  const rooms = useSyncExternalStore(onLocalRooms, localRooms, () => NO_ROOMS);
  const [status, setStatus] = useState<Map<string, RoomStatusView>>(new Map());
  const codes = rooms.map((r) => r.code).join(',');

  // The rooms as they are now; rooms the server no longer has leave the list.
  useEffect(() => {
    if (!codes) return;
    let alive = true;
    void room.send('rooms:status', { codes: codes.split(',') }).then((r) => {
      if (!alive || !r.ok) return;
      const found = new Map(r.data.rooms.map((x) => [x.code, x]));
      setStatus(found);
      forgetRooms(codes.split(',').filter((c) => !found.has(c)));
      renameRooms(new Map(r.data.rooms.map((x) => [x.code, x.name])));
    });
    return () => {
      alive = false;
    };
  }, [codes]);

  if (!rooms.length) return null;
  return (
    <div className="space-y-4 rounded-panel bg-panel/70 p-5">
      {rooms.length > 0 && (
        <section aria-labelledby="my-rooms">
          <h2 id="my-rooms" className="type-display text-[18px] font-bold">
            {t.account.myRooms}
          </h2>
          <p className="mb-2 text-[12px] text-sage">{signIn ? t.account.onDevice : t.account.onDeviceNoSignIn}</p>
          <ul className="divide-y divide-line/70">
            {rooms.map((r) => {
              const now = status.get(r.code);
              return (
                <li key={r.code} className="flex items-center gap-1">
                  <Link href={`/r/${r.code}`} aria-label={t.account.open(r.name)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 hover:text-amber">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="truncate">{r.name}</span>
                        {r.admin && <Crown className="h-3.5 w-3.5 shrink-0 text-amber" aria-label={t.account.admin} />}
                      </span>
                      {now && (
                        <span className="block truncate text-[12px] text-sage">
                          {now.nowPlaying ? t.account.playing(now.nowPlaying) : t.account.online(now.onlineCount)}
                        </span>
                      )}
                    </span>
                    <span className="type-display shrink-0 text-[14px] tracking-[0.12em] text-sage">{r.code}</span>
                  </Link>
                  <IconButton label={t.account.forget(r.name)} onClick={() => forgetRoom(r.code)} className="text-sage hover:text-paper">
                    <X className="h-[18px] w-[18px]" aria-hidden />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
