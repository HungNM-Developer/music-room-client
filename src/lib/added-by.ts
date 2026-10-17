import type { QueueItemView } from '@/contracts';
import { tr } from '@/i18n';

/** "Minh Anh", "Radio tự động" or "Playlist dự phòng". */
export function addedByLabel(item: Pick<QueueItemView, 'addedBy' | 'auto'>): string {
  const t = tr();
  if (item.addedBy) return item.addedBy.displayName;
  return item.auto === 'radio' ? t.nowPlaying.radio : t.nowPlaying.fallback;
}
