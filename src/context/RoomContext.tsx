'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../lib/socket';
import { Room, User, Track, ActivityLog, ChatMessage, VoicePreset } from '../types/room';
import { triggerReaction } from '../components/room/HeartCanvas';


interface RoomContextType {
  room: Room | null;
  user: User | null;
  error: string | null;
  createRoom: (name: string) => void;
  joinRoom: (roomId: string, name: string) => void;
  addTrack: (roomId: string, youtubeUrl: string, metadata: { title: string; thumbnail: string; duration: number }) => void;
  syncPlayback: (roomId: string, isPlaying: boolean, currentTime: number) => void;
  onTrackEnd: (roomId: string) => void;
  removeTrack: (roomId: string, trackId: string) => void;
  reorderTrack: (roomId: string, fromIndex: number, toIndex: number) => void;
  setControlPermission: (roomId: string, targetUserId: string, canControl: boolean) => void;
  setPlayerPermission: (roomId: string, targetUserId: string) => void;
  heartTrack: (roomId: string, trackId: string) => void;
  setTrackMessage: (roomId: string, trackId: string, message: string, voicePreset?: VoicePreset) => void;
  voteSkip: (roomId: string) => void;
  sendReaction: (emoji: string) => void;
  sendSoundEffect: (effect: string) => void;
  leaveRoom: (roomId: string) => void;
  clearError: () => void;
  pendingTracks: Track[];
  activityLogs: ActivityLog[];
  chatMessages: ChatMessage[];
  sendChat: (content: string) => void;
  setDjPermission: (roomId: string, targetUserId: string, canDj: boolean) => void;
  triggerDjSound: (soundType: 'build' | 'drop' | 'clap' | 'horn' | 'airhorn' | 'laugh' | 'applause') => void;
}



const RoomContext = createContext<RoomContextType | undefined>(undefined);

const DJ_SOUNDS = {
  build: '/sounds/build.mp3',
  drop: '/sounds/drop.mp3',
  clap: '/sounds/clap.mp3',
  horn: '/sounds/horn.mp3',
  airhorn: '/sounds/airhorn.mp3',
  laugh: '/sounds/laugh.mp3',
  applause: '/sounds/applause.wav',
};



// Voice preset configurations
const getVoiceConfig = (preset?: VoicePreset): { pitch: number; rate: number } => {
  switch (preset) {
    case 'radio':
      return { pitch: 0.9, rate: 1.2 }; // Giọng MC đài
    case 'drama':
      return { pitch: 1.6, rate: 0.8 }; // Giọng kịch tính
    case 'baby':
      return { pitch: 2.0, rate: 1.1 }; // Giọng em bé
    case 'panic':
      return { pitch: 1.7, rate: 2.0 }; // Giọng hoảng sợ
    case 'chipmunk':
      return { pitch: 1.9, rate: 1.3 }; // Giọng sóc
    case 'sleepy':
      return { pitch: 0.8, rate: 0.5 }; // Giọng buồn ngủ
    default:
      return { pitch: 1.0, rate: 1.0 }; // Default fallback
  }
};



