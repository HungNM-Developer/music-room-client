import { looksLikeLink, parseYouTubePlaylist, parseYouTubeVideo } from '@/contracts/youtube';

export type InputKind = 'empty' | 'link' | 'playlist' | 'shared' | 'query';

/** A Music Room playlist link (`…/p/<code>`, L2) → its share code. */
export function sharedPlaylistIn(raw: string): string | null {
  return /\/p\/([A-Za-z0-9]{10})(?:[/?#]|$)/.exec(raw.trim())?.[1] ?? null;
}

/**
 * Decides whether the "Thêm bài" box searches, adds a video, or opens a playlist
 * (TC-148, A5, L2). A link with both a video and a playlist adds the video.
 */
export function classifyInput(raw: string): InputKind {
  const v = raw.trim();
  if (!v) return 'empty';
  if (sharedPlaylistIn(v)) return 'shared';
  if (parseYouTubeVideo(v)) return 'link';
  if (parseYouTubePlaylist(v)) return 'playlist';
  if (looksLikeLink(v)) return 'link';
  return 'query';
}

/** The playlist id of a link, also when it points at a video inside the playlist. */
export function playlistIn(raw: string): string | null {
  return parseYouTubePlaylist(raw.trim())?.playlistId ?? null;
}
