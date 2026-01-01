'use client';

import YouTube, { YouTubeProps } from 'react-youtube';
import { useEffect, useRef, useState } from 'react';

interface YoutubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  isAdmin: boolean;
  onSync: (isPlaying: boolean, time: number) => void;
}

export const YoutubePlayer = ({ videoId, isPlaying, currentTime, isAdmin, onSync }: YoutubePlayerProps) => {
  const playerRef = useRef<any>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);

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

        // Sync time if drift is > 2 seconds
        if (typeof player.getCurrentTime === 'function') {
          const playerTime = player.getCurrentTime();
          // Adding a small buffer for background tabs
          if (typeof playerTime === 'number' && Math.abs(playerTime - currentTime) > 2.5) {
            player.seekTo(currentTime, true);
            // After seeking, ensure we keep playing if supposed to
            if (isPlaying) player.playVideo();
          }
        }
      } catch (e) {
        console.warn('YouTube Player sync warning:', e);
      }
    }
  }, [isPlaying, currentTime, videoId, isPlayerReady]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    
    // Immediate sync on load
    if (isPlaying) {
        event.target.playVideo();
    }
    if (currentTime > 1) {
        event.target.seekTo(currentTime, true);
    }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (!isAdmin) return;
    
    // 1: Playing, 2: Paused
    const state = event.data;
    const time = event.target.getCurrentTime();
    
    if (state === 1) onSync(true, time);
    if (state === 2) onSync(false, time);
  };

  return (
    <div className="relative aspect-video w-full rounded-3xl overflow-hidden glass-card shadow-2xl bg-black">
      <YouTube
        key={videoId} // Force re-mount on track change for better background reliability
        videoId={videoId}
        opts={{
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 1,
            controls: isAdmin ? 1 : 0,
            disablekb: isAdmin ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
        }}
        onReady={onReady}
        onStateChange={onStateChange}
        className="absolute top-0 left-0 w-full h-full"
      />
      {!isAdmin && (
        <div className="absolute inset-0 z-10 bg-transparent cursor-not-allowed" /> 
      )}
    </div>
  );
};
