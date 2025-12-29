export type Role = 'admin' | 'user';

export interface User {
  userId: string;
  name: string;
  role: Role;
  color: string;
}

export interface Track {
  trackId: string;
  youtubeUrl: string;
  title: string;
  thumbnail: string;
  duration: number;
  addedBy: string;
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
}

export interface JoinRoomResponse {
    room: Room;
    user: User;
}
