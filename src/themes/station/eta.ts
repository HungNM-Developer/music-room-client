/**
 * "Dự kiến" on the departures board: when each waiting song should start, as epoch ms.
 * Now + what is left of the song on air + the lengths of the songs before it. An
 * estimate (a skip changes it); from the first song of unknown length on, null ("—").
 */
export function etaTimes(
  now: number,
  np: { positionSec: number; durationSec: number } | null,
  queue: { track: { durationSec: number | null } }[],
): (number | null)[] {
  let at: number | null = now + (np ? Math.max(0, np.durationSec - np.positionSec) * 1000 : 0);
  if (np && !np.durationSec) at = null;
  return queue.map((q) => {
    const start = at;
    at = at !== null && q.track.durationSec ? at + q.track.durationSec * 1000 : null;
    return start;
  });
}
