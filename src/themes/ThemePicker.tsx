'use client';

import { Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { useT } from '@/i18n';
import { setPersonalTheme, usePersonalTheme } from './personal';
import { THEME_GROUPS, THEMES, type ThemeId, type ThemeMeta, themeMeta } from './registry';
import { useRoomTheme } from './useTheme';

type Choice = ThemeId | 'room';

/** A small picture of the theme: its page colour, a panel and the accent. */
function Swatch({ meta }: { meta: ThemeMeta }) {
  const { bg, panel, accent, text } = meta.swatch;
  return (
    <span aria-hidden className="relative block h-14 w-full overflow-hidden rounded-[10px] border border-black/10" style={{ background: bg }}>
      <span className="absolute inset-x-2 bottom-2 top-5 rounded-md" style={{ background: panel }} />
      <span className="absolute left-3.5 top-7 h-1.5 w-10 rounded-full" style={{ background: text, opacity: 0.85 }} />
      <span className="absolute bottom-3.5 left-3.5 h-1.5 w-6 rounded-full" style={{ background: accent }} />
      <span className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
    </span>
  );
}

function Card({ meta, label, selected, onPick }: { meta: ThemeMeta; label: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className={`group relative flex flex-col gap-1.5 rounded-row border p-1.5 text-left transition-colors ${
        selected ? 'border-amber bg-panel-hi' : 'border-line hover:border-sage/60'
      }`}
    >
      <Swatch meta={meta} />
      <span className="flex min-h-8 items-center gap-1 px-1 text-[13px] font-medium leading-tight">
        <span className="flex-1">{label}</span>
        {selected && <Check className="h-4 w-4 shrink-0 text-amber" aria-hidden />}
      </span>
    </button>
  );
}

/**
 * The 13 themes as preview cards, grouped. With `followRoom` the first card is
 * "Theo phòng (<room theme>)" (a person's own choice); without it, the room's own picker.
 */
export function ThemeGrid({ value, onPick, followRoom }: { value: Choice; onPick: (v: Choice) => void; followRoom?: { roomTheme: ThemeId } }) {
  const t = useT();
  return (
    <div className="space-y-4">
      {followRoom && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Card
            meta={themeMeta(followRoom.roomTheme)}
            label={t.theme.followRoom(t.themes.names[themeMeta(followRoom.roomTheme).id])}
            selected={value === 'room'}
            onPick={() => onPick('room')}
          />
        </div>
      )}
      {THEME_GROUPS.map((group) => (
        <section key={group} aria-label={t.themes.groups[group]}>
          <h3 className="mb-1.5 px-0.5 text-[13px] font-medium text-sage">{t.themes.groups[group]}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEMES.filter((m) => m.group === group).map((m) => (
              <Card key={m.id} meta={m} label={t.themes.names[m.id]} selected={value === m.id} onPick={() => onPick(m.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** "Giao diện" in the room header: this browser's own theme, applied at once. */
export function ThemeDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const personal = usePersonalTheme();
  const roomTheme = useRoomTheme();
  return (
    <Dialog open onClose={onClose} title={t.theme.title} description={t.theme.personalHint}>
      <ThemeGrid value={personal} onPick={setPersonalTheme} followRoom={{ roomTheme }} />
    </Dialog>
  );
}
