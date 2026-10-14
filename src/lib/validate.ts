// Client-side checks that only enable/disable buttons. The server's Zod schemas stay
// the authority; these mirror them without shipping Zod to the browser.
import { LIMITS } from '@/contracts/constants';
import { cleanLine, normalizeRoomCode, ROOM_CODE_PATTERN } from '@/contracts/text';

const lineOk = (v: string, max: number) => {
  const c = cleanLine(v);
  return c.length >= 1 && c.length <= max;
};

export const isDisplayName = (v: string) => lineOk(v, LIMITS.displayName);
export const isRoomName = (v: string) => lineOk(v, LIMITS.roomName);
export const isRoomCode = (v: string) => ROOM_CODE_PATTERN.test(normalizeRoomCode(v));
