import type { Lang } from '@/contracts';

/** A room link in the sharer's language: `?lang=en` makes a device that has not chosen a language open in English. */
export function shareUrl(origin: string, code: string, lang: Lang): string {
  return `${origin}/r/${code}${lang === 'en' ? '?lang=en' : ''}`;
}
