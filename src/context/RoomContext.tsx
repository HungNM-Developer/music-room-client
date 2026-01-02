'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { Room, User, Track } from '../types/room';

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
  leaveRoom: (roomId: string) => void;
  clearError: () => void;
  pendingTracks: Track[];
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTracks, setPendingTracks] = useState<Track[]>([]);

  useEffect(() => {
    socket.connect();

    socket.on('room:joined', ({ room, user }) => {
      setRoom(room);
      setUser(user);
      localStorage.setItem('ms_user_name', user.name);
      localStorage.setItem('ms_last_room', room.roomId);
    });

    socket.on('room:update', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      
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

    socket.on('room:left', () => {
      setRoom(null);
      setUser(null);
    });

    socket.on('room:closed', () => {
      setRoom(null);
      setUser(null);
    });

    socket.on('error', (err) => {
      setError(err.message);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:update');
      socket.off('room:left');
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
      status: 'pending'
    };
    setPendingTracks(prev => [...prev, tempTrack]);

    socket.emit('queue:add', {
      roomId,
      youtubeUrl,
      userId: user.userId,
      ...metadata
    });
  }, [user]);

  const syncPlayback = useCallback((roomId: string, isPlaying: boolean, currentTime: number) => {
    if (!user?.canPlay) return;
    socket.emit('playback:sync', { roomId, userId: user.userId, isPlaying, currentTime });
  }, [user]);

  const onTrackEnd = useCallback((roomId: string) => {
    if (!user?.canPlay) return;
    socket.emit('track:end', { roomId });
  }, [user]);


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

  return (
    <RoomContext.Provider value={{
      room, user, error, createRoom, joinRoom, addTrack, syncPlayback, onTrackEnd, removeTrack, reorderTrack, setControlPermission, setPlayerPermission, heartTrack, leaveRoom, clearError, pendingTracks
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
