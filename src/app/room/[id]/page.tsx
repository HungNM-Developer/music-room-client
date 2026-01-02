'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { YoutubePlayer } from '@/components/YoutubePlayer';
import { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { 
  Plus, Users, LayoutList, Share2, LogOut, Disc, Music, 
  Send, SkipForward, Play, Pause, Search, User as UserIcon,
  Crown, ExternalLink, Trash2, Layers, ChevronRight, Activity,
  ChevronUp, ChevronDown, Gamepad2, Headphones, Heart, AlertTriangle,
  Volume2, VolumeX, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartCanvas, triggerHearts } from '@/components/room/HeartCanvas';

// --- Visual Components ---
const PlayingVisualizer = () => (
  <div className="flex items-end gap-[2px] h-3 mb-0.5">
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="w-1 bg-green-400 rounded-t-sm"
        animate={{
          height: [4, 12, 4],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatType: "reverse",
          delay: i * 0.1,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

export default function RoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { 
    room, user, addTrack, syncPlayback, onTrackEnd, joinRoom, error, 
    removeTrack, reorderTrack, leaveRoom, clearError, 
    setControlPermission, setPlayerPermission, heartTrack, pendingTracks
  } = useRoom();
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'users'>('queue');
  const [probedMetadata, setProbedMetadata] = useState<{title: string, duration: number, thumbnail: string} | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const playerRef = useRef<any>(null);

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
    <div className="min-h-screen bg-[#050505] text-slate-200 relative overflow-hidden selection:bg-brand-primary/30">
        <HeartCanvas />
        
        {/* --- Immersive Ambient Background (PERSISTENT) --- */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                    key={room?.currentTrack?.thumbnail || 'default'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 z-0 bg-black"
                >
                    {room?.currentTrack?.thumbnail ? (
                        <div 
                            className="w-full h-full bg-cover bg-center blur-[120px] saturate-[1.8] brightness-[0.6]"
                            style={{ backgroundImage: `url(${room.currentTrack.thumbnail})` }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black blur-[120px]" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Animated Mesh Gradients for Color Movement */}
            <div className="absolute inset-0 z-10 opacity-30">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[100%] h-[100%] bg-brand-primary/20 blur-[150px] rounded-full"
                />
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[100%] h-[100%] bg-brand-accent/15 blur-[150px] rounded-full"
                />
            </div>
            
            {/* Grain Texture Overlay */}
            <div className="absolute inset-0 z-20 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        {/* --- Content Layers (Animated Transitions) --- */}
        <AnimatePresence mode="wait">
            {!user ? (
                <motion.div 
                    key="join-ui"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="relative z-50 min-h-screen flex items-center justify-center p-6"
                >
                    <div className="w-full max-w-sm glass-effect p-10 text-center space-y-8 rounded-[3rem] shadow-2xl">
                        <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto animate-float">
                            <Music className="w-10 h-10 text-brand-primary" />
                        </div>
                        
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black tracking-tighter">Enter Room</h2>
                            <p className="text-slate-500 text-sm">Join the session in room <span className="text-indigo-400 font-mono font-bold tracking-widest">{id}</span></p>
                            {error && <p className="text-red-400 text-xs bg-red-400/5 p-3 rounded-xl border border-red-500/10">{error}</p>}
                            
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    value={nameInput}
                                    onChange={(e) => {
                                        setNameInput(e.target.value);
                                        if (error) clearError();
                                    }}
                                    placeholder="What's your name?"
                                    className="w-full input-field text-center text-lg h-14"
                                    onKeyDown={(e) => e.key === 'Enter' && joinRoom(id as string, nameInput)}
                                />
                                <button 
                                    onClick={() => joinRoom(id as string, nameInput)}
                                    className="w-full btn-primary h-14 !rounded-2xl group"
                                >
                                    Join Now <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : !room ? (
                <motion.div 
                    key="loading-ui"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-50 min-h-screen flex items-center justify-center"
                >
                    <div className="text-center space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full" />
                            <Disc className="w-16 h-16 text-brand-primary mx-auto animate-spin relative" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Syncing Stream...</p>
                            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div 
                    key="room-ui"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative z-30 w-full"
                >
                    {/* Dynamic Header */}
      <header className="relative z-10 flex-col gap-4 h-auto py-4 md:flex-row md:h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between sticky top-0 rounded-b-[2.5rem] mx-2 md:mx-4 my-2 shadow-2xl backdrop-blur-[30px] bg-black/30">
        <div className="flex items-center gap-6">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => router.push('/')}
          >
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20 group-hover:scale-110 transition-transform">
              <Music className="w-6 h-6 text-white" />
            </div>
            {/* Hide text on small mobile, show on larger screens */}
            <h1 className="text-xl font-black tracking-tighter hidden md:block">Room<span className="text-brand-primary">Sync</span></h1>
          </div>
          
          <div className="h-4 w-[1px] bg-white/10" />
          
          <div className="flex items-center gap-3 px-4 py-2 bg-surface-900/50 rounded-full border border-white/5">
            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Live: {room.roomId}</span>
          </div>
        </div>

        <form onSubmit={handleAddMusic} className="hidden md:flex flex-1 max-w-2xl mx-12">
          <div className="relative w-full">
            <input 
              type="text" 
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste YouTube Link to add music..."
              className={`w-full bg-white/5 border ${youtubeError ? 'border-red-500 ring-1 ring-red-500/50' : 'border-white/10'} rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:bg-white/10 transition-all placeholder:text-slate-600`}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            
            {youtubeError && (
              <div className="absolute top-full left-0 mt-2 text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
                {youtubeError}
              </div>
            )}

            <button 
              type="submit"
              disabled={!urlInput.trim() || (getYouTubeId(urlInput) !== null && !probedMetadata)}
              className="absolute right-2 top-1.5 bottom-1.5 px-6 bg-brand-primary text-white rounded-xl font-bold text-[10px] tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/25 disabled:opacity-50 disabled:grayscale disabled:scale-100"
            >
              {isProbing && !probedMetadata ? 'Fetching...' : 'Add Music'}
            </button>
          </div>
        </form>

        <div className="hidden">
          {getYouTubeId(urlInput) && (
            <YouTube
              videoId={getYouTubeId(urlInput)!}
              onReady={(e) => {
                const duration = e.target.getDuration();
                const data = e.target.getVideoData();
                setProbedMetadata({
                  title: data.title || 'Unknown Video',
                  duration: duration || 0,
                  thumbnail: `https://img.youtube.com/vi/${getYouTubeId(urlInput)}/hqdefault.jpg`
                });
                setIsProbing(false);
              }}
              onError={() => setIsProbing(false)}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopyLink} 
            className={`p-2.5 transition-all !rounded-xl relative ${copied ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'btn-secondary'}`} 
            title="Share Access"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest absolute -bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded-md">Copied!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="share"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <Share2 className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button onClick={handleExitRoom} className="p-2.5 glass-effect rounded-xl text-red-500 border-red-400/10 hover:bg-red-500/10 transition-colors" title="Leave Room">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout: Use min-h-dvh for mobile browsers to handle address bar resizing properly */}
      <main className="max-w-[1700px] mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 h-auto lg:h-[calc(100vh-120px)] min-h-[calc(100dvh-120px)]">
        {/* Cinematic Stage Area */}
        <div className="lg:col-span-8 space-y-6 overflow-y-auto no-scrollbar pb-10 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-[3.5rem] overflow-hidden bg-black/40 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-md"
          >
             {canPlay ? (
                currentVideoId ? (
                  <YoutubePlayer
                    videoId={currentVideoId}
                    isPlaying={room.playbackState.isPlaying}
                    currentTime={room.playbackState.currentTime}
                    volume={volume}
                    isMuted={isMuted}
                    onReady={(player) => {
                      playerRef.current = player;
                      setDuration(player.getDuration());
                    }}
                    onEnd={() => onTrackEnd(room.roomId)}
                  />
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center py-12 md:py-32 text-slate-600">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 md:mb-8">
                       <Layers className="w-8 h-8 md:w-10 md:h-10 opacity-20" />
                    </div>
                    <h3 className="text-lg md:text-xl font-black mb-2 uppercase tracking-widest text-slate-500">The Stage is Dark</h3>
                    <p className="text-xs md:text-sm opacity-50">Add a track to start the session</p>
                  </div>
               )
              ) : (
                  <div className="aspect-video relative overflow-hidden group rounded-[3.5rem]">
                     {room.currentTrack?.thumbnail ? (
                        <>
                           {/* Full Frame Thumbnail */}
                           <motion.div
                              key={room.currentTrack.trackId}
                              initial={{ opacity: 0, scale: 1.1 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 1 }}
                              className="absolute inset-0"
                           >
                              <img 
                                 src={room.currentTrack.thumbnail} 
                                 alt="" 
                                 className="w-full h-full object-cover brightness-[0.7] saturate-[1.2]"
                              />
                              {/* Overlay Gradients */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                           </motion.div>
                           
                           <div className="absolute inset-0 z-10 p-8 md:p-12 flex flex-col justify-end">
                              <motion.div 
                                 initial={{ x: -20, opacity: 0 }}
                                 animate={{ x: 0, opacity: 1 }}
                                 transition={{ delay: 0.3 }}
                                 className="space-y-4"
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-primary/40 border border-white/20">
                                       <Headphones className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                       Listener Mode
                                    </div>
                                 </div>
                                 
                                 <div className="max-w-xl">
                                    <h3 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-2xl line-clamp-2">
                                       {room.currentTrack.title}
                                    </h3>
                                    <p className="mt-4 text-xs md:text-sm text-slate-300 font-medium flex items-center gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                       Broadcasting from: <span className="text-white font-bold">{room.users.find(u => u.canPlay)?.name || 'Someone'}</span>
                                    </p>
                                 </div>
                              </motion.div>
                           </div>

                           {/* Content Contribution Hint (Top Right) */}
                           <div className="absolute top-8 right-8 z-10 hidden md:block">
                              <div className="px-5 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                 Add to queue to play next ⚡
                              </div>
                           </div>
                        </>
                     ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center py-12 md:py-32 text-slate-600 bg-surface-900/50">
                           <div className="relative mb-6 md:mb-8">
                              <div className="absolute inset-0 bg-brand-primary/10 blur-3xl rounded-full" />
                              <div className="w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5 relative z-10">
                                <Activity className="w-8 h-8 md:w-10 md:h-10 text-brand-primary animate-pulse" />
                              </div>
                           </div>
                           <h3 className="text-lg md:text-xl font-black mb-2 uppercase tracking-widest text-white">Listener Mode</h3>
                           <p className="text-xs md:text-sm text-slate-500 max-w-sm text-center px-4 md:px-8 leading-relaxed">
                              Waiting for original broadcast...
                           </p>
                        </div>
                     )}
                  </div>
              )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-black/20 backdrop-blur-2xl p-10 rounded-[3.5rem] relative overflow-hidden border border-white/5 shadow-2xl"
          >
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-primary/5 blur-[100px] rounded-full" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 relative z-10">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all duration-500
                        ${room.playbackState.isPlaying 
                            ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
                            : 'bg-white/5 text-slate-400 border-white/10'}`}>
                        {room.playbackState.isPlaying ? (
                            <>
                                <PlayingVisualizer />
                                ON AIR
                            </>
                        ) : (
                            <>
                                <Pause className="w-3 h-3" />
                                PAUSED
                            </>
                        )}
                    </div>
                    <span className="text-[11px] text-slate-600 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                        <UserIcon className="w-3 h-3" /> Requester: <span className="text-slate-300">{room.users.find(u => u.userId === room.currentTrack?.addedBy)?.name || 'Listener'}</span>
                    </span>
                    {room.currentTrack?.hearts && (
                        <button 
                            onClick={(e) => {
                                heartTrack(room.roomId, room.currentTrack!.trackId);
                                triggerHearts(e.clientX, e.clientY);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                                room.currentTrack.hearts.includes(user!.userId) 
                                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                                : 'bg-white/5 border-white/10 text-slate-500 hover:text-red-400 hover:border-red-400/30'
                            }`}
                        >
                            <Heart className={`w-3 h-3 ${room.currentTrack.hearts.includes(user!.userId) ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-black">{room.currentTrack.hearts.length}</span>
                        </button>
                    )}
                </div>
                <h2 className="text-4xl font-black tracking-tighter leading-tight text-white max-w-2xl">
                    {room.currentTrack?.title || 'Awaiting Broadcast...'}
                </h2>
                
                {room.currentTrack && (
                  <div className="space-y-4 pt-4">
                    {/* Progress Bar */}
                     <div className="space-y-2">
                       <input 
                         type="range" 
                         min="0" 
                         max={duration || room.currentTrack.duration || 100} 
                         value={displayTime}
                         disabled={!canPlay}
                         onChange={(e) => {
                           const val = parseFloat(e.target.value);
                           setDisplayTime(val); // Immediate local update
                           syncPlayback(room.roomId, room.playbackState.isPlaying, val);
                         }}
                         className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary ${!canPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
                       />
                       <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>{new Date(displayTime * 1000).toISOString().substr(14, 5)}</span>
                          <span>{new Date((duration || room.currentTrack.duration || 0) * 1000).toISOString().substr(14, 5)}</span>
                       </div>
                    </div>

                    {/* Volume Controls (Local to each user) */}
                    <div className="flex items-center gap-4">
                       <button 
                         onClick={() => setIsMuted(!isMuted)}
                         className="p-2 glass-effect rounded-xl hover:bg-white/10 transition-all"
                       >
                         {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
                       </button>
                       <input 
                         type="range" 
                         min="0" 
                         max="100" 
                         value={volume}
                         onChange={(e) => setVolume(parseInt(e.target.value))}
                         className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-slate-400"
                       />
                    </div>
                  </div>
                )}
              </div>

              {canPlay && (
                <div className="flex items-center gap-4 self-start md:self-center">
                    <button 
                        onClick={() => syncPlayback(room.roomId, !room.playbackState.isPlaying, room.playbackState.currentTime)}
                        disabled={!room.currentTrack}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-3xl bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {room.playbackState.isPlaying ? <Pause className="w-6 h-6 md:w-7 md:h-7 fill-current" /> : <Play className="w-6 h-6 md:w-7 md:h-7 fill-current translate-x-0.5" />}
                    </button>
                    {/* Manual Skip Button - only for Players */}
                    <button 
                        onClick={() => onTrackEnd(room.roomId)}
                        disabled={room.queue.length === 0}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-3xl glass-effect flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:scale-100"
                        title="Force Skip"
                    >
                        <SkipForward className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                </div>
              )}
            </div>
          </motion.div>
          
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
        <div className="lg:col-span-4 flex flex-col gap-8 h-full">
          <div className="glass-effect rounded-[3rem] flex flex-col flex-1 overflow-hidden">
            <div className="p-3 flex gap-2 border-b border-white/5 bg-white/2">
                <button 
                    onClick={() => setActiveTab('queue')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest
                        ${activeTab === 'queue' ? 'bg-surface-700 text-white shadow-xl shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <LayoutList className="w-4 h-4" /> Queue
                    {room.queue.length > 0 && <span className="bg-brand-primary text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">{room.queue.length}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest
                        ${activeTab === 'users' ? 'bg-surface-700 text-white shadow-xl shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Users className="w-4 h-4" /> Listeners
                    <span className="bg-indigo-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">{room.users.length}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {activeTab === 'queue' ? (
                        room.queue.length > 0 ? (
                            [...room.queue, ...pendingTracks].map((track, idx) => (
                                <motion.div 
                                    key={track.trackId}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`group relative flex gap-4 p-3 rounded-[1.5rem] transition-all mb-3 border shadow-sm backdrop-blur-md
                                        ${track.status === 'pending' ? 'opacity-60 border-dashed border-white/20' : 
                                          idx === 0 
                                            ? 'bg-brand-primary/10 border-brand-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.1) ring-1 ring-brand-primary/20' 
                                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-transparent hover:border-white/5'
                                        }`}
                                >
                                    <div className="w-20 h-12 rounded-xl overflow-hidden bg-surface-800 flex-shrink-0 relative ring-1 ring-white/5 transition-all">
                                        {track.thumbnail ? (
                                            <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                <Music className="w-4 h-4 text-slate-600" />
                                            </div>
                                        )}
                                        {track.status === 'pending' && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-xs font-bold truncate text-slate-200 group-hover:text-white transition-colors">
                                                {track.title}
                                            </h4>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] text-slate-500 font-medium">
                                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                            </span>
                                            
                                            {!track.status && (
                                                <div className="flex items-center gap-1.5 translate-x-1">
                                                    <button 
                                                        onClick={(e) => {
                                                            heartTrack(room.roomId, track.trackId);
                                                            triggerHearts(e.clientX, e.clientY);
                                                        }}
                                                        className={`p-1.5 px-2.5 flex items-center gap-1.5 rounded-lg border transition-all ${
                                                            track.hearts?.includes(user!.userId) 
                                                            ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                                                            : 'bg-surface-900 border-white/5 text-slate-500 hover:text-red-400 hover:border-red-400/30'
                                                        }`}
                                                    >
                                                        <Heart className={`w-3 h-3 ${track.hearts?.includes(user!.userId) ? 'fill-current' : ''}`} />
                                                        <span className="text-[10px] font-black">{track.hearts?.length || 0}</span>
                                                    </button>

                                                    {canControl && (
                                                        <>
                                                            <button 
                                                                onClick={() => reorderTrack(room.roomId, idx, idx - 1)}
                                                                disabled={idx === 0}
                                                                className="p-1 text-slate-500 hover:text-brand-primary transition-all bg-surface-900 rounded-lg border border-white/5 disabled:opacity-20" 
                                                                title="Move Up"
                                                            >
                                                                <ChevronUp className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={() => reorderTrack(room.roomId, idx, idx + 1)}
                                                                disabled={idx === room.queue.length - 1}
                                                                className="p-1 text-slate-500 hover:text-brand-primary transition-all bg-surface-900 rounded-lg border border-white/5 disabled:opacity-20" 
                                                                title="Move Down"
                                                            >
                                                                <ChevronDown className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {(isAdmin || track.addedBy === user.userId) && (
                                                        <button 
                                                            onClick={() => removeTrack(room.roomId, track.trackId)}
                                                            className="p-1.5 text-slate-500 hover:text-red-400 transition-all bg-surface-900 rounded-lg border border-white/5" 
                                                            title="Remove Track"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 py-32 space-y-4 opacity-30 grayscale">
                                <Layers className="w-16 h-16" />
                                <p className="text-xs font-black uppercase tracking-[0.3em]">Hàng đợi trống</p>
                            </div>
                        )
                    ) : (
                        room.users.map((u) => (
                            <motion.div 
                                key={u.userId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-4 p-4 rounded-[2rem] hover:bg-white/[0.04] transition-all mb-2 group shadow-sm bg-surface-900/20"
                            >
                                <div className="relative">
                                    <div 
                                        className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-white font-black text-base shadow-lg"
                                        style={{ backgroundColor: u.color }}
                                    >
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-4 border-surface-900" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-sm flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-2">
                                                {u.name}
                                                {u.role === 'admin' && <Crown className="w-3 h-3 text-yellow-500" />}
                                                {u.canPlay && <Headphones className="w-3 h-3 text-emerald-500" />}
                                                {u.canControl && <Gamepad2 className="w-3 h-3 text-amber-500" />}
                                            </span>
                                            <div className="flex items-center gap-1.5 px-0.5">
                                                {u.canPlay ? 
                                                    <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-1 rounded-sm tracking-tighter uppercase">PLAYER</span> : 
                                                    <span className="text-[7px] font-black text-slate-600 bg-white/5 px-1 rounded-sm tracking-tighter uppercase">LISTENER</span>
                                                }
                                                {u.canControl && <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1 rounded-sm tracking-tighter uppercase">CONTROLLER</span>}
                                                
                                                {/* User's Total Hearts Received */}
                                                {(room.queue.some(t => t.addedBy === u.userId && t.hearts?.length > 0) || (room.currentTrack?.addedBy === u.userId && (room.currentTrack.hearts?.length || 0) > 0)) && (
                                                    <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md ml-1 scale-90">
                                                        <Heart className="w-2.5 h-2.5 fill-current" />
                                                        <span className="text-[8px] font-black">
                                                            {(() => {
                                                                let total = 0;
                                                                room.queue.forEach(t => { if(t.addedBy === u.userId) total += (t.hearts?.length || 0); });
                                                                if(room.currentTrack?.addedBy === u.userId) total += (room.currentTrack.hearts?.length || 0);
                                                                return total;
                                                            })()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {u.userId === user.userId && <span className="text-[9px] font-black text-brand-primary tracking-widest">YOU</span>}
                                            {isAdmin && (
                                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all bg-surface-900/80 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
                                                    <button 
                                                        onClick={() => setPlayerPermission(room.roomId, u.userId)}
                                                        className={`p-1.5 rounded-lg transition-all ${u.canPlay ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-surface-700 text-slate-400 hover:text-white'}`}
                                                        title={u.canPlay ? "Current Player" : "Take/Grant Player Rights"}
                                                    >
                                                        <Headphones className="w-3 h-3" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setControlPermission(room.roomId, u.userId, !u.canControl)}
                                                        className={`p-1.5 rounded-lg transition-all ${u.canControl ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-surface-700 text-slate-400 hover:text-white'}`}
                                                        title={u.canControl ? "Remove Control Rights" : "Grant Control Rights"}
                                                    >
                                                        <Gamepad2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{u.role}</p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
          </div>

          <div className="glass-effect p-8 rounded-[3rem] space-y-6">
             <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h4 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-slate-300">
                    <ExternalLink className="w-4 h-4" /> Studio Links
                </h4>
             </div>
             <div className="flex flex-col gap-4">
                <a 
                    href={room.currentTrack?.youtubeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl bg-surface-800 hover:bg-brand-primary/10 transition-all group font-bold text-xs uppercase tracking-widest"
                >
                    <span className="flex items-center gap-3">
                        <Disc className="w-5 h-5 text-red-500 group-hover:animate-spin" /> Open on YouTube
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                </a>
                <button 
                   onClick={handleCopyLink}
                   className="flex items-center justify-between p-4 rounded-2xl bg-surface-800 hover:bg-indigo-500/10 transition-all font-bold text-xs uppercase tracking-widest"
                >
                    <span className="flex items-center gap-3">
                        <Share2 className="w-5 h-5 text-indigo-400" /> Invite Friends
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
             </div>
          </div>
        </div>
      </main>
                </motion.div>
            )}
        </AnimatePresence>

      {/* Global Error Toast */}
      <AnimatePresence>
        {error && user && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-red-500/30 font-bold border border-white/20"
          >
            <div className="bg-white/20 p-2 rounded-xl">
               <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-sm">{error}</span>
            <button onClick={() => clearError()} className="ml-4 hover:opacity-50 transition-opacity">
               <Plus className="w-5 h-5 rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
