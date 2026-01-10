'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import {
  Plus, Music, Search, Share2, LogOut, Disc, Headphones,
  ExternalLink, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartCanvas, triggerHearts } from '@/components/room/HeartCanvas';
import { RoomBackground } from '@/components/room/RoomBackground';
import { JoinRoomModal } from '@/components/room/JoinRoomModal';
import { SyncingOverlay } from '@/components/room/SyncingOverlay';
import { RoomHeader } from '@/components/room/RoomHeader';
import { CinemaStage } from '@/components/room/CinemaStage';
import { PlaybackControls } from '@/components/room/PlaybackControls';
import { SidebarTabs } from '@/components/room/SidebarTabs';
import { QueueList } from '@/components/room/QueueList';
import { ListenerList } from '@/components/room/ListenerList';
import { ChatList } from '@/components/room/ChatList';
import { GlobalErrorToast } from '@/components/room/GlobalErrorToast';
import { ActivityLogPopup } from '@/components/room/ActivityLogPopup';
import { WishModal } from '@/components/room/WishModal';
import { Track, VoicePreset } from '@/types/room';


export default function RoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    room, user, addTrack, syncPlayback, onTrackEnd, joinRoom, error,
    removeTrack, reorderTrack, leaveRoom, clearError,
    setControlPermission, setPlayerPermission, heartTrack, setTrackMessage,
    voteSkip, sendReaction, sendSoundEffect, pendingTracks, activityLogs

  } = useRoom();
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [activeTab, setActiveTab] = useState<'queue' | 'users'>('queue');

  const [probedMetadata, setProbedMetadata] = useState<{ title: string, duration: number, thumbnail: string } | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const playerRef = useRef<any>(null);

  // Global Wish Modal State
  const [wishModalOpen, setWishModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [wishInput, setWishInput] = useState('');
  const [voicePreset, setVoicePreset] = useState<VoicePreset>('radio');

  const handleOpenWishModal = (track: Track) => {
    setSelectedTrack(track);
    setWishInput(track.message || '');
    setVoicePreset(track.voicePreset || 'radio');
    setWishModalOpen(true);
  };

  const handleSaveWish = () => {
    if (selectedTrack && room) {
      setTrackMessage(room.roomId, selectedTrack.trackId, wishInput, voicePreset);
      setWishModalOpen(false);
      setSelectedTrack(null);
      setWishInput('');
      setVoicePreset('radio');
    }
  };


  // Handle auto-clearing errors for toasts
  useEffect(() => {
    if (error && user) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, user, clearError]);

  // AUTO-REJOIN LOGIC: Check for cached session on mount
  useEffect(() => {
    const cachedName = localStorage.getItem('ms_user_name');
    const cachedRoomId = localStorage.getItem('ms_last_room');

    // If we have a name and the room matches the current URL ID, and we aren't joined yet
    if (cachedName && id && !user) {
      // Pre-fill name input
      setNameInput(cachedName);

      // If the room ID matches our last session, try to auto-join
      if (cachedRoomId === id) {
        console.log("Auto-rejoining room...");
        joinRoom(id as string, cachedName);
      }
    }
  }, [id, user, joinRoom]);

  // Smooth local timer for progress bar using requestAnimationFrame
  useEffect(() => {
    if (!room?.playbackState.isPlaying) {
      if (room?.playbackState) {
        setDisplayTime(room.playbackState.currentTime);
      }
      return;
    }

    let animationFrameId: number;
    const updateTime = () => {
      if (room.playbackState.lastUpdated) {
        // Calculate exact progress based on server timestamp + local elapsed
        const now = Date.now();
        // Adding 200ms buffer to compensate for average network latency
        const elapsed = (now - room.playbackState.lastUpdated) / 1000;
        setDisplayTime(room.playbackState.currentTime + elapsed);
      }
      animationFrameId = requestAnimationFrame(updateTime);
    };

    updateTime();

    return () => cancelAnimationFrame(animationFrameId);
  }, [room?.playbackState]);


  const isAdmin = room?.adminId === user?.userId;

  // Robust permission checks: Default to true for Admin if properties are missing
  const canPlay = user?.canPlay ?? (user?.role === 'admin');
  const canControl = user?.canControl ?? (user?.role === 'admin');

  // More robust YouTube video ID extraction
  const getYouTubeId = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const currentVideoId = getYouTubeId(room?.currentTrack?.youtubeUrl) || undefined;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExitRoom = () => {
    leaveRoom(room!.roomId);
    router.push('/');
  };

  const fetchYoutubeMetadata = async (url: string) => {
    try {
      const videoId = getYouTubeId(url);
      if (!videoId) return null;

      // Use noembed.com for basic metadata since it's free and no-CORS
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await response.json();

      return {
        title: data.title || 'Unknown Title',
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0 // Will fallback to 0 if we can't get it, or handle via specific YT API if available
      };
    } catch (e) {
      console.error("Metadata fetch error", e);
      return null;
    }
  };

  const handleAddMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    const videoId = getYouTubeId(url);
    if (!videoId) {
      setYoutubeError('Please enter a valid YouTube URL');
      return;
    }

    // Check queue limit (Optimistic check)
    const userTracksCount = room?.queue.filter(t => t.addedBy === user?.userId).length || 0;
    if (userTracksCount >= 4) {
      setYoutubeError("Bạn đã đạt giới hạn 4 bài trong hàng đợi!");
      return;
    }

    // CHẶN TUYỆT ĐỐI: Nếu là link YouTube mà chưa lấy được metadata (duration) thì không cho Add
    if (videoId && !probedMetadata) {
      console.log("Please wait for metadata to be fetched...");
      return;
    }

    // Use probed metadata if available, otherwise try one last fetch
    const finalMetadata = probedMetadata || (await fetchYoutubeMetadata(urlInput));

    addTrack(room!.roomId, urlInput, finalMetadata || {
      title: 'New Track',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0
    });

    setUrlInput('');
    setProbedMetadata(null);
    setIsProbing(false);
    setYoutubeError(null);
  };

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    setProbedMetadata(null);
    setYoutubeError(null);

    // Quick check: if already at limit, don't even probe
    const userTracksCount = room?.queue.filter(t => t.addedBy === user?.userId).length || 0;
    if (userTracksCount >= 4) {
      setYoutubeError("Bạn đã đạt giới hạn 4 bài trong hàng đợi!");
      setIsProbing(false);
      return;
    }

    const videoId = getYouTubeId(val);
    if (videoId) {
      setIsProbing(true);
    } else {
      setIsProbing(false);
    }
  };

  return (
    <div className="min-h-[150vh] bg-[#050505] text-slate-200 relative selection:bg-brand-primary/30 pb-[250px] md:pb-24">

      <HeartCanvas />

      {/* --- Immersive Ambient Background (PERSISTENT) --- */}
      <RoomBackground thumbnail={room?.currentTrack?.thumbnail} />

      {/* --- Content Layers (Animated Transitions) --- */}
      <AnimatePresence mode="wait">
        {!user ? (
          <JoinRoomModal
            id={id as string}
            nameInput={nameInput}
            setNameInput={setNameInput}
            error={error}
            clearError={clearError}
            joinRoom={joinRoom}
          />
        ) : !room ? (
          <SyncingOverlay error={error} />
        ) : (
          <motion.div
            key="room-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-30 w-full"
          >
            {/* Hidden Metadata Prober */}
            <div className="hidden">
              {getYouTubeId(urlInput) && (
                <YouTube
                  videoId={getYouTubeId(urlInput)!}
                  onReady={(e) => {
                    const dur = e.target.getDuration();
                    const data = e.target.getVideoData();
                    setProbedMetadata({
                      title: data.title || 'Unknown Video',
                      duration: dur || 0,
                      thumbnail: `https://img.youtube.com/vi/${getYouTubeId(urlInput)}/hqdefault.jpg`
                    });
                    setIsProbing(false);
                  }}
                  onError={() => setIsProbing(false)}
                />
              )}
            </div>

            {/* Dynamic Header */}
            <RoomHeader
              room={room}
              router={router}
              handleCopyLink={handleCopyLink}
              copied={copied}
              handleExitRoom={handleExitRoom}
              handleAddMusic={handleAddMusic}
              urlInput={urlInput}
              handleUrlChange={handleUrlChange}
              youtubeError={youtubeError}
              getYouTubeId={getYouTubeId}
              probedMetadata={probedMetadata}
              isProbing={isProbing}
            />

            {/* Main Layout: Dynamic height for fluid scrolling on all screens */}
            <main className="max-w-[1700px] mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 min-h-[calc(100vh-80px)]">
              {/* Cinematic Stage Area */}
              <div className="lg:col-span-8 space-y-6 pb-10 relative z-20">
                <CinemaStage
                  canPlay={canPlay}
                  currentVideoId={currentVideoId}
                  room={room}
                  volume={volume}
                  isMuted={isMuted}
                  playerRef={playerRef}
                  setDuration={setDuration}
                  onTrackEnd={onTrackEnd}
                />

                <PlaybackControls
                  room={room}
                  user={user}
                  canPlay={canPlay}
                  displayTime={displayTime}
                  setDisplayTime={setDisplayTime}
                  duration={duration}
                  volume={volume}
                  setVolume={setVolume}
                  isMuted={isMuted}
                  setIsMuted={setIsMuted}
                  syncPlayback={syncPlayback}
                  onTrackEnd={onTrackEnd}
                  heartTrack={heartTrack}
                  voteSkip={voteSkip}
                  sendReaction={sendReaction}
                  sendSoundEffect={sendSoundEffect}
                />

                {/* Mobile Overlay Search (Mobile Only) */}
                <div className="md:hidden glass-effect p-6 rounded-[2rem]">
                  <form onSubmit={handleAddMusic} className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="YouTube Link..."
                        className={`flex-1 input-field rounded-2xl h-14 ${youtubeError ? 'border-red-500 ring-1 ring-red-500/50' : ''}`}
                      />
                      <button
                        type="submit"
                        disabled={!urlInput.trim() || (getYouTubeId(urlInput) !== null && !probedMetadata)}
                        className="btn-primary w-14 h-14 !p-0 !rounded-2xl flex items-center justify-center disabled:opacity-50 disabled:grayscale"
                      >
                        {isProbing && !probedMetadata ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus className="w-6 h-6" />}
                      </button>
                    </div>
                    {youtubeError && (
                      <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-center">
                        {youtubeError}
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Studio Control Center (Sidebar) */}
              <div className="lg:col-span-4 flex flex-col gap-6 h-auto lg:sticky lg:top-24">
                {/* --- Queue & Listeners Card --- */}
                <div className="glass-effect rounded-[2.5rem] flex flex-col h-[600px] lg:h-[590px] overflow-hidden shadow-2xl border border-white/5">
                  <SidebarTabs
                    activeTab={activeTab as any}
                    setActiveTab={setActiveTab as any}
                    queueLength={room.queue.length}
                    listenersCount={room.users.length}
                  />

                  <div className="flex-1 overflow-hidden flex flex-col relative">
                    <AnimatePresence mode="wait">
                      {activeTab === 'queue' ? (
                        <QueueList
                          key="queue-list"
                          room={room}
                          user={user}
                          pendingTracks={pendingTracks}
                          canControl={canControl}
                          isAdmin={isAdmin}
                          heartTrack={heartTrack}
                          reorderTrack={reorderTrack}
                          removeTrack={removeTrack}
                          setTrackMessage={setTrackMessage}
                          onOpenWishModal={handleOpenWishModal}
                        />

                      ) : (
                        <ListenerList
                          key="listener-list"
                          room={room}
                          user={user}
                          isAdmin={isAdmin}
                          setPlayerPermission={setPlayerPermission}
                          setControlPermission={setControlPermission}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* --- Separate Chat Section --- */}
                <div className="glass-effect rounded-[2.5rem] flex flex-col h-[520px] lg:h-[500px] overflow-hidden shadow-2xl border border-white/5">
                  <ChatList />
                </div>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Utils */}
      <ActivityLogPopup logs={activityLogs} />

      <GlobalErrorToast
        error={error}
        user={user}
        clearError={clearError}
      />

      <WishModal 
        isOpen={wishModalOpen}
        onClose={() => setWishModalOpen(false)}
        track={selectedTrack}
        wishInput={wishInput}
        setWishInput={setWishInput}
        voicePreset={voicePreset}
        setVoicePreset={setVoicePreset}
        onSave={handleSaveWish}
      />
    </div>
  );
}

