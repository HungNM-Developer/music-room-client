// Room state lives outside React so components subscribe to just the slice they read
// (useRoom(selector)). A chat message re-renders the chat, not the queue or the player.
// The socket logic is unchanged from the v2 RoomContext.
import type { Socket } from 'socket.io-client';
import type {
  ErrorParams,
  ActivityLogView,
  ChatMessageView,
  CommandName,
  CommandPayload,
  DjEvent,
  TrackSummary,
  UserView,
  PlayerCommand,
  PlayerRevokeReason,
  ReactionEvent,
  RevokeReason,
  RoomSnapshot,
} from '@/contracts';
import type { ClientErrorCode } from '@/i18n';
import { applySnapshot } from '@/lib/room-store';
import type { Pending, PendingOp } from './optimistic';
import { readAccount, writeAccount } from '@/lib/account-store';
import { readLocalFavorites, writeLocalFavorite } from '@/lib/local-favorites';
import { clearToken, getToken, type SessionKind, setToken } from '@/lib/session-store';
import {
  type ClientAck,
  type CommandResult,
  createSocket,
  healthUrl,
  send,
  setSocketAuth,
  setSocketUser,
} from '@/lib/socket';
import { clockOffset } from '@/lib/time';

export type Connection = 'idle' | 'connecting' | 'connected' | 'reconnecting';

export interface Health {
  searchEnabled: boolean;
  contractsVersion: string;
  /** L1: Google sign-in is offered when the server has a client id. */
  googleClientId?: string | null;
}

/** A chat message the server has not confirmed yet. */
export interface PendingChat {
  id: string;
  content: string;
  createdAt: string;
  failed: boolean;
  /** Why it failed (shown under the bubble instead of a toast). */
  error?: { code: ClientErrorCode; params?: ErrorParams };
}

export interface RoomState {
  code: string | null;
  kind: SessionKind;
  memberId: string | null;
  snapshot: RoomSnapshot | null;
  /** serverTime − local time (ms), for progress (R-50). */
  offset: number;
  chat: ChatMessageView[];
  /** Messages from others since the chat was last on screen (dock badge). */
  chatUnread: number;
  logs: ActivityLogView[];
  connection: Connection;
  /** Increments on every successful (re)connection; used to re-claim the player lease. */
  connectCount: number;
  revoked: RevokeReason | null;
  health: Health | null;
  playerCommand: PlayerCommand | null;
  playerRevoked: PlayerRevokeReason | null;
  /** Optimistic overlays, from click until the server's ack (see optimistic.ts). */
  pending: Pending[];
  chatPending: PendingChat[];
  /** Track ids this member saved in this room ("Lưu", A2), pushed by the server. */
  favoriteIds: string[];
  /** Video ids saved on this device in any room (local-favorites.ts). */
  localFavorites: string[];
  /** L1: the signed-in Google account, if any. */
  user: UserView | null;
}

export const INITIAL_STATE: RoomState = {
  code: null,
  kind: 'member',
  memberId: null,
  snapshot: null,
  offset: 0,
  chat: [],
  chatUnread: 0,
  logs: [],
  connection: 'idle',
  connectCount: 0,
  revoked: null,
  health: null,
  playerCommand: null,
  playerRevoked: null,
  pending: [],
  chatPending: [],
  favoriteIds: [],
  localFavorites: [],
  user: null,
};

type Listener<T> = (e: T) => void;

