import { io, type Socket } from 'socket.io-client';
import type { Ack, CommandName, CommandPayload, CommandResults } from '@/contracts';

/**
 * How long a command may wait for its ack before it counts as a network error. Longer
 * than the contract's 8 s: a sleepy free-tier server (Render) answers slowly, and the
 * optimistic UI keeps the change on screen meanwhile.
 */
export const CLIENT_ACK_TIMEOUT_MS = 15_000;

export type CommandResult<K extends CommandName> = K extends keyof CommandResults
  ? CommandResults[K]
  : Record<string, never>;

/** Server ack, or NETWORK when no ack arrived within 8 s (TC-201). */
export type ClientAck<T> = Ack<T> | { ok: false; error: { code: 'NETWORK'; params?: undefined } };

/** Empty in production: the socket uses the page origin (Caddy routes /socket.io). */
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? '';

export function createSocket(): Socket {
  return io(SERVER_URL || undefined, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
}

/** Token sent on the next (re)connection handshake. */
export function setSocketAuth(socket: Socket, token: string | null): void {
  socket.auth = token ? { token } : {};
}

export interface AckEmitter {
  timeout(ms: number): { emitWithAck(event: string, payload: unknown): Promise<unknown> };
}

export async function send<K extends CommandName>(
  socket: AckEmitter,
  name: K,
  payload: CommandPayload<K>,
): Promise<ClientAck<CommandResult<K>>> {
  try {
    return (await socket.timeout(CLIENT_ACK_TIMEOUT_MS).emitWithAck(name, payload)) as Ack<
      CommandResult<K>
    >;
  } catch {
    return { ok: false, error: { code: 'NETWORK' } };
  }
}

export const healthUrl = () => `${SERVER_URL}/api/health`;
