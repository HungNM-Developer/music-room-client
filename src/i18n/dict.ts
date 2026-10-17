import { en } from './en';
import type { Lang } from './lang';
import { vi } from './vi';

/** The shape every language follows: `vi` with its literal strings widened to `string`. */
type Widen<T> = T extends string
  ? string
  : T extends (...a: infer A) => infer R
    ? (...a: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type Dict = Widen<typeof vi>;

export const dicts: Record<Lang, Dict> = { vi, en };

/** The dictionary of a given language. Free of React, so server code (routes, metadata) imports it from here. */
export const dictFor = (lang: Lang): Dict => dicts[lang];
