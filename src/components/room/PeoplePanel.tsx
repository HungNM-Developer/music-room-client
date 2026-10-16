'use client';

import { ChevronDown, KeyRound, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Dialog, SheetAction } from '@/components/ui/Dialog';
import { PinField } from '@/components/ui/PinField';
import { useToast } from '@/components/ui/Toast';
import type { MemberView } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { isPin } from '@/lib/validate';
import { useMe, useRoom } from '@/state/hooks';
import { applyMembers } from '@/state/optimistic';

function Badge({ children, tone }: { children: React.ReactNode; tone: 'amber' | 'onair' | 'plain' }) {
  const tones = {
    amber: 'border-amber/50 text-amber',
    onair: 'border-onair/60 text-alert',
    plain: 'border-line text-sage',
  };
  return <span className={`rounded-full border px-2 py-px text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function PeoplePanel() {
  const members = useRoom((s) => s.snapshot?.members);
  const pending = useRoom((s) => s.pending);
  const playerId = useRoom((s) => s.snapshot?.player.memberId ?? null);
  const me = useMe();
  const act = useAct();
  const [menuFor, setMenuFor] = useState<MemberView | null>(null);
  const [kick, setKick] = useState<MemberView | null>(null);
  const hasPin = useRoom((s) => s.snapshot?.room.hasPin ?? false);
  const [claiming, setClaiming] = useState(false);
  const sorted = useMemo(
    () =>
      [...applyMembers(members ?? [], pending)].sort(
        (a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName, 'vi', { numeric: true }),
      ),
    [members, pending],
  );
  const isAdmin = me?.role === 'ADMIN';
  const onlineList = sorted.filter((m) => m.online);
  const offlineList = sorted.filter((m) => !m.online);
  const online = onlineList.length;
  // Offline members pile up over days; folded by default so the recap and settings stay close.
  const [showOffline, setShowOffline] = useState(false);

  const setPerm = (m: MemberView, patch: Partial<Pick<MemberView, 'canControl' | 'canDj' | 'canPlay'>> & { role?: 'ADMIN' | 'USER' }) => {
    setMenuFor(null);
    void act('permission:set', { memberId: m.id, ...patch }, { optimistic: { kind: 'perm', memberId: m.id, patch } });
  };

  const row = (m: MemberView) => (
    <li key={m.id} className="flex items-center gap-3 py-2.5 pl-2.5 pr-1">
      <Avatar name={m.displayName} color={m.color} online={m.online} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${m.online ? '' : 'text-sage'}`}>
          {m.displayName} {m.id === me?.id && <span className="font-normal text-sage">{vi.people.you}</span>}
          <span className="sr-only">{m.online ? ', online' : ', offline'}</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-1 empty:hidden">
          {m.role === 'ADMIN' && <Badge tone="amber">{vi.people.badges.admin}</Badge>}
          {(m.canPlay || playerId === m.id) && <Badge tone="onair">{vi.people.badges.player}</Badge>}
          {m.canControl && m.role !== 'ADMIN' && <Badge tone="plain">{vi.people.badges.control}</Badge>}
          {m.canDj && m.role !== 'ADMIN' && <Badge tone="plain">{vi.people.badges.dj}</Badge>}
          {m.listening && m.online && <Badge tone="plain">🎧 {vi.listen.badge}</Badge>}
        </div>
      </div>
      {isAdmin && m.id !== me?.id && (
        <IconButton label={vi.people.menu(m.displayName)} onClick={() => setMenuFor(m)}>
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </IconButton>
      )}
    </li>
  );

  return (
    <section aria-labelledby="people-title">
      <div className="mb-2 px-1">
        <h2 id="people-title" className="type-display text-[20px] font-bold">
          {vi.people.title}
        </h2>
        <p className="text-[13px] text-sage">{vi.people.online(online)}</p>
      </div>
      {me && !isAdmin && !me.isDevice && hasPin && (
        <Button size="sm" className="mb-3 w-full" onClick={() => setClaiming(true)}>
          <KeyRound className="h-4 w-4" aria-hidden /> {vi.people.claimAdmin}
        </Button>
      )}

      {onlineList.length > 0 && (
        <ul className="divide-y divide-line/70 rounded-panel bg-panel px-1">
          {onlineList.map(row)}
        </ul>
      )}

      {offlineList.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={showOffline}
            aria-controls="people-offline"
            onClick={() => setShowOffline((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between rounded-row px-2 text-[14px] font-medium text-sage hover:text-paper"
          >
            {vi.people.offline(offlineList.length)}
            <ChevronDown className={`h-5 w-5 transition-transform ${showOffline ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {showOffline && (
            <ul id="people-offline" className="mt-1 max-h-[50vh] divide-y divide-line/70 overflow-y-auto rounded-panel bg-panel px-1">
              {offlineList.map(row)}
            </ul>
          )}
        </div>
      )}

      {menuFor && (
        <Dialog open onClose={() => setMenuFor(null)} title={vi.people.menu(menuFor.displayName)}>
          <div className="-mx-2 space-y-0.5">
            {!menuFor.isDevice && (
              <>
                <SheetAction onClick={() => setPerm(menuFor, { canControl: !menuFor.canControl })}>
                  {menuFor.canControl ? vi.people.revokeControl : vi.people.grantControl}
                </SheetAction>
                <SheetAction onClick={() => setPerm(menuFor, { canDj: !menuFor.canDj })}>
                  {menuFor.canDj ? vi.people.revokeDj : vi.people.grantDj}
                </SheetAction>
                {!menuFor.canPlay && <SheetAction onClick={() => setPerm(menuFor, { canPlay: true })}>{vi.people.makePlayer}</SheetAction>}
                <SheetAction onClick={() => setPerm(menuFor, { role: menuFor.role === 'ADMIN' ? 'USER' : 'ADMIN' })}>
                  {menuFor.role === 'ADMIN' ? vi.people.revokeAdmin : vi.people.grantAdmin}
                </SheetAction>
              </>
            )}
            <SheetAction
              danger
              onClick={() => {
                setKick(menuFor);
                setMenuFor(null);
              }}
            >
              {vi.people.kick}
            </SheetAction>
          </div>
        </Dialog>
      )}

      {kick && (
        <Dialog open onClose={() => setKick(null)} title={vi.people.kickConfirm(kick.displayName)}>
          <p className="text-sage">{vi.people.kickNote}</p>
          <div className="mt-5 flex gap-2">
            <Button className="flex-1" onClick={() => setKick(null)}>
              {vi.people.cancel}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                const target = kick;
                setKick(null);
                await act('member:kick', { memberId: target.id }, { optimistic: { kind: 'kick', memberId: target.id } });
              }}
            >
              {vi.people.kickYes}
            </Button>
          </div>
        </Dialog>
      )}
      {claiming && <ClaimAdminDialog onClose={() => setClaiming(false)} />}
    </section>
  );
}

/** Any member who knows the room PIN becomes admin (admin:claim). */
function ClaimAdminDialog({ onClose }: { onClose: () => void }) {
  const act = useAct();
  const toast = useToast();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPin(pin) || busy) return;
    setBusy(true);
    // Wrong PIN / lockout messages come back as toasts; the dialog stays open to retry.
    const ok = await act('admin:claim', { pin });
    setBusy(false);
    if (!ok) return;
    toast(vi.people.claimed, 'success');
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title={vi.people.claimAdmin}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sage">{vi.people.claimNote}</p>
        <PinField value={pin} onChange={setPin} />
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onClose}>
            {vi.people.cancel}
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={!isPin(pin) || busy} aria-busy={busy}>
            {vi.people.claimSubmit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
