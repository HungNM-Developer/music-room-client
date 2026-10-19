'use client';

import { useCallback, useState } from 'react';
import { WishSheet, type WishToAdd } from '@/components/room/WishSheet';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { parseYouTubeVideo } from '@/contracts/youtube';
import { useAct } from '@/hooks/useAct';
import { useT } from '@/i18n';
import { room } from '@/state/room-store';

/**
 * Optimistic add: the row appears in the queue at once ("Đang thêm…", with the video's
 * thumbnail) while the server fetches the title. `added` marks what this panel already
 * sent, so its button turns into a check; a refused add clears the mark.
 *
 * `addWithWish` opens the wish sheet first (text, "Nhờ MC viết", male / female voice) and
 * adds the song with it — the only way the first song of an idle room, which plays at once,
 * gets a wish. Render `wishSheet` where the add buttons live.
 */
/** Opens the wish sheet, then adds the song with its wish. */
export type AddWithWish = (trackInput: string, known?: TrackSummary, onAdded?: () => void) => Promise<void>;

export function useAddTrack() {
  const t = useT();
  const act = useAct();
  const toast = useToast();
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [wishFor, setWishFor] = useState<{ input: string; known?: TrackSummary; onAdded?: () => void } | null>(null);

  const add = useCallback(
    async (trackInput: string, known?: TrackSummary, wish?: WishToAdd): Promise<boolean> => {
      const videoId = known?.externalId ?? parseYouTubeVideo(trackInput)?.videoId ?? null;
      setAdded((s) => new Set(s).add(trackInput));
      const r = await act(
        'queue:add',
        {
          input: trackInput,
          // `voice` only when female: male is what the server assumes, so an older server still accepts it.
          ...(wish ? { wishMessage: wish.message, ...(wish.voice === 'female' ? { voice: wish.voice } : {}) } : {}),
        },
        {
          optimistic: {
            kind: 'add',
            key: trackInput,
            title: known?.title ?? null,
            thumbnailUrl: known?.thumbnailUrl ?? (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null),
          },
        },
      );
      if (r) {
        toast(r.upvoted ? t.add.upvoted(r.title) : t.add.added(r.title), 'success');
        return true;
      }
      setAdded((s) => {
        const next = new Set(s);
        next.delete(trackInput);
        return next;
      });
      return false;
    },
    [act, toast, t],
  );

  const addWithWish: AddWithWish = useCallback(async (trackInput: string, known?: TrackSummary, onAdded?: () => void) => {
    let track = known;
    // A pasted link: look the title up so the sheet (and "Nhờ MC viết") knows the song.
    const videoId = track ? null : parseYouTubeVideo(trackInput)?.videoId;
    if (videoId) {
      const r = await room.send('tracks:lookup', { videoIds: [videoId] });
      if (r.ok) track = r.data.tracks[0];
    }
    setWishFor({ input: trackInput, known: track, onAdded });
  }, []);

  const wishSheet = wishFor ? (
    <WishSheet
      adding={{
        title: wishFor.known?.title ?? t.queue.addingTitle,
        artist: wishFor.known?.artist ?? null,
        known: Boolean(wishFor.known),
        onAdd: (wish) => void add(wishFor.input, wishFor.known, wish).then((ok) => ok && wishFor.onAdded?.()),
      }}
      onClose={() => setWishFor(null)}
    />
  ) : null;

  return { add, added, addWithWish, wishSheet };
}
