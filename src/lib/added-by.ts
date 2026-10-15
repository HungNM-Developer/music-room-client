import type { QueueItemView } from '@/contracts';
import { vi } from '@/i18n/vi';

/** "Minh Anh", "Radio tự động" or "Playlist dự phòng". */
export function addedByLabel(item: Pick<QueueItemView, 'addedBy' | 'auto'>): string {
  if (item.addedBy) return item.addedBy.displayName;
  return item.auto === 'radio' ? vi.nowPlaying.radio : vi.nowPlaying.fallback;
}
