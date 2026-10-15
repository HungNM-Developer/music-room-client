'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { TrackSummary } from '@/contracts';
import { parseYouTubeVideo } from '@/contracts/youtube';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';

/**
 * Optimistic add: the row appears in the queue at once ("Đang thêm…", with the video's
 * thumbnail) while the server fetches the title. `added` marks what this panel already
 * sent, so its button turns into a check; a refused add clears the mark.
 */
export function useAddTrack() {
  const act = useAct();
  const toast = useToast();
  const [added, setAdded] = useState<Set<string>>(() => new Set());

  const add = useCallback(
    async (trackInput: string, known?: TrackSummary): Promise<boolean> => {
      const videoId = known?.externalId ?? parseYouTubeVideo(trackInput)?.videoId ?? null;
      setAdded((s) => new Set(s).add(trackInput));
      const r = await act(
        'queue:add',
        { input: trackInput },
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
        toast(vi.add.added(r.title), 'success');
        return true;
      }
      setAdded((s) => {
        const next = new Set(s);
        next.delete(trackInput);
        return next;
      });
      return false;
    },
    [act, toast],
  );

  return { add, added };
}
