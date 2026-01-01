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
  const lastVideoId = useRef(videoId);

  // Handle Video Change (Imperative - MUCH better for background tabs/preventing autoplay blocks)
  useEffect(() => {
    if (playerRef.current && isPlayerReady && lastVideoId.current !== videoId) {
      lastVideoId.current = videoId;
      try {
        playerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds: 0,
        });
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

        // Sync playing state
        if (isPlaying) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }

        // Sync time if drift is > 2.5 seconds
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
  }, [isPlaying, currentTime, isPlayerReady]); // Removed videoId to prevent reload during sync

  // Handle Volume and Mute (Independent of playback)
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

  const handleReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    onReady(event.target);
    
    // Immediate sync on load
    if (isPlaying) event.target.playVideo();
    if (currentTime > 0) event.target.seekTo(currentTime, true);
    event.target.setVolume(volume);
    if (isMuted) event.target.mute();
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 0 is ENDED state in YT API
    if (event.data === 0 && onEnd) {
      onEnd();
    }
  };

  return (
    <div className="relative aspect-video w-full rounded-3xl overflow-hidden glass-card shadow-2xl bg-black pointer-events-none">
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
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
        className="absolute top-0 left-0 w-full h-full"
      />
      {/* Invisible overlay for extra safety */}
      <div className="absolute inset-0 z-10 bg-transparent" /> 
    </div>
  );
};
