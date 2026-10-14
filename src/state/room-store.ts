// Room state lives outside React so components subscribe to just the slice they read
// (useRoom(selector)). A chat message re-renders the chat, not the queue or the player.
// The socket logic is unchanged from the v2 RoomContext.
import type { Socket } from 'socket.io-client';
import type {
  ActivityLogView,
  ChatMessageView,
  CommandName,
  CommandPayload,
  DjEvent,
  PlayerCommand,
  PlayerRevokeReason,
  ReactionEvent,
  RevokeReason,
  RoomSnapshot,
} from '@/contracts';
import { applySnapshot } from '@/lib/room-store';
import { clearToken, getToken, type SessionKind, setToken } from '@/lib/session-store';
import {
  type ClientAck,
  type CommandResult,
  createSocket,
  healthUrl,
  send,
  setSocketAuth,
} from '@/lib/socket';
import { clockOffset } from '@/lib/time';

export type Connection = 'idle' | 'connecting' | 'connected' | 'reconnecting';

export interface Health {
  setupRequired: boolean;
  searchEnabled: boolean;
  contractsVersion: string;
}

export interface RoomState {
  code: string | null;
  kind: SessionKind;
  memberId: string | null;
  snapshot: RoomSnapshot | null;
  /** serverTime − local time (ms), for progress (R-50). */
  offset: number;
  chat: ChatMessageView[];
  logs: ActivityLogView[];
  connection: Connection;
  /** Increments on every successful (re)connection; used to re-claim the player lease. */
  connectCount: number;
  revoked: RevokeReason | null;
  health: Health | null;
  playerCommand: PlayerCommand | null;
  playerRevoked: PlayerRevokeReason | null;
}

export const INITIAL_STATE: RoomState = {
  code: null,
  kind: 'member',
  memberId: null,
  snapshot: null,
  offset: 0,
  chat: [],
  logs: [],
  connection: 'idle',
  connectCount: 0,
  revoked: null,
  health: null,
  playerCommand: null,
  playerRevoked: null,
};

type Listener<T> = (e: T) => void;

const ROOM_RESET: Partial<RoomState> = {
  snapshot: null,
  memberId: null,
  chat: [],
  logs: [],
  playerCommand: null,
  playerRevoked: null,
};

class RoomStore {
  private state: RoomState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private readonly reactionListeners = new Set<Listener<ReactionEvent>>();
  private readonly djListeners = new Set<Listener<DjEvent>>();
  private socket: Socket | null = null;

