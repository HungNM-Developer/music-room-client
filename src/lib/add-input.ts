import { looksLikeLink, parseYouTubePlaylist, parseYouTubeVideo } from '@/contracts/youtube';

export type InputKind = 'empty' | 'link' | 'playlist' | 'query';

/**
 * Decides whether the "Thêm bài" box searches, adds a video, or opens a playlist
 * (TC-148, A5). A link with both a video and a playlist adds the video.
 */
export function classifyInput(raw: string): InputKind {
  const v = raw.trim();
  if (!v) return 'empty';
  if (parseYouTubeVideo(v)) return 'link';
  if (parseYouTubePlaylist(v)) return 'playlist';
  if (looksLikeLink(v)) return 'link';
  return 'query';
}

/** The playlist id of a link, also when it points at a video inside the playlist. */
export function playlistIn(raw: string): string | null {
  return parseYouTubePlaylist(raw.trim())?.playlistId ?? null;
}
