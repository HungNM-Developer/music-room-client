'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Socket } from 'socket.io-client';
import {
  type ActivityLogView,
  type ChatMessageView,
  type CommandName,
  type CommandPayload,
  type DjEvent,
  type MemberView,
  type PlayerCommand,
  type PlayerRevokeReason,
  type ReactionEvent,
  type RevokeReason,
  type RoomSnapshot,
} from '@/contracts';
import { applySnapshot } from '@/lib/room-store';
import { isVersionMismatch } from '@/lib/version';
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

type Listener<T> = (e: T) => void;

interface RoomContextValue {
  code: string | null;
  kind: SessionKind;
  memberId: string | null;
  me: MemberView | null;
  snapshot: RoomSnapshot | null;
  /** serverTime − local time (ms), for progress bars (R-50). */
  offset: number;
  chat: ChatMessageView[];
  logs: ActivityLogView[];
  connection: Connection;
  /** Increments on every successful (re)connection; used to re-claim the player lease. */
  connectCount: number;
  revoked: RevokeReason | null;
  versionMismatch: boolean;
  health: Health | null;
  playerCommand: PlayerCommand | null;
  playerRevoked: PlayerRevokeReason | null;
  /** Connects to `code` with the stored token (if any). */
  enter(code: string, kind?: SessionKind): void;
  /** Runs a command; stores the session token for create/join/host:register. */
  send<K extends CommandName>(
    name: K,
    payload: CommandPayload<K>,
  ): Promise<ClientAck<CommandResult<K>>>;
  leave(): Promise<void>;
  clearRevoked(): void;
  clearPlayerRevoked(): void;
  onReaction(l: Listener<ReactionEvent>): () => void;
  onDj(l: Listener<DjEvent>): () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  // One socket for the whole app (null during SSR); listeners attached once.
  const [socket] = useState<Socket | null>(() =>
    typeof window === 'undefined' ? null : createSocket(),
  );
  const [code, setCode] = useState<string | null>(null);
  const [kind, setKind] = useState<SessionKind>('member');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [offset, setOffset] = useState(0);
  const [chat, setChat] = useState<ChatMessageView[]>([]);
  const [logs, setLogs] = useState<ActivityLogView[]>([]);
  const [connection, setConnection] = useState<Connection>('idle');
  const [connectCount, setConnectCount] = useState(0);
  const [revoked, setRevoked] = useState<RevokeReason | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [playerCommand, setPlayerCommand] = useState<PlayerCommand | null>(null);
  const [playerRevoked, setPlayerRevoked] = useState<PlayerRevokeReason | null>(null);
  const reactionListeners = useRef(new Set<Listener<ReactionEvent>>());
  const djListeners = useRef(new Set<Listener<DjEvent>>());
  const codeRef = useRef<string | null>(null);
  const kindRef = useRef<SessionKind>('member');