  getState = (): RoomState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<RoomState> | ((s: RoomState) => Partial<RoomState>)): void {
    const p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l());
  }

  /** Creates the single app-wide socket once, in the browser. */
  start = (): void => {
    if (this.socket || typeof window === 'undefined') return;
    const s = createSocket();
    this.socket = s;

    s.on('connect', () => this.set((st) => ({ connection: 'connected', connectCount: st.connectCount + 1 })));
    s.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Kicked / left elsewhere: Socket.IO will not reconnect by itself. Come back
        // anonymously so the join dialog (with the reason) can be shown (TC-035).
        setSocketAuth(s, null);
        if (this.state.code) {
          this.set({ connection: 'connecting' });
          s.connect();
        } else {
          this.set({ connection: 'idle' });
        }
        return;
      }
      this.set({ connection: 'reconnecting' });
    });
    s.io.on('reconnect_attempt', () => this.set({ connection: 'reconnecting' }));
    s.on('session:ready', (d: { memberId: string; code: string }) =>
      this.set({ memberId: d.memberId, revoked: null }),
    );
    s.on('session:revoked', (d: { reason: RevokeReason }) => {
      if (this.state.code) clearToken(this.state.code, this.state.kind);
      setSocketAuth(s, null);
      // The room view behind the join dialog must not show stale data.
      this.set({ ...ROOM_RESET, revoked: d.reason, playerRevoked: this.state.playerRevoked });
    });
    s.on('room:update', (snap: RoomSnapshot) =>
      this.set((st) => ({
        offset: clockOffset(snap.serverTime, Date.now()),
        snapshot: applySnapshot(st.snapshot, snap),
      })),
    );
    s.on('chat:history', (chat: ChatMessageView[]) => this.set({ chat }));
    s.on('chat:receive', (m: ChatMessageView) => this.set((st) => ({ chat: [...st.chat, m].slice(-200) })));
    s.on('activity:history', (logs: ActivityLogView[]) => this.set({ logs }));
    s.on('activity:new', (l: ActivityLogView) => this.set((st) => ({ logs: [l, ...st.logs].slice(0, 200) })));
    s.on('player:command', (c: PlayerCommand) => this.set({ playerCommand: c, playerRevoked: null }));
    s.on('player:revoked', (d: { reason: PlayerRevokeReason }) =>
      this.set({ playerRevoked: d.reason, playerCommand: null }),
    );
    s.on('room:reaction', (e: ReactionEvent) => this.reactionListeners.forEach((l) => l(e)));
    s.on('dj:event', (e: DjEvent) => this.djListeners.forEach((l) => l(e)));

    // Socket.IO only notices a dead network after the ping timeout (~45 s).
    // The browser knows immediately: show the banner and force a reconnect cycle.
    window.addEventListener('offline', () => {
      if (!this.state.code) return;
      this.set({ connection: 'reconnecting' });
      s.io.engine?.close();
    });
    window.addEventListener('online', () => {
      if (this.state.code && !s.connected) s.connect();
    });

    fetch(healthUrl())
      .then((r) => r.json())
      .then((health: Health) => this.set({ health }))
      .catch(() => this.set({ health: null }));
  };

  /** Connects to `code` with the stored token (if any). */
  enter = (code: string, kind: SessionKind = 'member'): void => {
    this.start();
    const s = this.socket;
    if (!s) return;
    const sameSession = this.state.code === code && this.state.kind === kind && s.connected;
    if (sameSession) return;
    this.set({ ...ROOM_RESET, code, kind, revoked: null, connection: 'connecting' });
    setSocketAuth(s, getToken(code, kind));
    if (s.connected) s.disconnect();
    s.connect();
  };

  /** Runs a command; stores the session token for create/join/host:register. */
  send = async <K extends CommandName>(
    name: K,
    payload: CommandPayload<K>,
  ): Promise<ClientAck<CommandResult<K>>> => {
    this.start();
    const s = this.socket;
    if (!s) return { ok: false, error: { code: 'NETWORK' } };
    if (!s.connected && !s.active) s.connect();
    const r = await send(s, name, payload);
    if (r.ok && 'token' in (r.data as object)) {
      const d = r.data as { token: string; code: string; memberId: string };
      const kind: SessionKind = name === 'host:register' ? 'host' : 'member';
      setToken(d.code, d.token, kind);
      setSocketAuth(s, d.token);
      this.set({ code: d.code, kind, memberId: d.memberId, revoked: null });
    }
    return r;
  };

  leave = async (): Promise<void> => {
    const s = this.socket;
    const { code, kind } = this.state;
    if (s && code) {
      await send(s, 'room:leave', {});
      clearToken(code, kind);
      setSocketAuth(s, null);
    }
    this.set({ ...ROOM_RESET, code: null });
  };

  clearPlayerRevoked = (): void => this.set({ playerRevoked: null });

  onReaction = (l: Listener<ReactionEvent>): (() => void) => {
    this.reactionListeners.add(l);
    return () => this.reactionListeners.delete(l);
  };

  onDj = (l: Listener<DjEvent>): (() => void) => {
    this.djListeners.add(l);
    return () => this.djListeners.delete(l);
  };
}

/** The one store for the app. Methods are bound and stable — safe in effect deps. */
export const room = new RoomStore();
