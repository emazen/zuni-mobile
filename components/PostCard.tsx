"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { MessageSquare, Clock, TrendingUp } from "lucide-react"

interface Post {
  id: string
  title: string
  content: string
  authorId?: string // Made optional as some API routes might not return it, but they should.
  author: {
    gender: string
    customColor?: string | null
  }
  university: {
    id: string
    name: string
    shortName: string
  }
  createdAt: string
  _count: {
    comments: number
  }
  comments?: Array<{
    id: string
    createdAt: string
  }>
  isTrending?: boolean
  latestCommentTimestamp?: string | null
}

interface PostCardProps {
  post: Post
  viewedPosts: Set<string>
  postViewTimestamps: Map<string, string>
  userJustCommented?: Set<string>
  showUniversityInfo?: boolean
  onPostClick?: (postId: string) => void
}

export default function PostCard({ post, viewedPosts, postViewTimestamps, userJustCommented, showUniversityInfo = true, onPostClick }: PostCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  const handlePostClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onPostClick) {
      onPostClick(post.id)
    } else {
      router.push(`/?post=${post.id}`)
    }
  }

  const hasNewMessages = (post: Post) => {
    if (!post || !post._count) return false
    if (userJustCommented && userJustCommented.has(post.id)) return false
    
    const isPostAuthor = session?.user?.id === post.authorId
    const hasViewedPost = postViewTimestamps.has(post.id)
    
    if (!hasViewedPost) {
      if (isPostAuthor) {
        return post.latestCommentTimestamp !== null
      }
      return true
    }
    
    if (!post.latestCommentTimestamp) return false
    
    const viewTimestamp = postViewTimestamps.get(post.id)
    if (!viewTimestamp) return false
    
    const viewTime = new Date(viewTimestamp).getTime()
    const latestCommentTime = new Date(post.latestCommentTimestamp).getTime()
    
    return latestCommentTime > viewTime
  }

  const getGenderColor = (gender: string, customColor?: string | null) => {
    switch (gender) {
      case 'male': return '#3b82f6'; // blue-500
      case 'female': return '#ec4899'; // pink-500
      case 'custom': return customColor || '#9ca3af';
      default: return '#9ca3af';
    }
  }

  return (
    <div className="relative group h-full">
      <Link 
        href={`/?post=${post.id}`}
        onClick={handlePostClick}
        className="block h-full"
      >
        <div className="relative h-[260px] bg-white dark:bg-[#151515] border-2 border-black rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col p-4 overflow-hidden" style={{borderColor: 'var(--border-color)'}}>
          
          {/* Metadata Row */}
          <div className="flex justify-between items-center mb-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              {/* Author Dot */}
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getGenderColor(post.author?.gender, post.author?.customColor) }} 
              />
              
              {/* Trending Icon */}
              {post.isTrending && (
                <div className="flex items-center gap-1.5 text-orange-500 font-bold ml-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Trend</span>
                </div>
              )}
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(post.createdAt).toLocaleDateString('tr-TR')}</span>
            </div>
          </div>

          {/* Title & Content */}
          <div className="flex-1 mb-4">
            <h3 className="font-display font-bold text-2xl leading-tight mb-2 text-black dark:text-white group-hover:text-pink-500 transition-colors line-clamp-2">
              {post.title}
            </h3>
            <p className="font-sans text-lg text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
              {post.content}
            </p>
          </div>

          {/* Footer Row */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
             {/* University Tag */}
             {showUniversityInfo && post.university ? (
               <span className="text-sm font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                 {post.university.name}
               </span>
             ) : (
               <span className="text-sm font-bold text-gray-400">Zuni Board</span>
             )}

             {/* Comment Count */}
             <div className={`flex items-center gap-2 text-base font-bold transition-colors ${
               hasNewMessages(post) 
                 ? 'text-red-500' 
                 : 'text-gray-400 group-hover:text-black dark:group-hover:text-white'
             }`}>
               <MessageSquare className="w-5 h-5" fill={hasNewMessages(post) ? "currentColor" : "none"} />
               <span className="leading-none relative -top-[2px]">{post._count?.comments || 0}</span>
             </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
