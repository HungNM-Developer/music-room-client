import type { RoomSettings } from '@/contracts';
import { parseYouTubePlaylist } from '@/contracts/youtube';

export interface SettingsForm {
  thresholdPct: string;
  minVotes: string;
  voteWindow: string;
  maxQueued: string;
  maxMinutes: string;
  fallbackUrl: string;
  allowGuestDj: boolean;
  autoRadio: boolean;
  repeatGap: string;
  mcIntro: boolean;
}

export type SettingsErrors = Partial<Record<keyof SettingsForm, true>>;

export function toForm(s: RoomSettings): SettingsForm {
  return {
    thresholdPct: String(Math.round(s.skipThreshold * 100)),
    minVotes: String(s.skipMinVotes),
    voteWindow: String(s.skipVoteWindowSec),
    maxQueued: String(s.maxQueuedPerMember),
    maxMinutes: String(s.maxTrackDurationSec / 60),
    fallbackUrl: s.fallbackPlaylistUrl ?? '',
    allowGuestDj: s.allowGuestDj,
    autoRadio: s.autoRadio,
    repeatGap: String(s.repeatGapMinutes),
    mcIntro: s.mcIntro,
  };
}

const INT = /^\d+$/;

/** Everything the settings form edits; the theme has its own picker (saved on its own). */
export type FormSettings = Omit<RoomSettings, 'theme'>;

/** UI units (%, minutes) → stored units (ratio, seconds) with R-47 bounds (TC-181…TC-184). */
export function fromForm(f: SettingsForm): { settings?: FormSettings; errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const pct = Number(f.thresholdPct.trim());
  if (!INT.test(f.thresholdPct.trim()) || pct < 10 || pct > 100) errors.thresholdPct = true;
  const minVotes = Number(f.minVotes.trim());
  if (!INT.test(f.minVotes.trim()) || minVotes < 1 || minVotes > 50) errors.minVotes = true;
  const win = Number(f.voteWindow.trim());
  if (!INT.test(f.voteWindow.trim()) || win < 10 || win > 60) errors.voteWindow = true;
  const q = Number(f.maxQueued.trim());
  if (!INT.test(f.maxQueued.trim()) || q < 1 || q > 20) errors.maxQueued = true;
  const min = Number(f.maxMinutes.trim());
  if (!INT.test(f.maxMinutes.trim()) || min > 120) errors.maxMinutes = true;
  const gap = Number(f.repeatGap.trim());
  if (!INT.test(f.repeatGap.trim()) || gap > 1440) errors.repeatGap = true;
  const url = f.fallbackUrl.trim();
  if (url && !parseYouTubePlaylist(url)) errors.fallbackUrl = true;
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    settings: {
      skipThreshold: pct / 100,
      skipMinVotes: minVotes,
      skipVoteWindowSec: win,
      maxQueuedPerMember: q,
      maxTrackDurationSec: min * 60,
      fallbackPlaylistUrl: url || null,
      allowGuestDj: f.allowGuestDj,
      autoRadio: f.autoRadio,
      repeatGapMinutes: gap,
      mcIntro: f.mcIntro,
    },
  };
}
