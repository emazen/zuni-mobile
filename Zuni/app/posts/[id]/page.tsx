"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, use } from "react"
import { ArrowLeft, MessageSquare, User, Trash2, Send } from "lucide-react"
import CustomSpinner from '@/components/CustomSpinner'
import Link from "next/link"

interface Comment {
  id: string
  content: string
  author: {
    name: string
    email: string
    gender: string
  }
  createdAt: string
}

interface Post {
  id: string
  title: string
  content: string
  author: {
    name: string
    email: string
    gender: string
  }
  createdAt: string
  comments: Comment[]
  _count: {
    comments: number
  }
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentContent, setCommentContent] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  
  const resolvedParams = use(params)

  useEffect(() => {
    if (!session) {
      router.push("/")
      return
    }
    fetchPost()
  }, [session, router, resolvedParams.id])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setPost(data)
        
        // Mark post as read when viewing post details
        if (session?.user?.id) {
          try {
            await fetch(`/api/posts/${resolvedParams.id}/mark-read`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            console.log('Post marked as read from detail page')
          } catch (error) {
            console.error('Error marking post as read:', error)
          }
        }
      } else {
        router.push("/")
      }
    } catch (error) {
      console.error("Error fetching post:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentContent.trim()) return

    setSubmittingComment(true)
    try {
      const response = await fetch(`/api/posts/${resolvedParams.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentContent.trim(),
        }),
      })

      if (response.ok) {
        const newComment = await response.json();
        setCommentContent("")
        
        // Add the new comment to the existing post without full refresh
        if (post) {
          setPost(prevPost => {
            if (!prevPost) return prevPost;
            return {
              ...prevPost,
              comments: [...(prevPost.comments || []), newComment],
              _count: {
                ...prevPost._count,
                comments: prevPost._count.comments + 1
              }
            };
          });
        }
        
        // Scroll to comments section to show the new comment
        setTimeout(() => {
          const commentsSection = document.querySelector('[data-comments-section]');
          if (commentsSection) {
            commentsSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'end' 
            });
          } else {
            // Fallback: scroll to bottom
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100); // Reduced delay since we're not doing full refresh
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return

    try {
      const response = await fetch(`/api/posts/${resolvedParams.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Force refresh the main page data
        router.push("/?refresh=" + Date.now())
      }
    } catch (error) {
      console.error("Error deleting post:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <CustomSpinner size="lg" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-black">Post not found.</p>
          <Link href="/" className="text-black font-black hover:text-pink-600 transition-colors">
            Back to board
          </Link>
        </div>
      </div>
    )
  }

  const isAuthor = session?.user?.email === post.author.email

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="brutal-header">
        <div className="w-full px-2 sm:px-4">
          <div className="flex items-center h-16">
            <Link
              href="/"
              className="inline-flex items-center text-black font-black hover:text-pink-600 transition-colors mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Board
            </Link>
            <h1 className="text-2xl font-black text-black">Post Discussion</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Post */}
        <div className="brutal-card mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-black text-black">{post.title}</h1>
            {isAuthor && (
              <button
                onClick={handleDeletePost}
                className="text-red-600 hover:text-red-800 p-2 brutal-border bg-white brutal-shadow-sm hover:brutal-shadow transition-all duration-150"
                title="Delete post"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <div className="prose max-w-none mb-6">
            <p className="text-black font-semibold whitespace-pre-wrap">{post.content}</p>
          </div>
          
          <div className="flex items-center text-sm text-black border-t-2 border-black pt-4">
            <div className="flex items-center mr-4">
              {post.author.gender === 'male' && (
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              )}
              {post.author.gender === 'female' && (
                <div className="w-4 h-4 bg-pink-500 rounded-full mr-2"></div>
              )}
              {post.author.gender === 'lgbt' && (
                <div className="w-4 h-4 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 rounded-full mr-2"></div>
              )}
              {!post.author.gender && (
                <div className="w-4 h-4 bg-gray-400 rounded-full mr-2"></div>
              )}
            </div>
            <MessageSquare className="h-4 w-4 mr-1" />
            <span className="font-semibold">{post._count.comments} comments</span>
            <span className="mx-2">•</span>
            <span className="font-semibold">{new Date(post.createdAt).toLocaleDateString('tr-TR')} {new Date(post.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Comments Section */}
        <div className="brutal-card" data-comments-section>
          <h2 className="text-xl font-black text-black mb-4">
            Comments ({post.comments.length})
          </h2>

          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-6">
            <div className="flex space-x-3 items-stretch">
              <div className="flex-1">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write a comment..."
                  className="brutal-input w-full h-full"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={submittingComment || !commentContent.trim()}
                className="brutal-button-comment disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {post.comments.length === 0 ? (
              <p className="text-black font-semibold text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              post.comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-black pl-4 py-2">
                  <div className="flex items-center text-sm text-black mb-2">
                    <div className="flex items-center mr-2">
                      {comment.author.gender === 'male' && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                      )}
                      {comment.author.gender === 'female' && (
                        <div className="w-4 h-4 bg-pink-500 rounded-full mr-2"></div>
                      )}
                      {comment.author.gender === 'lgbt' && (
                        <div className="w-4 h-4 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 rounded-full mr-2"></div>
                      )}
                      {!comment.author.gender && (
                        <div className="w-4 h-4 bg-gray-400 rounded-full mr-2"></div>
                      )}
                    </div>
                    <span className="font-semibold">{new Date(comment.createdAt).toLocaleDateString('tr-TR')} {new Date(comment.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-black font-semibold whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
