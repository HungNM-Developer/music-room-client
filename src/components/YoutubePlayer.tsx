'use client';

import YouTube, { YouTubeProps } from 'react-youtube';
import { useEffect, useRef, useState } from 'react';

interface YoutubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  volume: number; // 0 to 100
  isMuted: boolean;
  onReady: (player: any) => void;
  onEnd?: () => void;
}

export const YoutubePlayer = ({ videoId, isPlaying, currentTime, volume, isMuted, onReady, onEnd }: YoutubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const lastVideoId = useRef(videoId);

  // Handle Video Change
  useEffect(() => {
    if (playerRef.current && isPlayerReady && lastVideoId.current !== videoId) {
      lastVideoId.current = videoId;
      try {
        playerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds: 0,
        });
        // Reset block state on new video load
        setIsBlocked(false);
      } catch (e) {
        console.warn('Background load fallback:', e);
      }
    }
  }, [videoId, isPlayerReady]);

  // Handle Play/Pause and Seek
  useEffect(() => {
    if (playerRef.current && isPlayerReady) {
      const player = playerRef.current;
      try {
        if (typeof player.playVideo !== 'function') return;

        if (isPlaying) {
          const playPromise = player.playVideo();
          // Some versions of YT API return a promise that we can check
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => setIsBlocked(true));
          }
        } else {
          player.pauseVideo();
        }

        if (typeof player.getCurrentTime === 'function') {
          const playerTime = player.getCurrentTime();
          if (typeof playerTime === 'number' && Math.abs(playerTime - currentTime) > 2.5) {
            player.seekTo(currentTime, true);
            if (isPlaying) player.playVideo();
          }
        }
      } catch (e) {
        console.warn('YouTube Player playback sync warning:', e);
      }
    }
  }, [isPlaying, currentTime, isPlayerReady]);

  // Periodically check if we are supposed to be playing but are stuck (detecting mobile autoplay block)
  useEffect(() => {
    if (!isPlaying || !isPlayerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      const state = playerRef.current.getPlayerState?.();
      // States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
      if (isPlaying && state !== 1 && state !== 3) {
        // Stuck in non-playing state despite isPlaying being true
        setIsBlocked(true);
      } else if (state === 1) {
        setIsBlocked(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, isPlayerReady]);

  // Handle Volume and Mute
  useEffect(() => {
    if (playerRef.current && isPlayerReady) {
      const player = playerRef.current;
      try {
        if (typeof player.setVolume === 'function') {
          player.setVolume(volume);
        }
        if (typeof player.mute === 'function') {
          if (isMuted) player.mute(); else player.unMute();
        }
      } catch (e) {
        console.warn('YouTube Player volume sync warning:', e);
      }
    }
  }, [volume, isMuted, isPlayerReady]);

  const handleManualPlay = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
      setIsBlocked(false);
    }
  };

  const handleReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    onReady(event.target);
    
    if (isPlaying) {
        const result = event.target.playVideo();
        // Fallback for mobile: if first play fails, it usually remains in state 2 or 5
    }
    if (currentTime > 0) event.target.seekTo(currentTime, true);
    event.target.setVolume(volume);
    if (isMuted) event.target.mute();
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 0 && onEnd) {
      onEnd();
    }
    if (event.data === 1) {
      setIsBlocked(false);
    }
  };

  return (
    <div className="relative aspect-video w-full rounded-3xl overflow-hidden glass-card shadow-2xl bg-black">
      <YouTube
        videoId={videoId}
        opts={{
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1, // CRITICAL for mobile background/inline playback
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
        className="absolute top-0 left-0 w-full h-full"
      />
      
      {/* Mobile/Autoplay Block Overlay */}
      {isBlocked && isPlaying && (
        <div 
          onClick={handleManualPlay}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer group transition-all"
        >
          <div className="bg-white text-black px-8 py-4 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center gap-3 shadow-2xl group-hover:scale-105 transition-transform animate-pulse">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
              <span className="translate-x-0.5">▶</span>
            </div>
            Tap to Start Listening
          </div>
        </div>
      )}

      {/* Protection overlay: Blocks all direct interaction with the YouTube iframe */}
      {!isBlocked && (
        <div className="absolute inset-0 z-10 bg-transparent cursor-default" />
      )}
    </div>
  );
};
