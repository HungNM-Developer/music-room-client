import { THEME_IDS, type ThemeId } from '@/contracts/constants';

export type { ThemeId };

/** `stage`: shares one big now-playing layout; `object`: a layout of its own (a hi-fi, a radio…). */
export type ThemeFamily = 'default' | 'stage' | 'object';

export interface ThemeMeta {
  id: ThemeId;
  /** Picker heading; names and headings are in the dictionary (`themes.names` / `themes.groups`). */
  group: ThemeGroupId;
  scheme: 'light' | 'dark';
  family: ThemeFamily;
  /** Preview card colours (and the browser bar colour). */
  swatch: { bg: string; panel: string; accent: string; text: string };
}

export const THEME_GROUPS = ['default', 'minimal', 'vintage', 'sky', 'vietnam', 'decades'] as const;
export type ThemeGroupId = (typeof THEME_GROUPS)[number];

export const THEMES: readonly ThemeMeta[] = [
  { id: 'default', group: 'default', scheme: 'dark', family: 'default', swatch: { bg: '#0f2a26', panel: '#173a34', accent: '#f6a623', text: '#f3ecdd' } },
  { id: 'listening', group: 'minimal', scheme: 'dark', family: 'stage', swatch: { bg: '#1a1714', panel: '#211d19', accent: '#d8a24a', text: '#ece5d8' } },
  { id: 'hifi82', group: 'minimal', scheme: 'light', family: 'stage', swatch: { bg: '#e7e4dd', panel: '#f3f1ec', accent: '#e0552b', text: '#1d1c1a' } },
  { id: 'midcentury', group: 'minimal', scheme: 'dark', family: 'stage', swatch: { bg: '#14303a', panel: '#0e2329', accent: '#e5b53e', text: '#f0ead9' } },
  { id: 'walnut', group: 'vintage', scheme: 'dark', family: 'object', swatch: { bg: '#2f1d12', panel: '#1a110a', accent: '#c99a3c', text: '#ece3cf' } },
  { id: 'transistor', group: 'vintage', scheme: 'dark', family: 'object', swatch: { bg: '#8f1f22', panel: '#171513', accent: '#f0b23a', text: '#f6efe3' } },
  { id: 'cassette', group: 'vintage', scheme: 'dark', family: 'object', swatch: { bg: '#2e1d13', panel: '#1c1612', accent: '#e3a62b', text: '#f1ead9' } },
  { id: 'station', group: 'vintage', scheme: 'dark', family: 'object', swatch: { bg: '#0f1d17', panel: '#15241d', accent: '#ffb23f', text: '#f2efe6' } },
  { id: 'astro', group: 'sky', scheme: 'dark', family: 'stage', swatch: { bg: '#12142f', panel: '#171a3a', accent: '#d6b25e', text: '#ece6d6' } },
  { id: 'cosmos', group: 'sky', scheme: 'dark', family: 'stage', swatch: { bg: '#070b1a', panel: '#0c1330', accent: '#7fd4ff', text: '#e6ecff' } },
  { id: 'saigon', group: 'vietnam', scheme: 'light', family: 'stage', swatch: { bg: '#f3ead6', panel: '#fbf5e7', accent: '#1d6b66', text: '#1f2a28' } },
  { id: 'pixel', group: 'decades', scheme: 'dark', family: 'stage', swatch: { bg: '#1d1b33', panel: '#26244a', accent: '#f8b800', text: '#fcfcfc' } },
  { id: 'synthwave', group: 'decades', scheme: 'dark', family: 'stage', swatch: { bg: '#140428', panel: '#1d0838', accent: '#ff3ea5', text: '#fbe9ff' } },
];

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** Anything (stored value, server field) → a theme we know; unknown → `default`. */
export function toThemeId(v: unknown): ThemeId {
  return (THEME_IDS as readonly unknown[]).includes(v) ? (v as ThemeId) : 'default';
}

export function themeMeta(id: ThemeId): ThemeMeta {
  return BY_ID.get(id) ?? THEMES[0];
}
