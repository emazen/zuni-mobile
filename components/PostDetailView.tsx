'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Trash2, Send, Clock, ChevronDown, Image as ImageIcon, X } from 'lucide-react';
import CustomSpinner from './CustomSpinner';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

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
  comments: Comment[];
  _count: {
    comments: number;
  };
  image?: string | null;
}

interface PostDetailViewProps {
  postId: string;
  onGoBack: (universityId?: string) => void;
  onCommentAdded?: () => void;
  onPostDeleted?: () => void;
}

export default function PostDetailView({ postId, onGoBack, onCommentAdded, onPostDeleted }: PostDetailViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

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

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentContent.trim(),
          image: imageUrl,
        }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setCommentContent('');
        removeCommentImage();
        
        if (post) {
          setPost(prevPost => ({
            ...prevPost!,
            comments: [...(prevPost?.comments || []), newComment],
            _count: {
              ...prevPost!._count,
              comments: (prevPost?._count.comments || 0) + 1
            }
          }));
        }
        
        onCommentAdded?.();
        
        setTimeout(() => {
          const commentsSection = document.querySelector('[data-comments-section]');
          if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
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

      setPost((prev) => {
        if (!prev) return prev;
        const updatedComments = prev.comments.map((comment) =>
          comment.id === commentId ? { ...comment, content: 'silinmiş' } : comment
        );
        return { ...prev, comments: updatedComments };
      });
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

  const isAuthor = session?.user?.id === post?.authorId;

  return (
    <div className="flex-1 min-h-full bg-gray-50 dark:bg-[#121212]" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-full">
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
                      router.push(`/?university=${post.university.id}`)
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
                  <button
                    onClick={handleDeletePost}
                    disabled={deletingPost}
                    className="absolute top-8 right-8 p-1.5 bg-white dark:bg-[#151515] border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all z-20 opacity-0 group-hover:opacity-100"
                    style={{borderColor: '#ef4444'}}
                    title="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                        />
                      </div>
                    )}
                  </div>
              </div>
              
                {/* Post Footer */}
                <div className="px-4 sm:px-8 py-3 sm:py-4 bg-white dark:bg-[#151515] border-t-2 border-black flex items-center gap-4" style={{borderColor: 'var(--border-color)'}}>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{new Date(post.createdAt).toLocaleDateString('tr-TR')} {new Date(post.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              </div>
            </div>

            {/* Comments Section */}
              <div className="space-y-6" data-comments-section>
                <h3 className="font-display font-bold text-xl text-black dark:text-white flex items-center gap-2">
                  Yorumlar 
                  <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded-full text-sm">{post.comments.length}</span>
              </h3>

              {/* Comment Form */}
                <div className="bg-white dark:bg-[#151515] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4" style={{borderColor: 'var(--border-color)'}}>
                  <form onSubmit={handleSubmitComment} className="flex flex-col gap-2">
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="Tartışmaya katıl..."
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
                    type="submit"
                    disabled={submittingComment || !commentContent.trim()}
                          className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-50 hover:scale-105 transition-transform"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
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
                {post.comments.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                      <MessageSquare className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 font-medium">Henüz yorum yapılmadı. </p>
                    </div>
                ) : (
                    post.comments.map((comment) => {
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
                              <span className="text-xs text-gray-400 font-mono">
                                {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                              </span>
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
                          
                          <p 
                            className={`text-lg font-sans leading-relaxed ${
                              isCommentDeleted ? 'italic text-gray-400' : 'text-gray-700 dark:text-gray-300'
                            }`}
                            style={{
                              overflowWrap: 'break-word',
                              wordWrap: 'break-word',
                              wordBreak: 'break-word',
                              hyphens: 'auto',
                              WebkitHyphens: 'auto',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {isCommentDeleted ? 'This comment has been deleted.' : comment.content}
                          </p>
                          {comment.image && !isCommentDeleted && (
                            <div className="mt-3">
                              <img 
                                src={comment.image} 
                                alt="Comment attachment" 
                                className="rounded-lg max-h-48 w-auto object-contain border border-gray-200 dark:border-gray-800 cursor-pointer"
                                onClick={() => setEnlargedImage(comment.image || null)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
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
          <footer className="mt-8" style={{paddingBottom: 0, marginBottom: '-1rem'}}>
            <div style={{paddingBottom: 0, marginBottom: 0}}>
              <div className="flex flex-wrap justify-center items-center gap-6" style={{marginBottom: 0}}>
                <a href="#" className="text-xs font-semibold hover:underline" style={{color: 'var(--text-secondary)'}}>
                  Hakkında
                </a>
                <a href="#" className="text-xs font-semibold hover:underline" style={{color: 'var(--text-secondary)'}}>
                  Hizmet Şartları
                </a>
                <a href="#" className="text-xs font-semibold hover:underline" style={{color: 'var(--text-secondary)'}}>
                  Gizlilik Politikası
                </a>
              </div>
              <p className="text-center text-xs font-medium" style={{color: 'var(--text-secondary)', marginBottom: 0, paddingBottom: 0}}>
                © 2025 zuni.social. Tüm hakları saklıdır.
              </p>
            </div>
          </footer>
        )}
        
        {enlargedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 cursor-pointer"
            onClick={() => setEnlargedImage(null)}
          >
            <div 
              className="relative inline-block max-w-4xl max-h-[95vh] sm:max-h-[90vh]"
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
                className="max-w-full max-h-[95vh] sm:max-h-[90vh] object-contain block"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
