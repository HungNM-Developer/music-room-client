'use client';

import { useRef } from 'react';

export interface TabDef<K extends string> {
  key: K;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export const tabId = (prefix: string, key: string) => `${prefix}-tab-${key}`;
export const panelId = (prefix: string, key: string) => `${prefix}-panel-${key}`;

/**
 * WAI-ARIA tab list (arrow keys, Home/End). `variant="bar"` is the phone bottom bar,
 * `variant="pill"` a segmented control. Panels are rendered by the caller with panelId().
 */
export function TabList<K extends string>({
  tabs,
  value,
  onChange,
  idPrefix,
  panelPrefix = idPrefix,
  label,
  variant,
  className = '',
}: {
  tabs: TabDef<K>[];
  value: K;
  onChange: (k: K) => void;
  idPrefix: string;
  /** Lets two tab lists (phone bar, desktop pills) control the same panels. */
  panelPrefix?: string;
  label: string;
  variant: 'bar' | 'pill';
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusAt = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    onChange(tabs[n].key);
    refs.current[n]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const moves: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (e.key in moves) {
      e.preventDefault();
      focusAt(moves[e.key]);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={variant === 'bar' ? `grid ${className}` : `flex gap-1 rounded-[14px] bg-dial-deep p-1 ${className}`}
      style={variant === 'bar' ? { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` } : undefined}
    >
      {tabs.map((t, i) => {
        const selected = t.key === value;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, t.key)}
            aria-selected={selected}
            aria-controls={panelId(panelPrefix, t.key)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={
              variant === 'bar'
                ? `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-medium transition-colors ${
                    selected ? 'text-amber' : 'text-sage hover:text-paper'
                  }`
                : `flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-2 text-[13px] font-semibold transition-colors sm:px-3 sm:text-[14px] ${
                    selected ? 'bg-panel-hi text-paper' : 'text-sage hover:text-paper'
                  }`
            }
          >
            {t.icon && (
              <span className="relative">
                {t.icon}
                {variant === 'bar' && Boolean(t.badge) && (
                  <span className="absolute -right-3 -top-1.5 min-w-[18px] rounded-full bg-amber px-1 text-center text-[10px] font-bold leading-[16px] text-amber-ink tabular-nums">
                    {t.badge}
                  </span>
                )}
              </span>
            )}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