const ROOM_RESET: Partial<RoomState> = {
  snapshot: null,
  memberId: null,
  chat: [],
  chatUnread: 0,
  logs: [],
  playerCommand: null,
  playerRevoked: null,
  pending: [],
  chatPending: [],
  favoriteIds: [],
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
    const account = readAccount();
    if (account) setSocketUser(s, account.token);
    this.set({ localFavorites: readLocalFavorites().map((f) => f.videoId), user: account?.user ?? null });

    s.on('connect', () => {
      this.set((st) => ({ connection: 'connected', connectCount: st.connectCount + 1 }));
      if (this.state.connectCount > 1) this.refreshHealth();
      // A token the server no longer accepts (expired, revoked) signs this device out.
      if (readAccount())
        void send(s, 'auth:me', {}).then((r) => {
          if (r.ok && !r.data.user) this.forgetAccount();
          else if (r.ok && r.data.user) this.set({ user: r.data.user });
        });
    });
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
    s.on('chat:receive', (m: ChatMessageView) =>
      this.set((st) => ({
        chat: [...st.chat, m].slice(-200),
        chatUnread: m.memberId === st.memberId ? st.chatUnread : st.chatUnread + 1,
      })),
    );
    s.on('activity:history', (logs: ActivityLogView[]) => this.set({ logs }));
    s.on('activity:new', (l: ActivityLogView) => this.set((st) => ({ logs: [l, ...st.logs].slice(0, 200) })));
    s.on('player:command', (c: PlayerCommand) => this.set({ playerCommand: c, playerRevoked: null }));
    s.on('favorite:ids', (d: { trackIds: string[] }) => this.set({ favoriteIds: d.trackIds }));
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

    this.refreshHealth();
  };

  /**
   * Server version and options. Asked again on every (re)connect: a deploy restarts the
   * server, so the socket reconnects and a version banner clears by itself once both
   * sides match. Never from the HTTP cache.
   */
  private refreshHealth = (): void => {
    fetch(healthUrl(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((health: Health) => this.set({ health }))
      .catch(() => {
        // Keep what we knew; a reconnect will ask again.
        if (!this.state.health) this.set({ health: null });
      });
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

  /** This browser deleted the room: forget its session (the server already detached it). */
  forgetDeletedRoom = (): void => {
    const s = this.socket;
    const { code, kind } = this.state;
    if (code) clearToken(code, kind);
    if (s) setSocketAuth(s, null);
    this.set({ ...ROOM_RESET, code: null });
  };

  clearPlayerRevoked = (): void => this.set({ playerRevoked: null });

  private opSeq = 0;

  /**
   * Shows `op` immediately and runs `request`. The overlay is removed when the ack
   * arrives: on success the snapshot (broadcast before the ack) already shows the change;
   * on failure removing it is the rollback.
   */
  withOptimistic = async <T>(op: PendingOp, request: () => Promise<T>): Promise<T> => {
    const id = ++this.opSeq;
    this.set((st) => ({ pending: [...st.pending, { ...op, id } as Pending] }));
    try {
      return await request();
    } finally {
      this.set((st) => ({ pending: st.pending.filter((p) => p.id !== id) }));
    }
  };

  /** Chat with a local echo: "Đang gửi…" now, the real message (or "Gửi lại") later. */
  sendChat = async (content: string, retryId?: string): Promise<ClientAck<CommandResult<'chat:send'>>> => {
    const id = retryId ?? `local-${++this.opSeq}`;
    const entry: PendingChat = { id, content, createdAt: new Date().toISOString(), failed: false };
    this.set((st) => ({
      chatPending: retryId ? st.chatPending.map((m) => (m.id === id ? entry : m)) : [...st.chatPending, entry],
    }));
    const r = await this.send('chat:send', { content });
    this.set((st) => ({
      // chat:receive (the real message) arrived before this ack, so the echo can go.
      chatPending: r.ok
        ? st.chatPending.filter((m) => m.id !== id)
        : st.chatPending.map((m) => (m.id === id ? { ...m, failed: true, error: r.error } : m)),
    }));
    return r;
  };

  /** L1: Google ID token → account on this device; device favourites join the account. */
  signInWithGoogle = async (credential: string): Promise<ClientAck<CommandResult<'auth:google'>>> => {
    const r = await this.send('auth:google', { credential });
    if (!r.ok) return r;
    writeAccount({ token: r.data.token, user: r.data.user });
    if (this.socket) setSocketUser(this.socket, r.data.token);
    this.set({ user: r.data.user });
    const local = readLocalFavorites().map((f) => f.videoId);
    if (local.length) void this.send('me:favorites-import', { videoIds: local.slice(0, 300) });
    return r;
  };

  private forgetAccount(): void {
    writeAccount(null);
    if (this.socket) setSocketUser(this.socket, null);
    this.set({ user: null });
  }

  /** L1: forget the account here; reconnect so the server forgets it on this socket too. */
  signOut = (): void => {
    this.forgetAccount();
    const s = this.socket;
    if (s?.connected) {
      s.disconnect();
      s.connect();
    }
  };

  /**
   * Save / unsave a song ("Lưu"): in this room for this member (server) and on this
   * device for every room. Shown at once; rolled back if the server refuses.
   */
  setFavorite = async (track: TrackSummary, saved: boolean): Promise<ClientAck<CommandResult<'favorite:set'>>> => {
    const before = { favoriteIds: this.state.favoriteIds, localFavorites: this.state.localFavorites };
    const local = writeLocalFavorite(track.externalId, saved).map((f) => f.videoId);
    this.set((st) => ({
      favoriteIds: saved ? [...new Set([...st.favoriteIds, track.id])] : st.favoriteIds.filter((id) => id !== track.id),
      localFavorites: local,
    }));
    const r = await this.send('favorite:set', { trackId: track.id, saved });
    if (!r.ok) {
      writeLocalFavorite(track.externalId, !saved);
      this.set(before);
    }
    return r;
  };

  discardChat = (id: string): void => this.set((st) => ({ chatPending: st.chatPending.filter((m) => m.id !== id) }));

  markChatRead = (): void => {
    if (this.state.chatUnread) this.set({ chatUnread: 0 });
  };

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
