'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
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

  // Don't check permission state on mount - it can be unreliable
  // Let getUserMedia handle the permission request naturally

  // Initialize waveform data for visualization
  useEffect(() => {
    if (isRecording && !isPaused) {
      const bars = 20;
      setWaveformData(new Array(bars).fill(0));
    }
  }, [isRecording, isPaused]);

  // Animate waveform during recording
  useEffect(() => {
    if (isRecording && !isPaused && analyserRef.current) {
      const animate = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        // Type assertion to fix TypeScript compatibility issue
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array);
        const newWaveform = Array.from(dataArrayRef.current.slice(0, 20)).map(value => value / 255);
        setWaveformData(newWaveform);
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animate();
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
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
    
    try {
      console.log('Requesting microphone permission...');
      console.log('Current URL:', window.location.href);
      console.log('Is secure context:', window.isSecureContext);
      
      // Try with simplest audio config first
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true  // Simplest possible - no constraints
        });
      } catch (simpleError: any) {
        console.log('Simple audio config failed, trying with constraints...', simpleError);
        // If simple fails, try with constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
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
      
      // Handle different error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setPermissionError('Mikrofon erişimi reddedildi. Tarayıcı ayarlarından mikrofon iznini kontrol edin ve "Sor" olarak ayarlayın.');
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

      mediaRecorder.onstop = () => {
        // Validate that we have audio chunks
        if (audioChunksRef.current.length === 0) {
          console.error('No audio chunks recorded');
          setPermissionError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
          setIsRecording(false);
          setRecordingTime(0);
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
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
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        
        // Validate blob
        if (!blob || blob.size === 0) {
          console.error('Invalid blob created:', { blob, size: blob?.size });
          setPermissionError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
          setIsRecording(false);
          setRecordingTime(0);
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }
          return;
        }
        
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        console.log('Audio blob created successfully:', {
          size: blob.size,
          type: blob.type,
          url: url.substring(0, 50) + '...'
        });
        
        // Accept the recording (set it in parent component state)
        // But don't send the comment yet - wait for comment submit button
        // Call onRecordingComplete to set the audio in parent state and close VoiceRecorder
        if (blob) {
          onRecordingComplete(blob);
        }
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.label);
          });
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setPermissionError('Kayıt sırasında bir hata oluştu.');
      };

      mediaRecorderRef.current = mediaRecorder;
      
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(100); // Collect data every 100ms
      
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
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
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
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
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
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

  const handleConfirm = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

