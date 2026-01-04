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
  trackTitle?: string;
  trackThumbnail?: string;
}

export const YoutubePlayer = ({ 
  videoId, isPlaying, currentTime, volume, isMuted, onReady, onEnd, trackTitle, trackThumbnail 
}: YoutubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const lastVideoId = useRef(videoId);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Background Playback & Media Session Support ---
  useEffect(() => {
    if ('mediaSession' in navigator && trackTitle) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: 'Music Room',
        album: 'Shared Queue',
        artwork: [
          { src: trackThumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        playerRef.current?.playVideo();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        playerRef.current?.pauseVideo();
      });
      if (onEnd) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
           onEnd();
        });
      }
    }
  }, [trackTitle, trackThumbnail, videoId, onEnd]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Keep-alive: Silent audio loop to prevent browser throttling background JS
  useEffect(() => {
    // Create an invisible audio element playing silence
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    audio.loop = true;
    audioRef.current = audio;

    const tryPlaySilence = () => {
      if (isPlaying) {
        audio.play().catch(() => {
          // May fail due to autoplay block, but once user interacts (Tap to Start), it works
        });
      } else {
        audio.pause();
      }
    };

    tryPlaySilence();
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [isPlaying]);

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
          player.playVideo();
          // Also resume our silent keep-alive
          audioRef.current?.play().catch(() => {});
        } else {
          player.pauseVideo();
          audioRef.current?.pause();
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

  // Periodically check if we are supposed to be playing but are stuck
  useEffect(() => {
    if (!isPlaying || !isPlayerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      const state = playerRef.current.getPlayerState?.();
      if (isPlaying && state !== 1 && state !== 3) {
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
      audioRef.current?.play().catch(() => {});
      setIsBlocked(false);
    }
  };

  const togglePiP = async () => {
    const container = document.getElementById('player-wrapper');
    if (!container) return;

    try {
      // 1. Modern Document Picture-in-Picture (Chrome 116+)
      if ('documentPictureInPicture' in window) {
        const pip = (window as any).documentPictureInPicture;
        
        if (pip.window) {
          pip.window.close();
          return;
        }

        // Calculate size to match the current player aspect ratio
        const pipWindow = await pip.requestWindow({
          width: container.clientWidth,
          height: container.clientHeight,
        });

        // CRITICAL: Ensure the PiP window knows it belongs to our domain to avoid YouTube Error 153
        const base = document.createElement('base');
        base.href = window.location.origin;
        pipWindow.document.head.append(base);

        // Copy styles from the main window to PiP window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            const style = document.createElement('style');
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch (e) {
            const link = document.createElement('link');
            if (styleSheet.href) {
              link.rel = 'stylesheet';
              link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            }
          }
        });

        // Move the player to PiP window
        pipWindow.document.body.append(container);

        // Try to trigger play immediately using the gesture from the PiP button click
        setTimeout(() => {
          if (playerRef.current?.playVideo && isPlaying) {
            playerRef.current.playVideo();
            audioRef.current?.play().catch(() => {});
          }
        }, 500);

        // Handle the return home when PiP closes
        pipWindow.addEventListener("pagehide", () => {
          const destination = document.querySelector('.cinema-stage-inner') || document.body;
          destination.append(container);
          
          // Force a state refresh when moving back
          setTimeout(() => {
            if (playerRef.current?.seekTo) {
               const currentTime = playerRef.current.getCurrentTime();
               playerRef.current.seekTo(currentTime, true);
               if (isPlaying) playerRef.current.playVideo();
            }
          }, 100);
        });
        return;
      }

      // 2. Fallback: Standard Video PiP (Safari/Firefox)
      const video = container.querySelector('video');
      if (video && (video as any).requestPictureInPicture) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await (video as any).requestPictureInPicture();
        }
      } else {
        // Ultimate fallback for YouTube specifically
        alert("Để bật PiP trên trình duyệt này, vui lòng nhấn chuột phải 2 lần liên tiếp vào video và chọn 'Ảnh trong ảnh'.");
      }
    } catch (e) {
      console.warn('PiP transition failed:', e);
    }
  };

  const handleReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    onReady(event.target);
    
    if (isPlaying) {
        event.target.playVideo();
        audioRef.current?.play().catch(() => {});
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
    <div id="player-wrapper" className="relative aspect-video w-full rounded-2xl md:rounded-[2.5rem] overflow-hidden glass-card shadow-2xl bg-black">
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
            playsinline: 1,
            // Use host instead of full origin to be more flexible with PiP windows
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
        className="absolute top-0 left-0 w-full h-full"
      />

      {/* PiP Button */}
      <button 
        onClick={togglePiP}
        className="absolute top-6 right-6 z-20 p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-xl rounded-2xl text-white/50 hover:text-white transition-all border border-white/10 group shadow-2xl"
        title="Picture in Picture"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 11h-5v5h5v-5z" fill="currentColor" fillOpacity="0.4" />
          <path d="M21 15V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      
      {/* Mobile/Autoplay Block Overlay */}
      {isBlocked && isPlaying && (
        <div 
          onClick={handleManualPlay}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer group transition-all"
        >
          <div className="bg-white text-black px-10 py-5 rounded-3xl font-black text-sm tracking-widest uppercase flex items-center gap-4 shadow-[0_0_50px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-lg">
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
