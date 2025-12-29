'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Trash2, Send, Clock, ChevronDown, Image as ImageIcon, X, MoreVertical, Mic } from 'lucide-react';
import CustomSpinner from './CustomSpinner';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import { getAudioDurationFromUrl } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: {
    gender: string;
    customColor?: string | null;
  };
  createdAt: string;
  image?: string | null;
  audio?: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: {
    gender: string;
    customColor?: string | null;
  };
  university: {
    id: string;
    name: string;
    shortName: string;
  };
  createdAt: string;
  _count: {
    comments: number;
  };
  image?: string | null;
  audio?: string | null;
}

interface PostDetailViewProps {
  postId: string;
  onGoBack: (universityId?: string) => void;
  onCommentAdded?: () => void;
  onPostDeleted?: () => void;
  onUniversityClick?: (universityId: string) => void;
}

export default function PostDetailView({ postId, onGoBack, onCommentAdded, onPostDeleted, onUniversityClick }: PostDetailViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false);
  const [commentAudio, setCommentAudio] = useState<Blob | null>(null);
  const [commentAudioUrl, setCommentAudioUrl] = useState<string | null>(null);
  const [commentAudioDuration, setCommentAudioDuration] = useState<number | undefined>(undefined);
  const [uploadingCommentAudio, setUploadingCommentAudio] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [enlargedImageTouchStart, setEnlargedImageTouchStart] = useState<{ x: number; y: number; touchCount: number } | null>(null);
  const [commentDurations, setCommentDurations] = useState<Map<string, number>>(new Map());
  const commentDurationsRef = useRef<Map<string, number>>(new Map());
  const [postAudioDuration, setPostAudioDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  // Extract durations for posted comments with audio
  useEffect(() => {
    if (!comments) return;

    const extractDurations = async () => {
      // Get current durations from ref to avoid re-extracting
      const currentDurations = commentDurationsRef.current;
      const durations = new Map<string, number>();
      const promises: Promise<void>[] = [];

      comments.forEach((comment) => {
        if (comment.audio && !currentDurations.has(comment.audio)) {
          // Extract duration for this audio URL
          promises.push(
            getAudioDurationFromUrl(comment.audio)
              .then((duration) => {
                durations.set(comment.audio!, Math.round(duration));
              })
              .catch((error) => {
                console.error(`Error extracting duration for comment ${comment.id}:`, error);
              })
          );
        }
      });

      await Promise.all(promises);

      if (durations.size > 0) {
        setCommentDurations((prev) => {
          const updated = new Map(prev);
          durations.forEach((duration, url) => {
            updated.set(url, duration);
            commentDurationsRef.current.set(url, duration);
          });
          return updated;
        });
      }
    };

    extractDurations();
  }, [comments]);

  // Extract duration for post audio
  useEffect(() => {
    if (!post?.audio) return;

    const extractPostAudioDuration = async () => {
      try {
        const duration = await getAudioDurationFromUrl(post.audio!);
        setPostAudioDuration(Math.round(duration));
      } catch (error) {
        console.error('Error extracting post audio duration:', error);
      }
    };

    extractPostAudioDuration();
  }, [post?.audio]);

  const fetchPost = async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      // Fetch post meta FIRST (fast), without comments
      const response = await fetch(`/api/posts/${postId}?includeComments=false`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }

    // Fetch comments AFTER post is visible
    setCommentsLoading(true);
    try {
      const commentsResponse = await fetch(`/api/posts/${postId}/comments`);
      if (commentsResponse.ok) {
        const commentData = await commentsResponse.json();
        setComments(commentData);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
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
      
      setCommentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCommentImage = () => {
    setCommentImage(null);
    setCommentImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingCommentImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `comments/${fileName}`;

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
      setUploadingCommentImage(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      setUploadingCommentAudio(true);
      
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
      // Supabase Storage bucket allows: audio/mpeg, audio/mp3, audio/webm, video/mp4
      // MediaRecorder typically produces: audio/webm or audio/mp4 (Safari)
      const originalMimeType = audioBlob.type || 'audio/webm';
      let fileExt = 'webm';
      let uploadMimeType: string | undefined = 'audio/webm'; // Default to webm since it's now allowed
      
      // Determine file extension and MIME type based on original type
      if (originalMimeType.includes('webm')) {
        fileExt = 'webm';
        uploadMimeType = 'audio/webm'; // Use webm since it's allowed
      } else if (originalMimeType.includes('mp3') || originalMimeType.includes('mpeg')) {
        fileExt = 'mp3';
        uploadMimeType = 'audio/mpeg';
      } else if (originalMimeType.includes('mp4') || originalMimeType.includes('m4a')) {
        // audio/mp4 is NOT supported, try video/mp4 first (which IS supported)
        fileExt = 'm4a';
        uploadMimeType = 'video/mp4'; // Try video/mp4 first since it's in allowed list
      } else {
        fileExt = 'webm';
        uploadMimeType = 'audio/webm';
      }
      
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `comments/audio/${fileName}`;

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
        
        // Strategy 2: For mp4, try without contentType (let Supabase infer)
        if (originalMimeType.includes('mp4') || originalMimeType.includes('m4a')) {
          console.log('Trying upload without contentType...');
          const { error: error2 } = await supabase.storage
            .from('uploads')
            .upload(filePath, audioBlob, {
              cacheControl: '3600',
              upsert: false
              // No contentType - let Supabase infer
            });
          
          if (!error2) {
            uploadSuccess = true;
            uploadError = null;
          } else {
            uploadError = error2;
            console.log('Upload strategy 2 failed:', error2.message);
          }
        }
        
        // Strategy 3: Try as audio/mpeg (most compatible)
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
        // Log detailed error information
        console.error('All upload strategies failed:', {
          error: uploadError,
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          errorCode: uploadError.error,
          blobSize: audioBlob.size,
          blobType: audioBlob.type,
          attemptedMimeType: uploadMimeType
        });
        
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
      setUploadingCommentAudio(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() && !commentAudio && !commentImage) return;

    setSubmittingComment(true);
    try {
      let imageUrl = null;
      if (commentImage) {
        imageUrl = await uploadImage(commentImage);
        if (!imageUrl) {
          setSubmittingComment(false);
          return;
        }
      }

      let audioUrl = null;
      if (commentAudio) {
        audioUrl = await uploadAudio(commentAudio);
        if (!audioUrl) {
          setSubmittingComment(false);
          return;
        }
      }

      // Get trimmed content (can be empty if audio or image is present)
      let finalContent = commentContent.trim();
      
      // Validate that at least one form of content exists
      if (!finalContent && !audioUrl && !imageUrl) {
        alert('Lütfen bir mesaj, resim veya ses kaydı ekleyin.');
        setSubmittingComment(false);
        return;
      }

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: finalContent,
          image: imageUrl,
          audio: audioUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Yorum gönderilemedi';
        alert(errorMessage);
        console.error('Error submitting comment:', errorData);
        setSubmittingComment(false);
        return;
      }

        const newComment = await response.json();
        
        // If new comment has audio and we have the duration, add it to durations map
        if (newComment.audio && commentAudioDuration !== undefined) {
          setCommentDurations((prev) => {
            const updated = new Map(prev);
            updated.set(newComment.audio, commentAudioDuration);
            commentDurationsRef.current.set(newComment.audio, commentAudioDuration);
            return updated;
          });
        }
        
        setCommentContent('');
        removeCommentImage();
      setCommentAudio(null);
      setCommentAudioUrl(null);
      setCommentAudioDuration(undefined);
      setShowVoiceRecorder(false);
        
        setComments(prev => [...prev, newComment]);
        setPost(prevPost =>
          prevPost
            ? {
                ...prevPost,
                _count: {
                  ...prevPost._count,
                  comments: (prevPost._count?.comments || 0) + 1,
                },
              }
            : prevPost
        );
        
        onCommentAdded?.();
        
        setTimeout(() => {
          const commentsSection = document.querySelector('[data-comments-section]');
          if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 100);
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRecordingComplete = (audioBlob: Blob, duration?: number) => {
    setCommentAudio(audioBlob);
    const url = URL.createObjectURL(audioBlob);
    setCommentAudioUrl(url);
    setCommentAudioDuration(duration);
    setShowVoiceRecorder(false);
  };

  const handleCancelRecording = () => {
    setShowVoiceRecorder(false);
    setCommentAudio(null);
    if (commentAudioUrl) {
      URL.revokeObjectURL(commentAudioUrl);
      setCommentAudioUrl(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!postId || deletingCommentId) return;
    setDeletingCommentId(commentId);
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      setComments(prev =>
        prev.map((comment) => (comment.id === commentId ? { ...comment, content: 'silinmiş' } : comment))
      );
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingPost || !post) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    setDeletingPost(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (response.ok) {
        onPostDeleted?.();
        onGoBack(undefined);
      } else {
        setDeletingPost(false);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setDeletingPost(false);
    }
  };

  const getGenderColor = (gender: string, customColor?: string | null) => {
    switch (gender) {
      case 'male': return '#3b82f6';
      case 'female': return '#ec4899';
      case 'custom': return customColor || '#9ca3af';
      default: return '#9ca3af';
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return `şimdi`
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}d önce`
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours}s önce`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) {
      return `${diffInDays}g önce`
    }
    
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `${diffInMonths}ay önce`
    }
    
    const diffInYears = Math.floor(diffInMonths / 12)
    return `${diffInYears}yıl önce`
  };

  const isAuthor = session?.user?.id === post?.authorId;
  const commentCount = post?._count?.comments ?? comments.length;

  return (
    <div className="flex-1 min-h-full bg-gray-50 dark:bg-[#121212]" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-0 sm:py-8 flex flex-col min-h-[calc(100vh-56px)] sm:min-h-[calc(100dvh-56px)]">
        <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <CustomSpinner size="lg" />
          </div>
        ) : !session ? (
            <div className="text-center py-12 rounded-xl border-2 border-black bg-white dark:bg-[#151515] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{borderColor: 'var(--border-color)'}}>
              <MessageSquare className="h-12 w-12 mx-auto text-black dark:text-white mb-4" />
              <h2 className="text-2xl font-display font-bold text-black dark:text-white mb-2">Giriş Yapın</h2>
              <p className="text-base font-sans text-gray-600 dark:text-gray-300 mb-6">Bu gönderiyi görmek için giriş yapmanız gerekiyor.</p>
            <div className="flex gap-4 justify-center">
                <Link href="/auth/signin" className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg border-2 border-black hover:-translate-y-0.5 transition-transform">Giriş Yap</Link>
                <Link href="/auth/signup" className="px-6 py-2 bg-white dark:bg-black text-black dark:text-white font-bold rounded-lg border-2 border-black hover:-translate-y-0.5 transition-transform">Kayıt Ol</Link>
            </div>
          </div>
        ) : post ? (
          <div className="space-y-6">
              {/* Header Navigation */}
              <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const uniId = post?.university?.id;
                    onGoBack(uniId);
                }}
                  className="group flex items-center gap-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                   <div className="p-2 rounded-full bg-white dark:bg-[#1a1a1a] border-2 border-black group-hover:-translate-x-1 transition-transform duration-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{borderColor: 'var(--border-color)'}}>
                    <ArrowLeft className="w-4 h-4" />
                  </div>
              </button>
                
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (post?.university?.id) {
                      if (onUniversityClick) {
                        onUniversityClick(post.university.id)
                      } else {
                      router.push(`/?university=${post.university.id}`)
                      }
                    }
                  }}
                  className="px-3 py-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{post.university.name.toLocaleUpperCase('tr-TR')}</span>
              </button>
            </div>

              {/* Main Post Card */}
              <div className="group bg-white dark:bg-[#151515] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative" style={{borderColor: 'var(--border-color)'}}>
                
                {/* Delete Button - Top Right */}
                {isAuthor && (
                  <>
                    {/* Desktop: Hover button */}
                  <button
                    onClick={handleDeletePost}
                    disabled={deletingPost}
                      className="hidden sm:block absolute top-8 right-8 p-1.5 bg-white dark:bg-[#151515] border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all z-20 opacity-0 group-hover:opacity-100"
                      style={{borderColor: '#ef4444'}}
                    title="Delete post"
                  >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    {/* Mobile: Dot menu */}
                    <div className="sm:hidden absolute top-4 right-4 z-20">
                      <button
                        onClick={() => setIsDeleteMenuOpen(!isDeleteMenuOpen)}
                        className="p-2"
                        aria-label="Menu"
                      >
                        <MoreVertical className="h-5 w-5" style={{color: 'var(--text-primary)'}} />
                      </button>
                      
                      {isDeleteMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setIsDeleteMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#151515] border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-40"
                            style={{borderColor: 'var(--border-color)'}}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setIsDeleteMenuOpen(false)
                                handleDeletePost(e)
                              }}
                              disabled={deletingPost}
                              className="w-full px-4 py-3 flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left font-semibold"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Sil</span>
                  </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
                
                {/* Post Body */}
                <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-6">
                  <h1 
                    className="font-display font-bold text-xl sm:text-3xl text-black dark:text-white mb-3 leading-tight pr-8 sm:pr-16"
                    style={{
                      overflowWrap: 'break-word',
                      wordWrap: 'break-word',
                      wordBreak: 'break-word',
                      hyphens: 'auto',
                      WebkitHyphens: 'auto'
                    }}
                  >
                    {post.title}
                  </h1>
                  <div className="prose max-w-none">
                    <p 
                      className="font-sans text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed"
                      style={{
                        overflowWrap: 'break-word',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        hyphens: 'auto',
                        WebkitHyphens: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {post.content}
                    </p>
                    {post.image && (
                      <div className="mt-4">
                        <img 
                          src={post.image} 
                          alt="Post attachment" 
                          className="rounded-lg max-h-[500px] w-auto object-contain border border-gray-200 dark:border-gray-800 cursor-pointer"
                          onClick={() => setEnlargedImage(post.image || null)}
                          onTouchStart={(e) => {
                            const touch = e.touches[0]
                            setTouchStart({ x: touch.clientX, y: touch.clientY })
                          }}
                          onTouchEnd={(e) => {
                            if (!touchStart) return
                            const touch = e.changedTouches[0]
                            const deltaX = Math.abs(touch.clientX - touchStart.x)
                            const deltaY = Math.abs(touch.clientY - touchStart.y)
                            // Only enlarge if movement is less than 10px (indicating a tap, not a scroll)
                            if (deltaX < 10 && deltaY < 10) {
                              e.preventDefault()
                              setEnlargedImage(post.image || null)
                            }
                            setTouchStart(null)
                          }}
                        />
                      </div>
                    )}
                    {post.audio && (
                      <div className="mt-4">
                        <AudioPlayer 
                          key={`${post.audio}-${postAudioDuration}`}
                          audioUrl={post.audio} 
                          duration={postAudioDuration}
                          className="p-5 gap-3 text-sm w-full min-h-[80px] [&>div>button]:p-3 [&>div>div>div]:h-3 [&>div>div>div>div]:h-3 [&>div>div>div.flex]:text-sm"
                        />
                      </div>
                    )}
                  </div>
              </div>
              
                {/* Post Footer */}
                <div className="px-4 sm:px-8 py-3 sm:py-4 bg-white dark:bg-[#151515] border-t-2 border-black flex items-center" style={{borderColor: 'var(--border-color)'}}>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getGenderColor(post.author.gender, post.author.customColor) }} />
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{new Date(post.createdAt).toLocaleDateString('tr-TR')} {new Date(post.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              </div>
            </div>

            {/* Comments Section */}
              <div className="space-y-6" data-comments-section>
              <div className="relative">
                {/* Reserve layout space to prevent footer shift; keep content invisible while loading */}
                <div className={`${commentsLoading ? 'invisible pointer-events-none select-none' : ''} space-y-6`}>
                  <h3 className="font-display font-bold text-xl text-black dark:text-white flex items-center gap-2">
                    Yorumlar 
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded-full text-sm">{commentCount}</span>
                  </h3>

                  {/* Comment Form */}
                  <div className="bg-white dark:bg-[#151515] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4" style={{borderColor: 'var(--border-color)'}}>
                    <form onSubmit={handleSubmitComment} className="flex flex-col gap-2">
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <textarea
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="Yorum yaz..."
                            className="w-full p-3 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-lg font-sans placeholder:text-gray-400"
                            rows={2}
                            maxLength={2000}
                            style={{ 
                              wordBreak: 'break-all', 
                              overflowWrap: 'break-word',
                              hyphens: 'auto',
                              WebkitHyphens: 'auto',
                              overflow: 'hidden',
                              whiteSpace: 'pre-wrap'
                            }}
                          />
                        </div>
                        <div className="flex items-end pb-2 gap-2">
                          <input
                            type="file"
                            id="comment-image-upload"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('comment-image-upload')?.click()}
                            className="p-3 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                            title="Resim ekle"
                          >
                            <ImageIcon className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                            className={`p-3 transition-colors ${
                              showVoiceRecorder || commentAudio
                                ? 'text-red-500 hover:text-red-600'
                                : 'text-gray-500 hover:text-black dark:hover:text-white'
                            }`}
                            title="Ses kaydı"
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                          <button
                            type="submit"
                            disabled={submittingComment || (!commentContent.trim() && !commentAudio && !commentImage)}
                            className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-50 hover:scale-105 transition-transform"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {showVoiceRecorder && !commentAudio && (
                        <div className="mt-2">
                          <VoiceRecorder
                            onRecordingComplete={handleRecordingComplete}
                            onCancel={handleCancelRecording}
                            maxDuration={120}
                          />
                        </div>
                      )}
                      
                      {commentAudioUrl && commentAudio && (
                        <div className="mt-2">
                          <AudioPlayer 
                            key={`${commentAudioUrl}-${commentAudioDuration}`}
                            audioUrl={commentAudioUrl} 
                            duration={commentAudioDuration} 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCommentAudio(null);
                              if (commentAudioUrl) {
                                URL.revokeObjectURL(commentAudioUrl);
                                setCommentAudioUrl(null);
                              }
                            }}
                            className="mt-2 text-xs text-red-500 hover:text-red-600"
                          >
                            Kaydı Sil
                          </button>
                        </div>
                      )}
                      
                      {commentImagePreview && (
                        <div className="relative inline-block self-start mt-2 ml-3">
                          <img 
                            src={commentImagePreview} 
                            alt="Preview" 
                            className="h-20 rounded-lg border border-gray-200 dark:border-gray-800"
                          />
                          <button
                            type="button"
                            onClick={removeCommentImage}
                            className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full border border-white hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 pb-8">
                  {comments.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                      <MessageSquare className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 font-medium">Henüz yorum yapılmadı. </p>
                    </div>
                ) : (
                    comments.map((comment) => {
                      const isCommentAuthor = session?.user?.id === comment.authorId;
                      const isCommentDeleted = comment.content?.trim().toLowerCase() === 'silinmiş';
                      return (
                        <div
                          key={comment.id}
                          className="group bg-white dark:bg-[#151515] border-2 border-black rounded-xl p-4 relative transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getGenderColor(comment.author.gender, comment.author.customColor) }} />
                              {/* Username removed */}
                              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span>{getRelativeTime(comment.createdAt)}</span>
                              </div>
                            </div>
                            
                            {isCommentAuthor && !isCommentDeleted && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={deletingCommentId === comment.id}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          {/* Only show content if it exists and is not empty */}
                          {comment.content && comment.content.trim() && !isCommentDeleted && (
                          <p 
                              className="text-lg font-sans leading-relaxed text-gray-700 dark:text-gray-300"
                            style={{
                              overflowWrap: 'break-word',
                              wordWrap: 'break-word',
                              wordBreak: 'break-word',
                              hyphens: 'auto',
                              WebkitHyphens: 'auto',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                              {comment.content}
                            </p>
                          )}
                          {isCommentDeleted && (
                            <p className="text-lg font-sans leading-relaxed italic text-gray-400">
                              Bu yorum silindi.
                            </p>
                          )}
                          {comment.audio && !isCommentDeleted && (
                            <div className={comment.content && comment.content.trim() ? "mt-3" : ""}>
                              <AudioPlayer 
                                key={`${comment.audio}-${commentDurations.get(comment.audio)}`}
                                audioUrl={comment.audio} 
                                duration={commentDurations.get(comment.audio)}
                              />
                            </div>
                          )}
                          {comment.image && !isCommentDeleted && (
                            <div className="mt-3">
                              <img 
                                src={comment.image} 
                                alt="Comment attachment" 
                                className="rounded-lg max-h-48 w-auto object-contain border border-gray-200 dark:border-gray-800 cursor-pointer"
                                onClick={() => setEnlargedImage(comment.image || null)}
                                onTouchStart={(e) => {
                                  const touch = e.touches[0]
                                  setTouchStart({ x: touch.clientX, y: touch.clientY })
                                }}
                                onTouchEnd={(e) => {
                                  if (!touchStart) return
                                  const touch = e.changedTouches[0]
                                  const deltaX = Math.abs(touch.clientX - touchStart.x)
                                  const deltaY = Math.abs(touch.clientY - touchStart.y)
                                  // Only enlarge if movement is less than 10px (indicating a tap, not a scroll)
                                  if (deltaX < 10 && deltaY < 10) {
                                    e.preventDefault()
                                    setEnlargedImage(comment.image || null)
                                  }
                                  setTouchStart(null)
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
                </div>

                {commentsLoading && (
                  <div className="absolute left-0 right-0 top-0 flex items-center justify-center py-10 z-10">
                    {/* Yellow bouncing ball loader (same as auth modals) */}
                    <div className="h-12 w-12 bg-[#FFE066] border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce-subtle relative">
                      <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-white/40 rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-lg font-medium text-black dark:text-white">Post not found.</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!loading && post && (
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
        )}
        
        {enlargedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 cursor-pointer"
            onClick={() => setEnlargedImage(null)}
            onTouchStart={(e) => {
              // Only track on mobile with single touch (not two-finger zoom)
              if (typeof window !== 'undefined' && window.innerWidth < 640 && e.touches.length === 1) {
                const touch = e.touches[0]
                if (touch) {
                  setEnlargedImageTouchStart({ x: touch.clientX, y: touch.clientY, touchCount: 1 })
                }
              } else if (e.touches.length > 1) {
                // Multiple touches - cancel scroll tracking for zoom
                setEnlargedImageTouchStart(null)
              }
            }}
            onTouchMove={(e) => {
              // Only handle on mobile with single touch (allow two-finger zoom)
              if (typeof window !== 'undefined' && window.innerWidth < 640 && enlargedImageTouchStart) {
                // If two or more touches, it's a zoom gesture - cancel tracking immediately
                if (e.touches.length !== 1) {
                  setEnlargedImageTouchStart(null)
                  return
                }
                
                // Single touch - check for scroll
                if (e.touches.length === 1 && enlargedImageTouchStart.touchCount === 1) {
                  const touch = e.touches[0]
                  if (touch) {
                    const deltaX = Math.abs(touch.clientX - enlargedImageTouchStart.x)
                    const deltaY = Math.abs(touch.clientY - enlargedImageTouchStart.y)
                    // If user scrolls more than 20px in any direction, close the image
                    if (deltaX > 20 || deltaY > 20) {
                      // Use setTimeout to avoid blocking native zoom
                      setTimeout(() => {
                        setEnlargedImage(null)
                        setEnlargedImageTouchStart(null)
                      }, 0)
                    }
                  }
                }
              }
            }}
            onTouchEnd={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 640) {
                setEnlargedImageTouchStart(null)
              }
            }}
            style={{
              paddingTop: typeof window !== 'undefined' && window.innerWidth < 640 ? '64px' : '1rem',
              paddingBottom: typeof window !== 'undefined' && window.innerWidth < 640 ? '64px' : '1rem',
              touchAction: typeof window !== 'undefined' && window.innerWidth < 640 ? 'pan-y pinch-zoom' : 'none',
              height: typeof window !== 'undefined' && window.innerWidth < 640 ? '100dvh' : '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div 
              className="relative inline-block max-w-4xl max-h-[75vh] sm:max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEnlargedImage(null)}
                className="hidden sm:block absolute -top-4 -right-4 bg-white dark:bg-black text-black dark:text-white rounded-full p-2 shadow-lg border border-gray-200 dark:border-gray-700 z-10 translate-x-1/2 -translate-y-1/2"
                aria-label="Close enlarged image"
              >
                <X className="w-4 h-4" />
              </button>
              <img 
                src={enlargedImage} 
                alt="Enlarged attachment" 
                className="max-w-full max-h-[75vh] sm:max-h-[90vh] object-contain block sm:cursor-default"
                style={{
                  touchAction: typeof window !== 'undefined' && window.innerWidth < 640 ? 'pan-y pinch-zoom' : 'none',
                  minHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? '500px' : 'auto'
                }}
                onClick={(e) => {
                  // On mobile, clicking image closes it; on desktop, prevent closing
                  if (window.innerWidth < 640) {
                    e.stopPropagation()
                    setEnlargedImage(null)
                  } else {
                    e.stopPropagation()
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
