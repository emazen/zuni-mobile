'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAudioDurationFromBlob } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration?: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // in seconds
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

export default function VoiceRecorder({ onRecordingComplete, onCancel, maxDuration = 120 }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  // CRITICAL: Use ref for duration to avoid stale closure in async callbacks
  const recordingTimeRef = useRef(0);

  // Don't check permission state on mount - it can be unreliable
  // Let getUserMedia handle the permission request naturally

  // Initialize waveform data for visualization
  useEffect(() => {
    if (isRecording && !isPaused) {
      const bars = 20;
      setWaveformData(new Array(bars).fill(0));
    }
  }, [isRecording, isPaused]);

  // Cleanup timer when component unmounts or recording stops
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Animate waveform during recording
  useEffect(() => {
    if (isRecording && !isPaused && analyserRef.current && dataArrayRef.current) {
      console.log('Starting waveform animation');
      const animate = () => {
        if (!analyserRef.current || !dataArrayRef.current || !isRecording || isPaused) {
          return;
        }
        
        try {
          // Type assertion to fix TypeScript compatibility issue with ArrayBufferLike vs ArrayBuffer
          analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
          const newWaveform = Array.from(dataArrayRef.current.slice(0, 20)).map(value => value / 255);
          setWaveformData(newWaveform);
          
          animationFrameRef.current = requestAnimationFrame(animate);
        } catch (error) {
          console.error('Error in waveform animation:', error);
        }
      };
      
      animate();
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      setWaveformData(new Array(20).fill(0));
    }
  }, [isRecording, isPaused]);

  const requestMicrophonePermission = async () => {
    setPermissionState('checking');
    setPermissionError(null);
    
    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setPermissionState('denied');
      setPermissionError('Mikrofon erişimi reddedildi. Tarayıcı ayarlarından mikrofon iznini kontrol edin ve "Sor" olarak ayarlayın.');
      return;
    }
    
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('denied');
      setPermissionError('Mikrofon erişimi reddedildi. Tarayıcı ayarlarından mikrofon iznini kontrol edin ve "Sor" olarak ayarlayın.');
      return;
    }
    
    // Check permission state for info only (don't block getUserMedia call)
    // Chrome may have cached denied state, but we should still try getUserMedia
    // as user interaction can trigger permission prompt
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Current microphone permission status:', permissionStatus.state);
        // Don't return early - still try getUserMedia even if status is 'denied'
        // User interaction might allow permission prompt to appear
      }
    } catch (permError) {
      // Permissions API might not be available or supported, continue anyway
      console.log('Permissions API not available, continuing with getUserMedia...');
    }
    
    try {
      console.log('Requesting microphone permission...');
      console.log('Current URL:', window.location.href);
      console.log('Is secure context:', window.isSecureContext);
      console.log('User agent:', navigator.userAgent);
      console.log('MediaDevices available:', !!navigator.mediaDevices);
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      
      // Check Chrome's global microphone setting via permissions API
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('Microphone permission state:', micPermission.state);
          console.log('Permission can be changed:', micPermission.state !== 'denied' || micPermission.onchange !== null);
        }
      } catch (permCheckError) {
        console.log('Could not check permission state:', permCheckError);
      }
      
      // Try with simplest audio config first
      // Note: Chrome may require explicit user gesture, so we ensure this is called from onClick
      let stream: MediaStream;
      try {
        console.log('Calling getUserMedia with audio: true...');
        console.log('Timestamp:', Date.now());
        console.log('Is user gesture context:', true); // We're in onClick handler
        
        // Force a fresh permission request by not reusing any cached state
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100
          }
        });
        console.log('getUserMedia succeeded with explicit audio constraints');
      } catch (simpleError: any) {
        console.log('First attempt failed:', simpleError.name, simpleError.message);
        console.log('Error details:', {
          name: simpleError.name,
          message: simpleError.message,
          constraint: simpleError.constraint,
          constraintName: simpleError.constraintName
        });
        
        // Try with simplest possible config
        try {
          console.log('Trying with audio: true (no constraints)...');
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true
          });
          console.log('getUserMedia succeeded with audio: true');
        } catch (secondError: any) {
          console.log('Second attempt also failed:', secondError.name, secondError.message);
          // Re-throw the error so it's caught by outer catch
          throw secondError;
        }
      }
      
      console.log('Microphone permission granted! Stream:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Verify we actually got an audio track
      if (stream.getAudioTracks().length === 0) {
        throw new Error('No audio tracks in stream');
      }
      
      // Permission granted - store stream and start recording
      streamRef.current = stream;
      setPermissionState('granted');
      setPermissionError(null);
      
      // Start recording immediately after permission granted
      await startRecordingWithStream(stream);
    } catch (error: any) {
      console.error('Error requesting microphone permission:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Handle different error types with more specific messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        // Check if we're on Chrome
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        if (isChrome) {
          setPermissionError('Mikrofon erişimi reddedildi. Chrome\'da mikrofon izni hiç sorulmadı. Lütfen şunları kontrol edin:\n1. Chrome ayarlarından (chrome://settings/content/microphone) mikrofonun açık olduğundan emin olun\n2. Bu site için mikrofon iznini "Sormak" olarak ayarlayın\n3. Chrome\'u yeniden başlatın ve tekrar deneyin');
        } else {
          setPermissionError('Mikrofon erişimi reddedildi. Tarayıcı ayarlarından mikrofon iznini kontrol edin ve "Sor" olarak ayarlayın.');
        }
      } else {
        setPermissionState('denied');
        setPermissionError('Mikrofon erişimi reddedildi. Tarayıcı ayarlarından mikrofon iznini kontrol edin ve "Sor" olarak ayarlayın.');
      }
    }
  };

  const startRecordingWithStream = async (stream: MediaStream) => {
    try {
      // Verify stream is active
      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('No audio tracks available');
      }

      // Check if tracks are enabled
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack.readyState === 'ended') {
        throw new Error('Audio track has ended');
      }

      console.log('Setting up audio context and recorder...');
      
      // Set up audio context for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // Determine best MIME type
      // Prefer webm as it's widely supported and works with Supabase
      // Explicitly avoid mp4/m4a as Supabase Storage doesn't support audio/mp4
      let mimeType = 'audio/webm';
      
      // List of preferred formats (in order of preference)
      const preferredFormats = [
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav',
        'audio/mpeg'
      ];
      
      // Find first supported format
      for (const format of preferredFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      
      // If none of our preferred formats are supported, check what IS supported
      // and avoid mp4/m4a explicitly
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const testFormats = [
          'audio/webm',
          'audio/ogg',
          'audio/wav',
          'audio/mpeg',
          'audio/mp3'
        ];
        
        for (const format of testFormats) {
          if (MediaRecorder.isTypeSupported(format) && !format.includes('mp4') && !format.includes('m4a')) {
            mimeType = format;
            break;
          }
        }
        
        // Last resort: let browser choose, but log a warning
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn('No preferred audio format supported. Browser will choose format.');
          mimeType = ''; // Browser will choose, might be mp4 on Safari
        }
      }

      console.log('Creating MediaRecorder with MIME type:', mimeType || 'browser-default');
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Validate that we have audio chunks
        if (audioChunksRef.current.length === 0) {
          console.error('No audio chunks recorded');
          setPermissionError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
          setIsRecording(false);
          recordingTimeRef.current = 0;
          setRecordingTime(0);
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
              audioContextRef.current.close();
            } catch (error) {
              console.log('AudioContext already closed:', error);
            }
            audioContextRef.current = null;
          }
          return;
        }
        
        // Calculate total size of chunks
        const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('Recording stopped:', {
          chunks: audioChunksRef.current.length,
          totalSize,
          mimeType: mediaRecorder.mimeType
        });
        
        // Create blob with proper MIME type
        const originalBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        
        // Re-encode blob with codecs to ensure duration metadata is included
        // This fixes the issue where MediaRecorder creates blobs without duration
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blobWithCodecs = mimeType.includes('webm') 
          ? new Blob([originalBlob], { type: 'audio/webm; codecs=opus' })
          : originalBlob;
        
        // Validate blob
        if (!blobWithCodecs || blobWithCodecs.size === 0) {
          console.error('Invalid blob created:', { blob: blobWithCodecs, size: blobWithCodecs?.size });
          setPermissionError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
          setIsRecording(false);
          recordingTimeRef.current = 0;
          setRecordingTime(0);
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
              audioContextRef.current.close();
            } catch (error) {
              console.log('AudioContext already closed:', error);
            }
            audioContextRef.current = null;
          }
          return;
        }
        
        setAudioBlob(blobWithCodecs);
        const url = URL.createObjectURL(blobWithCodecs);
        setAudioUrl(url);

        console.log('Audio blob created successfully:', {
          size: blobWithCodecs.size,
          type: blobWithCodecs.type,
          url: url.substring(0, 50) + '...'
        });
        
        // Accept the recording (set it in parent component state)
        // But don't send the comment yet - wait for comment submit button
        // Call onRecordingComplete to set the audio in parent state and close VoiceRecorder
        // CRITICAL: Extract duration from audio blob using AudioContext (authoritative source)
        // Timer is only for UI feedback, NOT for final duration
        if (blobWithCodecs) {
          try {
            const authoritativeDuration = await getAudioDurationFromBlob(blobWithCodecs);
            const finalDuration = Math.round(authoritativeDuration);
            
            console.log('AUTHORITATIVE DURATION from AudioContext:', {
              rawDuration: authoritativeDuration,
              roundedDuration: finalDuration,
              timerDuration: recordingTimeRef.current,
              stateDuration: recordingTime
            });
            
            onRecordingComplete(blobWithCodecs, finalDuration);
          } catch (error) {
            console.error('Error extracting duration from blob:', error);
            // Fallback to timer duration if AudioContext fails
            const fallbackDuration = recordingTimeRef.current;
            console.log('Using fallback timer duration:', fallbackDuration);
            onRecordingComplete(blobWithCodecs, fallbackDuration);
          }
        }
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.label);
          });
          streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try {
            audioContextRef.current.close();
          } catch (error) {
            console.log('AudioContext already closed:', error);
          }
          audioContextRef.current = null;
        }
        
        // Reset ref and state AFTER callback completes
        recordingTimeRef.current = 0;
        setRecordingTime(0);
        setIsRecording(false);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setPermissionError('Kayıt sırasında bir hata oluştu.');
      };

      mediaRecorderRef.current = mediaRecorder;
      
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(100); // Collect data every 100ms
      
      // Reset both ref and state
      recordingTimeRef.current = 0;
      setRecordingTime(0);
      setIsPaused(false);
      
      // Start timer BEFORE setting isRecording to true
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      console.log('Starting timer in startRecordingWithStream');
      timerRef.current = setInterval(() => {
        // Update ref first (for use in callbacks) - CRITICAL for avoiding stale closure
        recordingTimeRef.current += 1;
        // Update state for UI
        setRecordingTime(recordingTimeRef.current);
        
        console.log('Timer tick:', recordingTimeRef.current);
        
        if (recordingTimeRef.current >= maxDuration) {
          console.log('Max duration reached');
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 1000);
      
      // Now set recording state - this will trigger waveform animation
      setIsRecording(true);
      
      console.log('Recording started successfully!');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setPermissionError(`Kayıt başlatılamadı: ${error.message || 'Bilinmeyen hata'}. Lütfen tekrar deneyin.`);
      setPermissionState('denied');
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const startRecording = async () => {
    // Always request permission - browser will handle if already granted
    await requestMicrophonePermission();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // CRITICAL: stop() is async - onstop callback will fire later
      // DO NOT reset recordingTimeRef here - it will be used in onstop callback
      mediaRecorderRef.current.stop();
      
      // Stop timer but keep ref value for onstop callback
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Update UI state but keep ref for callback
      setIsPaused(false);
      // DO NOT set setIsRecording(false) here - let onstop handle it
      // DO NOT reset recordingTimeRef here - onstop needs it
      
      // Stop stream tracks (safe to do immediately)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      // Close audio context (safe to do immediately)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.log('AudioContext already closed or closing:', error);
        }
        audioContextRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        // Update ref first (for use in callbacks)
        recordingTimeRef.current += 1;
        // Update state for UI
        setRecordingTime(recordingTimeRef.current);
        
        if (recordingTimeRef.current >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    }
  };

  const handlePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDelete = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
    }
    if (onCancel) {
      onCancel();
    }
  };

  const handleConfirm = async () => {
    if (audioBlob) {
      try {
        // Extract authoritative duration from blob
        const authoritativeDuration = await getAudioDurationFromBlob(audioBlob);
        const finalDuration = Math.round(authoritativeDuration);
        console.log('handleConfirm - AUTHORITATIVE DURATION:', finalDuration);
        onRecordingComplete(audioBlob, finalDuration);
      } catch (error) {
        console.error('Error extracting duration in handleConfirm:', error);
        // Fallback to timer duration
        onRecordingComplete(audioBlob, recordingTimeRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  // If recording is complete, automatically accept it (no preview shown)
  // The recording is ready for posting but won't be sent until comment submit button is clicked
  // This component will be hidden/unmounted by the parent after onRecordingComplete is called
  if (audioBlob && audioUrl && !isRecording) {
    // Return null - parent will handle showing the accepted recording in the comment form
    return null;
  }

  // Show error only if permission was actually denied (not just prompt state)
  if (permissionState === 'denied' && permissionError) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {permissionError}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isRecording ? (
        <div className="space-y-3">
          {permissionState === 'prompt' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                Ses kaydı yapmak için mikrofon iznine ihtiyacımız var. "Ses Kaydı Başlat" butonuna tıkladığınızda tarayıcı izin isteyecektir.
              </p>
            </div>
          )}
          <button
            onClick={startRecording}
            disabled={permissionState === 'checking'}
            className="w-full py-4 bg-red-500 text-white font-bold border-2 border-black rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="w-5 h-5" />
            {permissionState === 'checking' ? 'İzin İsteniyor...' : 'Ses Kaydı Başlat'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Waveform Visualization */}
          <div className="flex items-center justify-center gap-1 h-16 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg border-2 border-black p-4">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className="bg-red-500 rounded-full transition-all duration-75"
                style={{
                  width: '4px',
                  height: `${Math.max(4, height * 40)}px`,
                  opacity: isPaused ? 0.3 : 1,
                }}
              />
            ))}
          </div>

          {/* Timer and Controls */}
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-black dark:text-white">
              {formatTime(recordingTime)} / {formatTime(maxDuration)}
              {/* Debug: {recordingTime} seconds, isRecording: {isRecording ? 'true' : 'false'} */}
            </div>
            <div className="flex items-center gap-2">
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="p-2 bg-green-500 text-white border-2 border-black rounded-full hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <Play className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="p-2 bg-yellow-500 text-white border-2 border-black rounded-full hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={stopRecording}
                className="p-2 bg-red-500 text-white border-2 border-black rounded-full hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

