'use client';

import { type Lang, setLang, useLang } from '@/i18n/lang';

/** Each language under its own name, never translated, so anyone can find theirs. */
const OPTIONS: readonly { lang: Lang; name: string; short: string }[] = [
  { lang: 'vi', name: 'Tiếng Việt', short: 'VI' },
  { lang: 'en', name: 'English', short: 'EN' },
];

/**
 * This device's language, for every page and room. Full names side by side; `compact` (headers,
 * where space is tight on phones) is one icon-sized button that shows the current code and flips it.
 */
export function LangSwitch({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const lang = useLang();
  if (compact) {
    const cur = OPTIONS.find((o) => o.lang === lang) ?? OPTIONS[0];
    const next = OPTIONS.find((o) => o.lang !== lang) ?? OPTIONS[1];
    return (
      <button
        type="button"
        onClick={() => setLang(next.lang)}
        aria-label={`${cur.name} → ${next.name}`}
        title={`${cur.name} → ${next.name}`}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-row text-sage transition-colors hover:bg-panel-hi hover:text-paper ${className}`}
      >
        <span className="rounded-full border border-current px-1.5 text-[12px] font-bold leading-5 tracking-wide">{cur.short}</span>
      </button>
    );
  }
  return (
    <div role="group" aria-label="Ngôn ngữ / Language" className={`inline-flex shrink-0 items-center rounded-full border border-line p-0.5 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          lang={o.lang}
          aria-pressed={lang === o.lang}
          onClick={() => setLang(o.lang)}
          className={`min-h-9 rounded-full px-2.5 text-[13px] font-semibold transition-colors ${
            lang === o.lang ? 'bg-amber text-amber-ink' : 'text-sage hover:text-paper'
          }`}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}
