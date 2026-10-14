import { describe, expect, it } from 'vitest';
import { send } from './socket';

describe('send (TC-201)', () => {
  it('returns the server ack', async () => {
    const socket = {
      timeout: () => ({ emitWithAck: () => Promise.resolve({ ok: true, data: {} }) }),
    };
    expect(await send(socket, 'room:leave', {})).toEqual({ ok: true, data: {} });
  });
  it('maps an ack timeout to NETWORK', async () => {
    const socket = {
      timeout: (ms: number) => {
        expect(ms).toBe(8000);
        return { emitWithAck: () => Promise.reject(new Error('operation has timed out')) };
      },
    };
    expect(await send(socket, 'chat:send', { content: 'x' })).toEqual({
      ok: false,
      error: { code: 'NETWORK' },
    });
  });
});
