import { looksLikeLink, parseYouTubeVideo } from '@/contracts/youtube';

export type InputKind = 'empty' | 'link' | 'query';

/** Decides whether the "Thêm bài" box searches or adds a link (TC-148). */
export function classifyInput(raw: string): InputKind {
  const v = raw.trim();
  if (!v) return 'empty';
  if (parseYouTubeVideo(v) || looksLikeLink(v)) return 'link';
  return 'query';
}