  useEffect(() => {
    const s = socket;
    if (!s) return;
    s.on('connect', () => {
      setConnection('connected');
      setConnectCount((n) => n + 1);
    });
    s.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Kicked / left elsewhere: Socket.IO will not reconnect by itself. Come back
        // anonymously so the join dialog (with the reason) can be shown (TC-035).
        setSocketAuth(s, null);
        if (codeRef.current) {
          setConnection('connecting');
          s.connect();
        } else {
          setConnection('idle');
        }
        return;
      }
      setConnection('reconnecting');
    });
    s.io.on('reconnect_attempt', () => setConnection('reconnecting'));
    s.on('session:ready', (d: { memberId: string; code: string }) => {
      setMemberId(d.memberId);
      setRevoked(null);
    });
    s.on('session:revoked', (d: { reason: RevokeReason }) => {
      if (codeRef.current) clearToken(codeRef.current, kindRef.current);
      setMemberId(null);
      setRevoked(d.reason);
      setPlayerCommand(null);
      // The room view behind the join dialog must not show stale data.
      setSnapshot(null);
      setChat([]);
      setLogs([]);
      setSocketAuth(s, null);
    });
    s.on('room:update', (snap: RoomSnapshot) => {
      setOffset(clockOffset(snap.serverTime, Date.now()));
      setSnapshot((prev) => applySnapshot(prev, snap));
    });
    s.on('chat:history', (m: ChatMessageView[]) => setChat(m));
    s.on('chat:receive', (m: ChatMessageView) => setChat((prev) => [...prev, m].slice(-200)));
    s.on('activity:history', (l: ActivityLogView[]) => setLogs(l));
    s.on('activity:new', (l: ActivityLogView) => setLogs((prev) => [l, ...prev].slice(0, 200)));
    s.on('player:command', (c: PlayerCommand) => {
      setPlayerCommand(c);
      setPlayerRevoked(null);
    });
    s.on('player:revoked', (d: { reason: PlayerRevokeReason }) => {
      setPlayerRevoked(d.reason);
      setPlayerCommand(null);
    });
    s.on('room:reaction', (e: ReactionEvent) => reactionListeners.current.forEach((l) => l(e)));
    s.on('dj:event', (e: DjEvent) => djListeners.current.forEach((l) => l(e)));

    // Socket.IO only notices a dead network after the ping timeout (~45 s).
    // The browser knows immediately: show the banner and force a reconnect cycle.
    const goOffline = () => {
      if (!codeRef.current) return;
      setConnection('reconnecting');
      s.io.engine?.close();
    };
    const goOnline = () => {
      if (codeRef.current && !s.connected) s.connect();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      s.removeAllListeners();
      s.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    fetch(healthUrl())
      .then((r) => r.json())
      .then((h: Health) => setHealth(h))
      .catch(() => setHealth(null));
  }, []);

  const resetRoomState = useCallback(() => {
    setSnapshot(null);
    setMemberId(null);
    setChat([]);
    setLogs([]);
    setPlayerCommand(null);
    setPlayerRevoked(null);
  }, []);

  const enter = useCallback(
    (nextCode: string, nextKind: SessionKind = 'member') => {
      const s = socket;
      if (!s) return;
      const token = getToken(nextCode, nextKind);
      const sameSession =
        codeRef.current === nextCode && kindRef.current === nextKind && s.connected;
      codeRef.current = nextCode;
      kindRef.current = nextKind;
      setCode(nextCode);
      setKind(nextKind);
      if (sameSession) return;
      resetRoomState();
      setRevoked(null);
      setSocketAuth(s, token);
      if (s.connected) s.disconnect();
      setConnection('connecting');
      s.connect();
    },
    [resetRoomState, socket],
  );

  const sendCommand = useCallback(
    async <K extends CommandName>(name: K, payload: CommandPayload<K>) => {
      const s = socket;
      if (!s) return { ok: false, error: { code: 'NETWORK' } } as ClientAck<CommandResult<K>>;
      if (!s.connected && !s.active) s.connect();
      const r = await send(s, name, payload);
      if (r.ok && 'token' in (r.data as object)) {
        const d = r.data as { token: string; code: string; memberId: string };
        const k: SessionKind = name === 'host:register' ? 'host' : 'member';
        setToken(d.code, d.token, k);
        codeRef.current = d.code;
        kindRef.current = k;
        setCode(d.code);
        setKind(k);
        setMemberId(d.memberId);
        setRevoked(null);
        setSocketAuth(s, d.token);
      }
      return r;
    },
    [socket],
  );

  const leave = useCallback(async () => {
    const s = socket;
    const c = codeRef.current;
    if (s && c) {
      await send(s, 'room:leave', {});
      clearToken(c, kindRef.current);
      setSocketAuth(s, null);
    }
    resetRoomState();
    codeRef.current = null;
    setCode(null);
  }, [resetRoomState, socket]);

  const me = useMemo(
    () => snapshot?.members.find((m) => m.id === memberId) ?? null,
    [snapshot, memberId],
  );

  const value: RoomContextValue = {
    code,
    kind,
    memberId,
    me,
    snapshot,
    offset,
    chat,
    logs,
    connection,
    connectCount,
    revoked,
    versionMismatch: isVersionMismatch(health),
    health,
    playerCommand,
    playerRevoked,
    enter,
    send: sendCommand,
    leave,
    clearRevoked: () => setRevoked(null),
    clearPlayerRevoked: () => setPlayerRevoked(null),
    onReaction: (l) => {
      reactionListeners.current.add(l);
      return () => reactionListeners.current.delete(l);
    },
    onDj: (l) => {
      djListeners.current.add(l);
      return () => djListeners.current.delete(l);
    },
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used inside <RoomProvider>');
  return ctx;
}