export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTracks, setPendingTracks] = useState<Track[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  // Bump this version to force all clients to clear cache on reload
  const CLIENT_VERSION = '2025-01-10-v2.1';

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // 1. Version Check & Cache Clearing
    const storedVersion = localStorage.getItem('ms_client_version');
    if (storedVersion !== CLIENT_VERSION) {
      console.log(`[Version Check] New version detected (${CLIENT_VERSION}). Clearing stale cache...`);
      localStorage.clear(); // Wipe everything to be safe
      localStorage.setItem('ms_client_version', CLIENT_VERSION);
      // Optional: Reload once to ensure clean state if critical
    }

    // 2. Socket Connection
    socket.connect();

    socket.on('room:joined', ({ room, user }) => {
      setRoom(room);
      setUser(user);
      if (room.activityLogs) setActivityLogs(room.activityLogs);
      localStorage.setItem('ms_user_name', user.name);
      localStorage.setItem('ms_last_room', room.roomId);
    });

    socket.on('room:update', (updatedRoom: Room) => {
      // console.log('[RoomContext] room:update received', updatedRoom.activityLogs?.length);
      setRoom(updatedRoom);
      if (updatedRoom.activityLogs) setActivityLogs(updatedRoom.activityLogs);

      // Clear pending tracks once server update arrives
      setPendingTracks([]);

      // Sync local user role/data if it changed in the room
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedSelf = updatedRoom.users.find(u => u.userId === prevUser.userId);

        // Save to session cache for persistence
        if (updatedSelf) {
          localStorage.setItem('ms_user_name', updatedSelf.name);
          localStorage.setItem('ms_last_room', updatedRoom.roomId);
        }

        return updatedSelf || prevUser;
      });
    });

    socket.on('dj:event', ({ soundType }) => {
      const audioUrl = DJ_SOUNDS[soundType as keyof typeof DJ_SOUNDS];
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        // Set specific volumes as per requirements
        if (soundType === 'build') audio.volume = 0.7;
        else if (soundType === 'clap') audio.volume = 0.5;
        else audio.volume = 0.8;
        
        audio.play().catch(e => console.warn('[DJ] Playback blocked by browser', e));
      }
    });

    socket.on('room:left', () => {

      setRoom(null);
      setUser(null);
      setChatMessages([]); // Clear chat on leave
    });

    socket.on('room:closed', () => {
      setRoom(null);
      setUser(null);
      setChatMessages([]); // Clear chat on close
    });

    socket.on('error', (err) => {
      setError(err.message);
    });

    socket.on('room:reaction', ({ emoji }) => {
      // Trigger a floating emoji at a random horizontal position near the bottom
      const x = Math.random() * (window.innerWidth * 0.8) + (window.innerWidth * 0.1);
      const y = window.innerHeight - 100;
      triggerReaction(x, y, emoji);
    });

    socket.on('room:sound-effect', ({ effect }) => {
      const soundUrls: Record<string, string> = {
        airhorn: '/sounds/airhorn.mp3',
        applause: '/sounds/applause.wav',
        laugh: '/sounds/laugh.mp3',
      };

      if (soundUrls[effect]) {
        const audio = new Audio(soundUrls[effect]);
        audio.volume = 0.4; // Set a moderate volume
        audio.play().catch(e => console.warn('Sound effect blocked by browser:', e));
      }
    });

    socket.on('activity:new', (log: ActivityLog) => {
      console.log('[RoomContext] activity:new received:', log);
      setActivityLogs(prev => [log, ...prev].slice(0, 50));
    });

    socket.on('chat:receive', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:update');
      socket.off('room:left');
      socket.off('room:reaction');
      socket.off('room:sound-effect');
      socket.off('activity:new');
      socket.off('chat:receive');
      socket.off('error');
    };
  }, []);

  const createRoom = useCallback((name: string) => {
    setError(null);
    socket.emit('room:create', { name });
  }, []);

  const joinRoom = useCallback((roomId: string, name: string) => {
    setError(null);
    socket.emit('room:join', { roomId, name });
  }, []);

  const addTrack = useCallback((roomId: string, youtubeUrl: string, metadata: { title: string; thumbnail: string; duration: number }) => {
    if (!user || !room) return;

    // Check if user already has 4 tracks in the queue
    const userTracksInQueue = room.queue.filter(t => t.addedBy === user.userId).length;
    if (userTracksInQueue >= 4) {
      setError("Bạn đã đạt giới hạn 4 bài trong hàng đợi!");
      return;
    }

    // Optimistic UI: Add to pending tracks
    const tempTrack: Track = {
      trackId: `temp-${Date.now()}`,
      youtubeUrl,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      addedBy: user.userId,
      hearts: [],
      addedAt: Date.now(),
      status: 'pending',
    };
    setPendingTracks(prev => [...prev, tempTrack]);

    socket.emit('queue:add', {
      roomId,
      youtubeUrl,
      userId: user.userId,
      ...metadata,
    });
  }, [user, room]);

  const syncPlayback = useCallback((roomId: string, isPlaying: boolean, currentTime: number) => {
    if (!user?.canPlay) return;
    socket.emit('playback:sync', { roomId, userId: user.userId, isPlaying, currentTime });
  }, [user]);

  const onTrackEnd = useCallback((roomId: string) => {
    if (!user?.canPlay) return;
    socket.emit('track:end', { roomId, trackId: room?.currentTrack?.trackId });
  }, [user, room]);


  const removeTrack = useCallback((roomId: string, trackId: string) => {
    if (!user) return;
    socket.emit('queue:remove', {
      roomId,
      trackId,
      userId: user.userId,
    });
  }, [user]);

  const reorderTrack = useCallback((roomId: string, fromIndex: number, toIndex: number) => {
    if (!user?.canControl) return;
    socket.emit('queue:reorder', {
      roomId,
      userId: user.userId,
      fromIndex,
      toIndex,
    });
  }, [user]);

  const leaveRoom = useCallback((roomId: string) => {
    setRoom(null);
    setUser(null);
    setChatMessages([]);
    localStorage.removeItem('ms_last_room'); // Only clear room, keep name for convenience
    socket.emit('room:leave', { roomId });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setControlPermission = useCallback((roomId: string, targetUserId: string, canControl: boolean) => {
    if (user?.role !== 'admin') return;
    socket.emit('permission:set-control', {
      roomId,
      requesterId: user.userId,
      targetUserId,
      canControl,
    });
  }, [user]);

  const setPlayerPermission = useCallback((roomId: string, targetUserId: string) => {
    if (user?.role !== 'admin') return;
    socket.emit('permission:set-player', {
      roomId,
      requesterId: user.userId,
      targetUserId,
    });
  }, [user]);

  const heartTrack = useCallback((roomId: string, trackId: string) => {
    if (!user) return;
    socket.emit('queue:heart', {
      roomId,
      trackId,
      userId: user.userId,
    });
  }, [user]);

  const setTrackMessage = useCallback((roomId: string, trackId: string, message: string, voicePreset?: VoicePreset) => {
    if (!user) return;
    socket.emit('queue:set-message', {
      roomId,
      trackId,
      userId: user.userId,
      message,
      voicePreset
    });
  }, [user]);

  const voteSkip = useCallback((roomId: string) => {
    if (!user) return;
    socket.emit('queue:vote-skip', {
      roomId,
      userId: user.userId,
    });
  }, [user]);

  const sendReaction = useCallback((emoji: string) => {
    if (!user || !room) return;
    socket.emit('room:reaction', {
      roomId: room.roomId,
      emoji,
    });
  }, [user, room]);

  const sendSoundEffect = useCallback((effect: string) => {
    if (!user || !room) return;
    socket.emit('room:sound-effect', {
      roomId: room.roomId,
      effect,
    });
  }, [user, room]);

  const speak = useCallback((text: string, voicePreset?: VoicePreset) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      
      // Apply voice configuration based on preset
      const config = getVoiceConfig(voicePreset);
      utterance.pitch = config.pitch;
      utterance.rate = config.rate;
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Track Change Listener for TTS (Gửi lời chúc) - Keep this as requested
  const prevTrackId = useRef<string | null>(null);
  useEffect(() => {
    const currentTrack = room?.currentTrack;
    if (currentTrack && currentTrack.trackId !== prevTrackId.current) {
      if (currentTrack.message) {
        speak(currentTrack.message, currentTrack.voicePreset);
      }
      prevTrackId.current = currentTrack.trackId;
    }
    if (!currentTrack) prevTrackId.current = null;
  }, [room?.currentTrack, speak]);


  const sendChat = useCallback((content: string) => {
    if (!user || !room) return;
    socket.emit('chat:send', {
      roomId: room.roomId,
      content,
      userId: user.userId,
      userName: user.name
    });
  }, [user, room]);

  const setDjPermission = useCallback((roomId: string, targetUserId: string, canDj: boolean) => {
    if (!user || user.role !== 'admin') return;
    socket.emit('dj:toggle-permission', {
      roomId,
      targetUserId,
      canDj,
      adminId: user.userId,
    });
  }, [user]);

  const triggerDjSound = useCallback((soundType: 'build' | 'drop' | 'clap' | 'horn' | 'airhorn' | 'laugh' | 'applause') => {


    if (!user || !room) return;
    socket.emit('dj:trigger', {
      roomId: room.roomId,
      userId: user.userId,
      soundType,
    });
  }, [user, room]);

  return (
    <RoomContext.Provider value={{
      room, user, error, createRoom, joinRoom, addTrack, syncPlayback, onTrackEnd, removeTrack, reorderTrack, setControlPermission, setPlayerPermission, heartTrack, setTrackMessage, voteSkip, sendReaction, sendSoundEffect, leaveRoom, clearError, pendingTracks, activityLogs, chatMessages, sendChat, setDjPermission, triggerDjSound
    }}>
      {children}
    </RoomContext.Provider>
  );
};


export const useRoom = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
