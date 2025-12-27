'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
  duration?: number; // Optional: If provided, use this instead of reading from audio element
  showVolumeControl?: boolean; // allow hiding slider (e.g., on post cards)
}

export default function AudioPlayer({ audioUrl, className = '', duration: providedDuration, showVolumeControl = true }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const volumeHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // If duration is provided as prop, use it and mark as loaded
  // This is the SINGLE SOURCE OF TRUTH for duration - never use audio.duration
  useEffect(() => {
    if (typeof providedDuration === 'number' && providedDuration >= 0) {
      setDuration(providedDuration);
      setIsLoading(false);
      console.log('AudioPlayer: Using provided duration:', providedDuration);
    }
  }, [providedDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      if (!audioUrl) {
        setError('Ses URL\'si bulunamadı.');
        setIsLoading(false);
      }
      return;
    }

    // Validate URL format (allow both http/https and blob URLs)
    let validatedUrl = audioUrl;
    try {
      // Check if it's a blob URL (blob:http://... or blob:https://...)
      if (audioUrl.startsWith('blob:')) {
        validatedUrl = audioUrl;
        console.log('AudioPlayer: Blob URL detected:', audioUrl);
      } else {
        const urlObj = new URL(audioUrl);
        validatedUrl = urlObj.href; // Ensure URL is properly formatted
        console.log('AudioPlayer: Validated URL:', {
          original: audioUrl,
          validated: validatedUrl,
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          pathname: urlObj.pathname
        });
      }
    } catch (e) {
      console.error('AudioPlayer: Invalid URL:', audioUrl, e);
      setError('Geçersiz ses URL\'si.');
      setIsLoading(false);
      return;
    }

    // Reset state when URL changes
    // If providedDuration exists, don't reset duration and mark as loaded immediately
    if (typeof providedDuration === 'number' && providedDuration >= 0) {
      setDuration(providedDuration);
      setIsLoading(false);
      console.log('AudioPlayer: Setting provided duration immediately:', providedDuration);
    } else {
      setIsLoading(true);
      setDuration(0);
    }
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);

    // Clear previous source and set new one
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    
    // Set the audio source after clearing
    setTimeout(() => {
      audio.src = validatedUrl;
      console.log('AudioPlayer: Setting audio source to:', validatedUrl);
      audio.load();
    }, 50);

    const updateTime = () => {
      // currentTime comes from audio element (correct)
      if (audio.currentTime !== undefined && isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    // DO NOT update duration from audio element if providedDuration is given
    // Duration comes from recordingTime state, not from audio.duration
    const updateDuration = () => {
      // Only update from audio element if no providedDuration was given
      if (typeof providedDuration !== 'number' && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setIsLoading(false);
        console.log('AudioPlayer: Audio loaded, duration from element:', audio.duration);
      } else {
        console.log('AudioPlayer: Using provided duration, ignoring audio.duration:', audio.duration);
      }
    };
    
    // More reliable handler for loadedmetadata
    // Only use if providedDuration is not available
    const handleLoadedMetadata = () => {
      // If providedDuration exists, ignore audio.duration completely
      if (typeof providedDuration === 'number') {
        console.log('AudioPlayer: Provided duration exists, ignoring audio.duration');
        return;
      }
      
      let duration = audio.duration;
      
      // Fix for Safari + Chrome: If duration is still 0, force a seek to trigger duration calculation
      if (duration === 0 || !isFinite(duration)) {
        console.log('AudioPlayer: Duration is 0 in handleLoadedMetadata, attempting forced seek fix');
        audio.currentTime = 0.01;
        const handleTimeUpdate = () => {
          duration = audio.duration;
          if (duration && isFinite(duration) && duration > 0) {
            setDuration(duration);
            setIsLoading(false);
            console.log('AudioPlayer: Duration fixed via seek in handleLoadedMetadata, duration:', duration);
            audio.currentTime = 0;
            audio.removeEventListener('timeupdate', handleTimeUpdate);
          }
        };
        audio.addEventListener('timeupdate', handleTimeUpdate, { once: true });
      } else if (duration && isFinite(duration) && duration > 0) {
        setDuration(duration);
        setIsLoading(false);
        console.log('AudioPlayer: Metadata loaded, duration:', duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handlePause = () => setIsPlaying(false);
    
    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      const error = audioElement.error;
      
      // Get network state names for better debugging
      const networkStateNames = [
        'EMPTY',
        'IDLE', 
        'LOADING',
        'NO_SOURCE',
        'NETWORK_ERROR'
      ];
      
      const readyStateNames = [
        'HAVE_NOTHING',
        'HAVE_METADATA',
        'HAVE_CURRENT_DATA',
        'HAVE_FUTURE_DATA',
        'HAVE_ENOUGH_DATA'
      ];
      
      // Log all available information for debugging
      const errorInfo: any = {
        url: audioUrl,
        networkState: `${audioElement.networkState} (${networkStateNames[audioElement.networkState] || 'UNKNOWN'})`,
        readyState: `${audioElement.readyState} (${readyStateNames[audioElement.readyState] || 'UNKNOWN'})`,
        src: audioElement.src,
        currentSrc: audioElement.currentSrc,
        paused: audioElement.paused,
        ended: audioElement.ended,
        errorExists: !!error,
      };
      
      if (error) {
        try {
          errorInfo.errorCode = error.code;
          errorInfo.errorMessage = error.message;
          // MediaError doesn't have a 'name' property in TypeScript
          // Try to stringify error object
          errorInfo.errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorInfo.errorStringifyError = 'Could not stringify error object';
        }
      } else {
        errorInfo.note = 'Error event fired but error object is null/undefined';
      }
      
      console.error('AudioPlayer: Error loading audio:', errorInfo);
      console.error('AudioPlayer: Full error details:', {
        error,
        audioElement: {
          networkState: audioElement.networkState,
          readyState: audioElement.readyState,
          src: audioElement.src,
          currentSrc: audioElement.currentSrc,
        }
      });
      
      // Determine user-friendly error message based on network state
      let userMessage = 'Ses dosyası yüklenemedi.';
      
      if (error && error.code !== undefined) {
        const errorCode = error.code;
        if (errorCode === 1) {
          userMessage = 'Ses dosyası bulunamadı (404). URL\'yi kontrol edin.';
        } else if (errorCode === 2) {
          userMessage = 'Ağ hatası. Lütfen internet bağlantınızı kontrol edin.';
        } else if (errorCode === 3) {
          userMessage = 'Ses dosyası bozuk veya desteklenmiyor.';
        } else if (errorCode === 4) {
          userMessage = 'Ses dosyası desteklenmeyen formatta.';
        }
      } else {
        // No error code, check network state
        const networkState = audioElement.networkState;
        if (networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          userMessage = 'Ses kaynağı bulunamadı. URL geçersiz olabilir.';
        } else if (networkState === HTMLMediaElement.NETWORK_EMPTY) {
          userMessage = 'Ses dosyası yüklenemedi. Lütfen tekrar deneyin.';
        } else if (networkState === HTMLMediaElement.NETWORK_IDLE) {
          userMessage = 'Ses dosyası yüklenemedi. Dosya erişilebilir değil.';
        }
      }
      
      setError(userMessage);
      setIsLoading(false);
      setIsPlaying(false);
    };
    
    const handleLoadStart = () => {
      console.log('AudioPlayer: Load started');
      setIsLoading(true);
    };
    
    const handleCanPlay = () => {
      console.log('AudioPlayer: Can play');
      setIsLoading(false);
    };
    
    const handleLoadedData = () => {
      console.log('AudioPlayer: Data loaded');
      setIsLoading(false);
    };
    
    const handleStalled = () => {
      console.warn('AudioPlayer: Stalled - network issue');
    };
    
    const handleSuspend = () => {
      console.warn('AudioPlayer: Suspended - loading paused');
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadedmetadata', updateDuration); // Keep both for compatibility
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('suspend', handleSuspend);

    // Try to load the audio (load() is synchronous, doesn't return a promise)
    try {
      audio.load();
    } catch (err) {
      console.error('AudioPlayer: Failed to load audio:', err);
      setError('Ses dosyası yüklenemedi.');
      setIsLoading(false);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('suspend', handleSuspend);
    };
  }, [audioUrl, providedDuration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.error('AudioPlayer: Play error:', err);
      setError('Ses çalınamadı. Lütfen tekrar deneyin.');
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(1.0);
    }
  };

  const handleVolumeEnter = () => {
    if (volumeHideTimeout.current) {
      clearTimeout(volumeHideTimeout.current);
      volumeHideTimeout.current = null;
    }
    setShowVolumeSlider(true);
  };

  const handleVolumeLeave = () => {
    if (volumeHideTimeout.current) {
      clearTimeout(volumeHideTimeout.current);
    }
    volumeHideTimeout.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 300);
  };

  const handleVolumeTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showVolumeSlider) {
      toggleMute();
    } else {
      setShowVolumeSlider(true);
    }
  };

  // Clear any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (volumeHideTimeout.current) {
        clearTimeout(volumeHideTimeout.current);
      }
    };
  }, []);

  // Show error state
  if (error) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-300 dark:border-red-700 ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              const audio = audioRef.current;
              if (audio) {
                audio.load();
              }
            }}
            className="text-xs text-red-600 dark:text-red-400 underline mt-1"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 p-3 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg border-2 border-black ${className}`}>
      <audio 
        key={audioUrl} // CRITICAL: Force remount when URL changes to ensure duration loads correctly
        ref={audioRef} 
        preload="metadata"
        onLoadedMetadata={(e) => {
          // If providedDuration exists, ignore audio.duration completely
          // Duration comes from recordingTime state, not from audio element
          if (typeof providedDuration === 'number') {
            console.log('AudioPlayer: Provided duration exists, ignoring audio.duration in onLoadedMetadata');
            return;
          }
          
          const audio = e.currentTarget;
          let duration = audio.duration;
          
          // Fix for Safari + Chrome: If duration is still 0, force a seek to trigger duration calculation
          if (duration === 0 || !isFinite(duration)) {
            console.log('AudioPlayer: Duration is 0, attempting forced seek fix');
            audio.currentTime = 0.01;
            const handleTimeUpdate = () => {
              duration = audio.duration;
              if (duration && isFinite(duration) && duration > 0) {
                setDuration(duration);
                setIsLoading(false);
                console.log('AudioPlayer: Duration fixed via seek, duration:', duration);
                audio.currentTime = 0;
                audio.removeEventListener('timeupdate', handleTimeUpdate);
              }
            };
            audio.addEventListener('timeupdate', handleTimeUpdate, { once: true });
          } else if (duration && isFinite(duration) && duration > 0) {
            setDuration(duration);
            setIsLoading(false);
            console.log('AudioPlayer: onLoadedMetadata handler, duration:', duration);
          }
        }}
      />
      
      
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlay();
          }}
          disabled={isLoading || !!error}
          className="p-2 bg-white dark:bg-[#151515] border-2 border-black rounded-full hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 inline-flex items-center justify-center"
          aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-black dark:text-white block" />
          ) : (
            <Play className="w-4 h-4 text-black dark:text-white block" />
          )}
        </button>

        <div className="flex-1">
          <div className="relative h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-red-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span className="font-semibold">{isLoading ? '...' : formatTime(duration)}</span>
          </div>
        </div>

        {showVolumeControl && !isMobile ? (
          <div 
            className="relative flex items-center border-0"
            onMouseEnter={handleVolumeEnter}
            onMouseLeave={handleVolumeLeave}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMute();
              }}
              className="p-1 rounded flex-shrink-0 border-0 outline-none focus:outline-none focus:ring-0 shadow-none !border-0"
              style={{ border: 'none', boxShadow: 'none' }}
              aria-label={volume > 0 ? 'Sesi kapat' : 'Sesi aç'}
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            {showVolumeSlider && (
              <div 
                className="absolute right-0 bottom-full mb-3 z-50 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleVolumeEnter}
                onMouseLeave={handleVolumeLeave}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-28 h-3 bg-gray-300 dark:bg-gray-700 rounded-full appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${volume * 100}%, rgb(209 213 219) ${volume * 100}%, rgb(209 213 219) 100%)`
                  }}
                  aria-label="Ses seviyesi"
                />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMute();
            }}
            className="p-1 rounded flex-shrink-0 border-0 outline-none focus:outline-none focus:ring-0 shadow-none !border-0 touch-manipulation"
            style={{ border: 'none', boxShadow: 'none', touchAction: 'manipulation' }}
            aria-label={volume > 0 ? 'Sesi kapat' : 'Sesi aç'}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

