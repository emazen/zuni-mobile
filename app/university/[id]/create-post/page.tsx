'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, User, LogOut, Menu, X, Building2, Moon, Sun, Image as ImageIcon, Mic } from 'lucide-react';
import CustomSpinner from '@/components/CustomSpinner';
import SplashScreen from '@/components/SplashScreen';
import UniversitySidebar from '@/components/UniversitySidebar';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import VoiceRecorder from '@/components/VoiceRecorder';
import AudioPlayer from '@/components/AudioPlayer';

interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
  type: 'public' | 'private';
}

interface CreatePostPageProps {
  params: Promise<{ id: string }>;
}

export default function CreatePostPage({ params }: CreatePostPageProps) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, effectiveTheme, toggleTheme } = useTheme();
  const [university, setUniversity] = useState<University | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUniversity, setFetchingUniversity] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [audioFile, setAudioFile] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);


  // Fetch university immediately when component mounts or params change
  useEffect(() => {
    if (resolvedParams.id) {
      fetchUniversity();
    }
  }, [resolvedParams.id]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  const fetchUniversity = async () => {
    try {
      setFetchingUniversity(true);
      const response = await fetch(`/api/universities/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setUniversity(data);
      } else {
        // University not found or error
        setUniversity(null);
      }
    } catch (error) {
      console.error('Error fetching university:', error);
      setUniversity(null);
    } finally {
      setFetchingUniversity(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Lütfen geçerli bir resim dosyası yükleyin.');
        return;
      }
      
      const selectedFile = file;
      setImageFile(selectedFile);
      console.log('Image file selected:', selectedFile.name, 'State will update...');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        console.log('Image preview set, imageFile state should be:', selectedFile);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeAudio = () => {
    setAudioFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioDuration(undefined);
  };

  const uploadAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      setUploadingAudio(true);
      
      // Validate blob
      if (!audioBlob || audioBlob.size === 0) {
        alert('Geçersiz ses kaydı. Lütfen tekrar deneyin.');
        return null;
      }
      
      // Check file size (max 10MB for audio)
      if (audioBlob.size > 10 * 1024 * 1024) {
        alert('Ses kaydı 10MB\'dan küçük olmalıdır.');
        return null;
      }
      
      // Determine file extension and MIME type
      const originalMimeType = audioBlob.type || 'audio/webm';
      let fileExt = 'webm';
      let uploadMimeType: string | undefined = 'audio/webm';
      
      if (originalMimeType.includes('webm')) {
        fileExt = 'webm';
        uploadMimeType = 'audio/webm';
      } else if (originalMimeType.includes('mp3') || originalMimeType.includes('mpeg')) {
        fileExt = 'mp3';
        uploadMimeType = 'audio/mpeg';
      } else if (originalMimeType.includes('mp4') || originalMimeType.includes('m4a')) {
        fileExt = 'm4a';
        uploadMimeType = 'video/mp4';
      } else {
        fileExt = 'webm';
        uploadMimeType = 'audio/webm';
      }
      
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `posts/audio/${fileName}`;

      console.log('Uploading audio:', {
        size: audioBlob.size,
        originalType: originalMimeType,
        uploadType: uploadMimeType,
        fileExt,
        filePath
      });

      // Upload strategies (try multiple approaches if first fails)
      let uploadError: any = null;
      let uploadSuccess = false;

      // Strategy 1: Upload with determined MIME type
      const { error: error1 } = await supabase.storage
        .from('uploads')
        .upload(filePath, audioBlob, {
          contentType: uploadMimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (!error1) {
        uploadSuccess = true;
      } else {
        uploadError = error1;
        console.log('Upload strategy 1 failed:', error1.message);
        
        // Strategy 2: For mp4, try without contentType
        if (originalMimeType.includes('mp4') || originalMimeType.includes('m4a')) {
          console.log('Trying upload without contentType...');
          const { error: error2 } = await supabase.storage
            .from('uploads')
            .upload(filePath, audioBlob, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (!error2) {
            uploadSuccess = true;
            uploadError = null;
          } else {
            uploadError = error2;
            console.log('Upload strategy 2 failed:', error2.message);
          }
        }
        
        // Strategy 3: Try as audio/mpeg
        if (!uploadSuccess && !originalMimeType.includes('mp4')) {
          console.log('Trying upload as audio/mpeg...');
          const { error: error3 } = await supabase.storage
            .from('uploads')
            .upload(filePath, audioBlob, {
              contentType: 'audio/mpeg',
              cacheControl: '3600',
              upsert: false
            });
          
          if (!error3) {
            uploadSuccess = true;
            uploadError = null;
          } else {
            uploadError = error3;
            console.log('Upload strategy 3 failed:', error3.message);
          }
        }
      }

      if (!uploadSuccess && uploadError) {
        console.error('All upload strategies failed:', uploadError);
        throw new Error(
          uploadError.message || 
          `Yükleme başarısız oldu. Hata kodu: ${uploadError.statusCode || uploadError.error || 'Bilinmeyen'}`
        );
      }

      // Get public URL
      const { data } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error('Dosya yüklendi ancak URL alınamadı.');
      }

      console.log('Audio uploaded successfully:', data.publicUrl);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading audio to Supabase:', error);
      const errorMessage = error?.message || 'Bilinmeyen hata';
      alert(`Ses kaydı yüklenirken bir hata oluştu: ${errorMessage}. Lütfen tekrar deneyin.`);
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleRecordingComplete = (audioBlob: Blob, duration?: number) => {
    setAudioFile(audioBlob);
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    setAudioDuration(duration);
    setShowVoiceRecorder(false);
  };

  const handleCancelRecording = () => {
    setShowVoiceRecorder(false);
    setAudioFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioDuration(undefined);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Resim yüklenirken bir hata oluştu.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least title and one of content/image/audio exists
    if (!title.trim()) {
      alert('Başlık gereklidir');
      return;
    }
    
    if (!content.trim() && !imageFile && !audioFile) {
      alert('Lütfen içerik, resim veya ses kaydı ekleyin');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          setLoading(false);
          return;
        }
      }

      let audioUrl = null;
      if (audioFile) {
        audioUrl = await uploadAudio(audioFile);
        if (!audioUrl) {
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/universities/${resolvedParams.id}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || '',
          image: imageUrl,
          audio: audioUrl,
        }),
      });

      if (response.ok) {
        const post = await response.json();
        // Redirect to main page with the new post and university ID
        // This ensures "Geri Dön" takes user back to the university board
        window.location.href = `/?post=${post.id}&university=${resolvedParams.id}`;
      } else {
        const error = await response.json();
        alert(error.error || 'Gönderi oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    // Navigate directly to the university board
    // Use window.location.href to ensure a clean navigation that properly initializes state
    // The main page will detect the university parameter and show the board immediately
    if (university?.id) {
      // Set a flag in sessionStorage to indicate we're navigating from create-post
      // This helps the main page show the university board immediately
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('navigatingToUniversity', university.id);
      }
      window.location.href = `/?university=${university.id}`;
    }
  };

  const handleUniversityClick = (universityId: string) => {
    setIsMobileMenuOpen(false);
    router.push(`/university/${universityId}`);
  };


  // Show splash screen while fetching university data
  if (fetchingUniversity) {
    return <SplashScreen />;
  }

  if (!university) {
    return (
      <div className="h-screen bg-gray-100 overflow-hidden" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="flex h-full">
          <UniversitySidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-black text-black mb-3" style={{color: 'var(--text-primary)'}}>Üniversite Bulunamadı</h1>
              <p className="text-lg font-semibold text-black" style={{color: 'var(--text-secondary)'}}>Aradığınız üniversite mevcut değil.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-gray-100 overflow-hidden" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="flex h-full">
          <UniversitySidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-black text-black mb-3" style={{color: 'var(--text-primary)'}}>Giriş Gerekli</h1>
              <p className="text-lg font-semibold text-black mb-6" style={{color: 'var(--text-secondary)'}}>Gönderi oluşturmak için giriş yapmalısınız.</p>
              <Link
                href="/auth/signin"
                className="brutal-button-primary inline-flex items-center gap-2"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 overflow-hidden" style={{backgroundColor: 'var(--bg-primary)'}}>
      {/* Header */}
      <header className={`brutal-header ${isMobile ? 'fixed top-0 left-0 right-0 z-50' : 'relative'}`}>
        <div className="w-full px-2 sm:px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Logo />
              </Link>
            </div>
            
            {/* User Info and Menu / Sign In Button */}
            <div className="flex items-center gap-6">
              {session ? (
                <>
                  {/* Mobile Menu Buttons */}
                  <div className="flex items-center gap-3">
                    {/* Universities Menu Button (Mobile Only) */}
                    {isMobile && (
                      <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-3 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow"
                        style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
                        aria-label="Universities menu"
                      >
                        <Building2 className="h-5 w-5 text-black" style={{color: 'var(--text-primary)'}} />
                      </button>
                    )}
                    
                    {/* Hamburger Menu */}
                    <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-3 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow transition-all duration-150"
                      style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
                      aria-label="User menu"
                    >
                      {isMenuOpen ? (
                        <X className="h-5 w-5 text-black" style={{color: 'var(--text-primary)'}} />
                      ) : (
                        <Menu className="h-5 w-5 text-black" style={{color: 'var(--text-primary)'}} />
                      )}
                    </button>
                    
                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black brutal-shadow z-50 user-menu-dropdown" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
                        <div className="px-4 py-3 border-b-2 border-black" style={{borderColor: 'var(--border-color)'}}>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center border-2 border-black" style={{borderColor: 'var(--border-color)'}}>
                              <User className="h-4 w-4 text-black" />
                            </div>
                            <span className="text-sm font-semibold text-black" style={{color: 'var(--text-primary)'}}>{session?.user?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full px-4 py-3 border-b-2 border-black" style={{borderColor: 'var(--border-color)'}}>
                          <span className="text-sm font-semibold text-black" style={{color: 'var(--text-primary)'}}>
                            Karanlık Mod
                          </span>
                          <ThemeToggle />
                        </div>
                        <button
                          onClick={() => {
                            const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/'
                            signOut({ callbackUrl })
                            setIsMenuOpen(false)
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm font-semibold text-black"
                          style={{color: 'var(--text-primary)'}}
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Çıkış Yap
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                </>
              ) : (
                /* Sign In Button and Mobile Menu for non-logged-in users */
                <div className="flex items-center gap-2">
                  {/* Universities Menu Button (Mobile Only) */}
                  {isMobile && (
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="p-3 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow"
                      aria-label="Universities menu"
                    >
                      <Building2 className="h-5 w-5 text-black" />
                    </button>
                  )}
                  
                  <Link
                    href="/auth/signin"
                    className="p-3 border-2 border-black bg-yellow-300 brutal-shadow-sm hover:brutal-shadow inline-flex items-center gap-2 text-sm font-semibold text-black"
                  >
                    Giriş Yap
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Overlay for user menu */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </header>

      {/* Sidebar and Main Content */}
      <div className={`flex ${isMobile ? 'absolute inset-0 top-16' : 'h-[calc(100vh-64px)]'} overscroll-none`}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <UniversitySidebar />
        )}
        
        <div className={`flex-1 ${isMobile ? 'overflow-y-auto overscroll-none h-full' : 'overflow-y-auto overscroll-none h-[calc(100vh-64px)]'}`} style={{backgroundColor: 'var(--bg-primary)'}}>
          {/* Mobile Universities Full Page - No Sliding */}
          {isMobile && isMobileMenuOpen ? (
            <div className="h-full bg-gray-100 flex flex-col" style={{backgroundColor: 'var(--bg-primary)'}}>
              {/* Mobile Universities Header */}
              <div className="bg-white border-b-4 border-black px-4 py-4 mobile-menu-header" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-black text-black" style={{color: 'var(--text-primary)'}}>Üniversiteler</h1>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-white border-2 border-black brutal-shadow-sm hover:brutal-shadow"
                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
                  >
                    <X className="h-5 w-5 text-black" style={{color: 'var(--text-primary)'}} />
                  </button>
                </div>
              </div>
              
              {/* Mobile Universities Content - Static */}
              <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-20">
                <UniversitySidebar onUniversityClick={handleUniversityClick} isMobile={true} />
              </div>
            </div>
          ) : (
            <div className={`${isMobile ? 'h-full' : 'h-full'} overflow-y-auto overscroll-none bg-gray-50 dark:bg-[#121212]`} style={{backgroundColor: 'var(--bg-primary)'}}>
              <div className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-0 sm:py-8 flex flex-col ${isMobile ? 'h-full' : 'min-h-full'}`}>
                <div className="flex-1">
                {/* Back Button & Title */}
                <div className="mb-6 flex items-center justify-between">
                  <button 
                    onClick={handleGoBack}
                    className="group flex items-center gap-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    <div className="p-2 rounded-full bg-white dark:bg-[#1a1a1a] border-2 border-black group-hover:-translate-x-1 transition-transform duration-200" style={{borderColor: 'var(--border-color)'}}>
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </button>
                  
                  <div className="px-3 py-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-full border border-gray-200 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-500 tracking-wider">
                      {university.name.toLocaleUpperCase('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-[#151515] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden mb-0" style={{borderColor: 'var(--border-color)'}}>
                  
                  {/* Header */}
                  <div className="px-4 sm:px-8 py-4 sm:py-6 border-b-2 border-black bg-gray-50 dark:bg-[#1a1a1a]" style={{borderColor: 'var(--border-color)'}}>
                    <h1 className="font-display font-bold text-xl sm:text-3xl text-black dark:text-white mb-1">Yeni Gönderi</h1>
                    <p className="font-sans text-gray-500 text-xs sm:text-sm">Düşüncelerini, sorularını veya fikirlerini paylaş.</p>
              </div>

                  <div className="p-4 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-xs sm:text-sm font-bold text-black dark:text-white mb-2 uppercase tracking-wide">
                        Başlık
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                          placeholder="Bir başlık yaz..."
                          className="w-full px-4 py-3 bg-white dark:bg-[#121212] border-2 border-black rounded-lg font-sans text-base sm:text-lg focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 placeholder:text-gray-400"
                          style={{borderColor: 'var(--border-color)'}}
                        maxLength={200}
                        required
                          autoFocus
                      />
                        <div className="flex justify-end mt-1.5">
                          <span className={`text-xs font-bold ${title.length > 180 ? 'text-red-500' : 'text-gray-400'}`}>
                            {title.length}/200
                          </span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="content" className="block text-xs sm:text-sm font-bold text-black dark:text-white mb-2 uppercase tracking-wide">
                        İçerik
                      </label>
                      <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                          placeholder="Nelerden bahsetmek istersin?"
                        rows={10}
                          className="w-full px-4 py-3 bg-white dark:bg-[#121212] border-2 border-black rounded-lg font-sans text-sm sm:text-base leading-relaxed resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 placeholder:text-gray-400"
                          style={{borderColor: 'var(--border-color)'}}
                        maxLength={5000}
                      />
                        <div className="flex justify-between mt-1.5">
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              id="image-upload"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('image-upload')?.click()}
                              className="text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <ImageIcon className="w-4 h-4" />
                              {imageFile ? 'Resim Değiştir' : 'Resim Ekle'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                              className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                                showVoiceRecorder || audioFile
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-500 hover:text-black dark:hover:text-white'
                              }`}
                            >
                              <Mic className="w-4 h-4" />
                              {audioFile ? 'Ses Kaydı Değiştir' : 'Ses Kaydı Ekle'}
                            </button>
                          </div>
                          <span className={`text-xs font-bold ${content.length > 4800 ? 'text-red-500' : 'text-gray-400'}`}>
                            {content.length}/5000
                          </span>
                        </div>

                        {showVoiceRecorder && !audioFile && (
                          <div className="mt-2">
                            <VoiceRecorder
                              onRecordingComplete={handleRecordingComplete}
                              onCancel={handleCancelRecording}
                              maxDuration={120}
                            />
                          </div>
                        )}

                        {audioUrl && audioFile && (
                          <div className="mt-4">
                            <AudioPlayer 
                              key={`${audioUrl}-${audioDuration}`}
                              audioUrl={audioUrl} 
                              duration={audioDuration} 
                            />
                            <button
                              type="button"
                              onClick={removeAudio}
                              className="mt-2 text-xs text-red-500 hover:text-red-600"
                            >
                              Ses Kaydını Sil
                            </button>
                          </div>
                        )}

                        {imagePreview && (
                          <div className="mt-4 relative inline-block">
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="max-h-64 rounded-lg border-2 border-black"
                              style={{borderColor: 'var(--border-color)'}}
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full border-2 border-white hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                    </div>

                      <div className="flex flex-row items-center justify-between sm:justify-end pt-4 gap-3 sm:gap-4 mb-0">
                        <button
                          type="button"
                          onClick={handleGoBack}
                          className="px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-sm sm:text-base text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                      >
                        İptal
                        </button>
                      
                      <button
                        type="submit"
                        disabled={loading || !title.trim() || (!content.trim() && imageFile === null && audioFile === null)}
                          className="group relative px-6 sm:px-8 py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-sm sm:text-base rounded-lg border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex-1 sm:flex-none"
                          style={{borderColor: 'var(--border-color)'}}
                          title={!title.trim() ? 'Başlık gereklidir' : (!content.trim() && imageFile === null && audioFile === null) ? 'İçerik, resim veya ses kaydı gereklidir' : ''}
                      >
                          <div className="absolute inset-0 w-full h-full bg-pink-500 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out" />
                          <div className="relative flex items-center justify-center gap-2 group-hover:text-white">
                        {loading ? (
                          <CustomSpinner size="sm" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                            <span>{loading ? 'Paylaşılıyor...' : 'Paylaş'}</span>
                          </div>
                      </button>
                    </div>
                  </form>
                  </div>
                </div>
                </div>
                
                {/* Footer */}
                <footer className="w-full pt-0 pb-3 z-20 mt-8 sm:pb-0 sm:-mb-4 sm:relative sm:z-auto">
                  <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="flex flex-wrap justify-center items-center gap-4 mb-1 sm:gap-6 sm:mb-0">
                      <a href="#" className="text-[10px] font-semibold hover:underline" style={{color: 'var(--text-secondary)'}}>
                        Hakkında
                      </a>
                      <a href="#" className="text-[10px] font-semibold hover:underline" style={{color: 'var(--text-secondary)'}}>
                        Hizmet Şartları
                      </a>
                      <a href="#" className="text-[10px] font-semibold hover:underline" style={{color: 'var(--text-secondary)'}}>
                        Gizlilik Politikası
                      </a>
                    </div>
                    <p className="text-[10px] font-medium" style={{color: 'var(--text-secondary)'}}>
                      © 2025 zuni.social. Tüm hakları saklıdır.
                    </p>
                  </div>
                </footer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
