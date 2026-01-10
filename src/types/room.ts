export type Role = 'admin' | 'user';

export type VoicePreset = 'radio' | 'drama' | 'baby' | 'panic' | 'chipmunk' | 'sleepy';


export interface User {
  userId: string;
  name: string;
  role: Role;
  color: string;
  canPlay: boolean;
  canControl: boolean;
}

export interface Track {
  trackId: string;
  youtubeUrl: string;
  title: string;
  thumbnail: string;
  duration: number;
  addedBy: string;
  hearts: string[];
  addedAt: number;
  status?: 'pending' | 'active';
  message?: string;
  voicePreset?: VoicePreset;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
}

export interface Room {
  roomId: string;
  adminId: string;
  users: User[];
  queue: Track[];
  currentTrack: Track | null;
  playbackState: PlaybackState;
  skipVotes: string[];
  activityLogs: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: string;
  userId: string;
  userName: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface JoinRoomResponse {
  room: Room;
  user: User;
}
