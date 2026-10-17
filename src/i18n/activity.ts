import type { ActivityLogView, PlaylistKind } from '@/contracts';
import { type Dict, dictFor } from './dict';

/** People show their own name; speaker devices ("Máy phát", "Máy phát 2") show it in the reader's language. */
export function memberName(m: { displayName: string; isDevice?: boolean | null }, t: Dict): string {
  if (!m.isDevice) return m.displayName;
  const n = /\s(\d+)$/.exec(m.displayName)?.[1];
  return t.deviceName(n ? Number(n) : undefined);
}

/**
 * Playlists the app named itself (YouTube likes, the "for you" mix) are shown in the reader's
 * language, unless their owner renamed them.
 */
export function playlistName(p: { name: string; kind?: PlaylistKind | null }, t: Dict): string {
  const stored = dictFor('vi').playlists;
  if (p.kind === 'liked' && p.name === stored.likedName) return t.playlists.likedName;
  if (p.kind === 'mix' && p.name === stored.mixName) return t.playlists.mixName;
  return p.name;
}

/**
 * One activity line in the reader's language, from the row's `type` and `params` (the
 * variant table in the server's activity call sites). Older rows (no params) and anything
 * this client does not know keep the sentence the server stored.
 */
export function logLine(row: ActivityLogView, t: Dict): { actor: string | null; text: string } {
  const stored = { actor: row.displayName, text: row.message };
  const p = row.params;
  if (!p) return stored;
  const e = t.log.events;
  // Each sentence needs its keys; a row missing one keeps the stored sentence instead.
  const { title, count, yes, no } = p;
  const target = p.target === undefined ? undefined : memberName({ displayName: p.target, isDevice: p.targetDevice }, t);
  const withTitle = (f: (title: string) => string) => (title === undefined ? undefined : f(title));
  const text = ((): string | undefined => {
    switch (row.type) {
      case 'room_create':
        return e.roomCreate;
      case 'user_join':
        return p.variant === 'slack' ? e.joinSlack : p.variant === 'device' ? e.deviceConnect : p.variant === 'join' ? e.join : undefined;
      case 'user_rejoin':
        return p.variant === 'rightsReset' ? e.rejoinReset : p.variant === 'plain' ? e.rejoin : undefined;
      case 'user_leave':
        return e.leave;
      case 'member_kick':
        return target === undefined ? undefined : e.kick(target);
      case 'admin_claim':
        return e.adminClaim;
      case 'pin_change':
        return e.pinChange;
      case 'player_change':
        return e.playerChange;
      case 'permission_change':
        if (!p.variant || target === undefined) return undefined;
        return e.permission[p.variant as keyof typeof e.permission]?.(target);
      case 'settings_change':
        return p.variant === 'theme' ? e.settingsTheme : p.variant === 'other' ? e.settingsOther : undefined;
      case 'track_add':
        return p.variant === 'one' ? withTitle(e.add) : p.variant === 'playlist' && count !== undefined ? e.addPlaylist(count) : undefined;
      case 'track_remove':
        return withTitle(e.remove);
      case 'track_heart':
        return withTitle(e.heart);
      case 'track_block':
        return withTitle(e.block);
      case 'track_unblock':
        return withTitle(e.unblock);
      case 'track_pin':
        return p.variant === 'pin' ? withTitle(e.pin) : p.variant === 'unpin' ? withTitle(e.unpin) : undefined;
      case 'track_skip':
        if (p.variant === 'by') return withTitle(e.skipBy);
        if (p.variant === 'votes' && yes !== undefined) return withTitle((s) => e.skipVotes(s, yes));
        if (p.variant === 'timeout' && yes !== undefined && no !== undefined) return withTitle((s) => e.skipTimeout(s, yes, no));
        return undefined;
      case 'skip_kept':
        return yes === undefined || no === undefined ? undefined : withTitle((s) => e.kept(s, yes, no));
      case 'track_error':
        return withTitle((s) => e.trackError(s, p.code ?? null));
      default:
        return undefined;
    }
  })();
  if (text === undefined) return stored;
  const actor = row.displayName === null ? null : memberName({ displayName: row.displayName, isDevice: p.actorDevice }, t);
  return { actor, text };
}
