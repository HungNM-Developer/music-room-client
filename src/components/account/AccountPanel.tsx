'use client';

import { Crown, LogOut, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { MyRoomView } from '@/contracts';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { DeleteRoomDialog } from '@/components/room/DeleteRoomDialog';
import { errorMessage, vi } from '@/i18n/vi';
import { GoogleButton } from './GoogleButton';

/** L1 / L6 on the home page: sign in, or the account with "Phòng của tôi". */
export function AccountPanel() {
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

  if (!user) {
    if (!clientId) return null;
    return (
      <div className="space-y-3 rounded-panel bg-panel/70 p-5">
        <p className="text-[14px] text-sage">{vi.account.signInNote}</p>
        <GoogleButton />
      </div>
    );
  }

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
            toast(vi.account.signedOut, 'info');
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden /> {vi.account.signOut}
        </Button>
      </div>

      <section aria-labelledby="my-rooms">
        <h2 id="my-rooms" className="type-display mb-2 text-[18px] font-bold">
          {vi.account.myRooms}
        </h2>
        {rooms && rooms.length === 0 && <p className="text-[14px] text-sage">{vi.account.myRoomsEmpty}</p>}
        {rooms && rooms.length > 0 && (
          <ul className="divide-y divide-line/70">
            {rooms.map((r) => (
              <li key={r.code} className="flex items-center gap-1">
                <Link href={`/r/${r.code}`} aria-label={vi.account.open(r.name)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 hover:text-amber">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{r.name}</span>
                      {r.isOwner && <Crown className="h-3.5 w-3.5 shrink-0 text-amber" aria-label={vi.account.owner} />}
                    </span>
                    <span className="block truncate text-[12px] text-sage">
                      {r.nowPlaying ? vi.account.playing(r.nowPlaying) : vi.account.online(r.onlineCount)}
                    </span>
                  </span>
                  <span className="type-display shrink-0 text-[14px] tracking-[0.12em] text-sage">{r.code}</span>
                </Link>
                {r.isOwner && (
                  <IconButton label={vi.deleteRoom.more(r.name)} onClick={() => setDeleting(r)} className="text-sage hover:text-alert">
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
            toast(vi.deleteRoom.done(deleting.name), 'success');
            return true;
          }}
        />
      )}
    </div>
  );
}
