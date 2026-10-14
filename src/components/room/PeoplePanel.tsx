'use client';

import { MoreVertical, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useRoom } from '@/context/RoomContext';
import type { MemberView } from '@/contracts';
import { PinSchema } from '@/contracts';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>{children}</span>;
}

function MemberMenu({ m, onKick }: { m: MemberView; onKick: (m: MemberView) => void }) {
  const act = useAct();
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Pick<MemberView, 'canControl' | 'canDj' | 'canPlay'>> & { role?: 'ADMIN' | 'USER' }) => {
    setOpen(false);
    void act('permission:set', { memberId: m.id, ...patch });
  };
  return (
    <>
      <button
        type="button"
        aria-label={`${vi.people.menu}: ${m.displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="rounded-xl p-2 text-slate-400 hover:text-white"
      >
        <MoreVertical className="w-4 h-4" aria-hidden />
      </button>
      {open && (
        // Bottom sheet: easier to hit on phones than a dropdown near the tab bar.
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            role="menu"
            aria-label={m.displayName}
            className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-surface-800 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-2 text-sm font-bold text-slate-300">{m.displayName}</p>
            {!m.isDevice && (
              <>
                <MenuItem onClick={() => set({ canControl: !m.canControl })}>
                  {m.canControl ? vi.people.revokeControl : vi.people.grantControl}
                </MenuItem>
                <MenuItem onClick={() => set({ canDj: !m.canDj })}>{m.canDj ? vi.people.revokeDj : vi.people.grantDj}</MenuItem>
                {!m.canPlay && <MenuItem onClick={() => set({ canPlay: true })}>{vi.people.makePlayer}</MenuItem>}
                <MenuItem onClick={() => set({ role: m.role === 'ADMIN' ? 'USER' : 'ADMIN' })}>
                  {m.role === 'ADMIN' ? vi.people.revokeAdmin : vi.people.grantAdmin}
                </MenuItem>
              </>
            )}
            <MenuItem
              danger
              onClick={() => {
                setOpen(false);
                onKick(m);
              }}
            >
              {vi.people.kick}
            </MenuItem>
            <MenuItem onClick={() => setOpen(false)}>{vi.people.cancel}</MenuItem>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-white/10 ${danger ? 'text-red-300' : 'text-slate-100'}`}
    >
      {children}
    </button>
  );
}

export function PeoplePanel() {
  const { snapshot, me } = useRoom();
  const act = useAct();
  const [kick, setKick] = useState<MemberView | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [pin, setPin] = useState('');
  const members = [...(snapshot?.members ?? [])].sort(
    (a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName, 'vi'),
  );
  const isAdmin = me?.role === 'ADMIN';
  const online = members.filter((m) => m.online).length;

  return (
    <section aria-labelledby="people-title" className="glass-effect rounded-[2rem] p-4 md:p-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="people-title" className="text-sm font-black uppercase tracking-widest text-slate-300">
          {vi.people.title} <span className="text-slate-500 normal-case tracking-normal font-medium">· {online} {vi.people.online}</span>
        </h2>
        {me && !isAdmin && !me.isDevice && (
          <button type="button" onClick={() => setClaimOpen(true)} className="btn-secondary !px-3 !py-1.5 text-xs">
            <ShieldCheck className="w-4 h-4" aria-hidden /> {vi.people.claimAdmin}
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-white/[0.03]">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-black/80 shrink-0"
              style={{ backgroundColor: m.color }}
              aria-hidden
            >
              {m.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${m.online ? 'bg-emerald-400' : 'bg-slate-600'}`} aria-label={m.online ? 'online' : 'offline'} />
                {m.displayName} {m.id === me?.id && <span className="text-slate-400 font-normal">{vi.people.you}</span>}
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {m.role === 'ADMIN' && <Badge tone="bg-amber-400/20 text-amber-200">{vi.people.badges.admin}</Badge>}
                {(m.canPlay || snapshot?.player.memberId === m.id) && <Badge tone="bg-emerald-400/20 text-emerald-200">{vi.people.badges.player}</Badge>}
                {m.canControl && m.role !== 'ADMIN' && <Badge tone="bg-sky-400/20 text-sky-200">{vi.people.badges.control}</Badge>}
                {m.canDj && m.role !== 'ADMIN' && <Badge tone="bg-fuchsia-400/20 text-fuchsia-200">{vi.people.badges.dj}</Badge>}
              </div>
            </div>
            {isAdmin && m.id !== me?.id && <MemberMenu m={m} onKick={setKick} />}
          </li>
        ))}
      </ul>

      {kick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-labelledby="kick-title">
          <div className="w-full max-w-sm glass-effect rounded-[2rem] p-6 space-y-4">
            <p id="kick-title" className="text-lg font-bold">{vi.people.kickConfirm(kick.displayName)}</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setKick(null)}>{vi.people.cancel}</button>
              <button
                type="button"
                className="btn-primary flex-1 !bg-none !bg-red-500"
                onClick={async () => {
                  const target = kick;
                  setKick(null);
                  await act('member:kick', { memberId: target.id });
                }}
              >
                {vi.people.kickYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {claimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-title"
            className="w-full max-w-sm glass-effect rounded-[2rem] p-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await act('admin:claim', { pin });
              if (ok) {
                setClaimOpen(false);
                setPin('');
              }
            }}
          >
            <h2 id="claim-title" className="text-lg font-bold">{vi.people.claimTitle}</h2>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              type="password"
              maxLength={8}
              autoFocus
              aria-label={vi.people.claimTitle}
              className="w-full input-field text-center tracking-[0.5em] text-xl"
            />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setClaimOpen(false)}>{vi.people.cancel}</button>
              <button type="submit" disabled={!PinSchema.safeParse(pin).success} className="btn-primary flex-1 disabled:opacity-50">
                {vi.people.claimSubmit}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
