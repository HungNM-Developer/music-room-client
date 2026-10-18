import type { QueueItemView, TrackSummary } from '@/contracts';
import { addedByLabel } from '@/lib/added-by';
import { normalizeQuery } from '@/contracts/text';

/**
 * Who sings it, for a line under the title: the artist found for the song, else the channel
 * without YouTube's " - Topic" ("Jack - J97 - Topic" → "Jack - J97"). Null when the title
 * already names them ("JACK - J97 | THIÊN LÝ ƠI"), so it is not said twice.
 */
export function trackArtist(track: Pick<TrackSummary, 'title' | 'artist' | 'channel'>): string | null {
  const who = (track.artist ?? track.channel ?? '').replace(/\s+-\s+Topic$/i, '').trim();
  if (!who) return null;
  return normalizeQuery(track.title).includes(normalizeQuery(who)) ? null : who;
}

/** "Jack - J97 · Lan": who sings it (when the title does not say), then who picked it. */
export function artistAndPicker(item: QueueItemView): string {
  const artist = trackArtist(item.track);
  return artist ? `${artist} · ${addedByLabel(item)}` : addedByLabel(item);
}
