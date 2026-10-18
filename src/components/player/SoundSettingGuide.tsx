'use client';

import { Info, Settings, SlidersHorizontal, Volume2 } from 'lucide-react';
import { useT } from '@/i18n';

/** The icons Chrome / Edge show at each place, named in the steps as {info} {tune} {gear} {sound}. */
const ICONS = { info: Info, tune: SlidersHorizontal, gear: Settings, sound: Volume2 } as const;

function Step({ text }: { text: string }) {
  return (
    <li>
      {text.split(/\{(\w+)\}/).map((part, i) => {
        const Icon = i % 2 ? ICONS[part as keyof typeof ICONS] : undefined;
        return Icon ? (
          <Icon key={i} className="mx-0.5 inline h-4 w-4 -translate-y-px align-middle text-paper" aria-hidden />
        ) : (
          part
        );
      })}
    </li>
  );
}

/**
 * "Để máy phát luôn tự có tiếng": allow Sound for the site in Chrome / Edge, step by step with the
 * icons to look for. Used by the help sheet and the speaker's sound layer.
 */
export function SoundSettingGuide() {
  const t = useT();
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-snug text-sage marker:font-semibold marker:text-amber">
      {t.help.items.autoplay.steps.map((s) => (
        <Step key={s} text={s} />
      ))}
    </ol>
  );
}
