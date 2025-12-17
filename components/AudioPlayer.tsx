'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
}

export default function AudioPlayer({ audioUrl, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

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

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
        console.log('AudioPlayer: Audio loaded, duration:', audio.duration);
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
          errorInfo.errorName = error.name;
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
    audio.addEventListener('loadedmetadata', updateDuration);
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
  }, [audioUrl]);

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
    <div className={`flex items-center gap-3 p-3 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg border-2 border-black ${className}`}>
      <audio ref={audioRef} preload="metadata" />
      
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          togglePlay();
        }}
        disabled={isLoading || !!error}
        className="p-2 bg-white dark:bg-[#151515] border-2 border-black rounded-full hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
        aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-black dark:text-white" />
        ) : (
          <Play className="w-4 h-4 text-black dark:text-white" />
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
          <span>{isLoading ? '...' : formatTime(duration)}</span>
        </div>
      </div>

      <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    </div>
  );
}

