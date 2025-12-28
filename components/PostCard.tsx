"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Clock, TrendingUp, Image as ImageIcon } from "lucide-react"
import AudioPlayer from "./AudioPlayer"
import { useEffect, useState } from "react"
import { getAudioDurationFromUrl } from "@/lib/utils"

// Cache for audio durations to prevent re-fetching on carousel navigation
const audioDurationCache = new Map<string, number>()

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
  image?: string | null
  audio?: string | null
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
  const titleLineClamp = 2
  // Main screen (showUniversityInfo true) + audio: shorten content to 1 line
  const contentLineClamp = post.audio && showUniversityInfo ? 1 : 2
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined)

  // Extract audio duration when post has audio (with cache to prevent re-fetching)
  useEffect(() => {
    if (!post.audio) return

    // Check cache first
    const cachedDuration = audioDurationCache.get(post.audio)
    if (cachedDuration !== undefined) {
      setAudioDuration(cachedDuration)
      return
    }

    const extractDuration = async () => {
      try {
        const duration = await getAudioDurationFromUrl(post.audio!)
        const roundedDuration = Math.round(duration)
        // Cache the duration
        audioDurationCache.set(post.audio!, roundedDuration)
        setAudioDuration(roundedDuration)
      } catch (error) {
        console.error('Error extracting audio duration:', error)
      }
    }

    extractDuration()
  }, [post.audio])
  
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

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s önce`
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}d önce`
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours}g önce`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}gün önce`
  }

  const isNew = hasNewMessages(post)

  return (
    <div className="relative group h-full">
      <div 
        onClick={handlePostClick}
        className="block h-full cursor-pointer"
      >
        <div className="relative h-[260px] bg-white dark:bg-[#151515] border-2 border-black dark:border-gray-700 rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] flex flex-col p-4 overflow-visible">
          
          {/* Notification Badge (Top-Right Corner) */}
          <div className={`absolute -top-3 -right-3 sm:-top-5 sm:-right-5 min-w-[32px] h-8 sm:min-w-[40px] sm:h-10 px-2 flex items-center justify-center text-sm sm:text-base font-black rounded-full shadow-md z-20 ${
            isNew 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {post._count?.comments || 0}
        </div>

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
          </div>
      
          {/* Title & Content */}
          <div className={`${
            post.audio && !post.image && (!post.content || !post.content.trim().length)
              ? 'mb-0'
              : post.audio
              ? 'mb-2'
              : 'mb-4'
          } flex gap-4 ${
            post.audio && !post.image && (!post.content || !post.content.trim().length)
              ? ''
              : 'flex-1'
          } min-h-0 relative z-10`}>
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
              <h3 
                className={`font-display font-bold text-2xl leading-tight ${
                  post.audio && !post.image && (!post.content || !post.content.trim().length)
                    ? 'mb-4'
                    : 'mb-2'
                } text-black dark:text-white group-hover:text-pink-500 transition-colors`}
                style={{
              display: '-webkit-box',
                  WebkitLineClamp: titleLineClamp,
              WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {post.title}
              </h3>
              {!(post.audio && !post.image && (!post.content || !post.content.trim().length)) && (
              <p 
                className="font-sans text-lg text-gray-600 dark:text-gray-300 leading-relaxed break-words"
                style={{
              display: '-webkit-box',
                  WebkitLineClamp: contentLineClamp,
              WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {post.content}
            </p>
              )}
            </div>
            {post.image && (
              <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 relative bg-gray-100 dark:bg-gray-900">
                <img 
                  src={post.image} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
        </div>

          {/* Audio Player - Smaller when image is present, compact when text is present */}
          {post.audio && (
            <div 
              className={`mb-2 w-full flex-shrink-0 relative z-0 ${
                !post.image && (!post.content || !post.content.trim().length)
                  ? 'pt-5 flex justify-center'
                  : 'pt-2'
              } ${
                post.image ? 'max-w-[calc(100%-7rem)]' : ''
              }`} 
              onClick={(e) => e.stopPropagation()}
            >
              <AudioPlayer 
                key={`${post.audio}-${audioDuration}`}
                audioUrl={post.audio} 
                duration={audioDuration}
                className={
                  (post.image || (post.content && post.content.trim().length > 0))
                    ? "p-1 gap-0.5 text-[9px] min-h-[32px] [&>div>button]:p-0.5 [&>div>button]:h-5 [&>div>button]:w-5 [&>div>button]:border [&>div>button]:border-[1px] [&>div>button]:inline-flex [&>div>button]:items-center [&>div>button]:justify-center [&>div>button>svg]:w-3 [&>div>button>svg]:h-3 [&>div>div>div]:h-1 [&>div>div>div>div]:h-1 [&>div>div>div.flex]:text-[8px] [&>div>div>button:last-child]:!border-0 [&>div>div>button:last-child]:!border-none [&>div>div>button:last-child]:outline-none [&>div>div>button:last-child]:ring-0 [&>div>div>button:last-child]:shadow-none [&>div>div>div:last-child]:border-0 [&>div>div>div:last-child]:border-none [&>div>div>div:last-child>button]:!border-0 [&>div>div>div:last-child>button]:!border-none"
                    : "p-4.5 gap-3 text-base min-h-[75px] w-full [&>div>button]:p-3 [&>div>button]:h-9.5 [&>div>button]:w-9.5 [&>div>button]:border [&>div>button]:border-[1.5px] [&>div>button]:inline-flex [&>div>button]:items-center [&>div>button]:justify-center [&>div>button>svg]:w-5 [&>div>button>svg]:h-5 [&>div>div>div]:h-3 [&>div>div>div>div]:h-3 [&>div>div>div.flex]:text-xs [&>div>div>button:last-child]:!border-0 [&>div>div>button:last-child]:!border-none [&>div>div>button:last-child]:outline-none [&>div>div>button:last-child]:ring-0 [&>div>div>button:last-child]:shadow-none [&>div>div>div:last-child]:border-0 [&>div>div>div:last-child]:border-none [&>div>div>div:last-child>button]:!border-0 [&>div>div>div:last-child>button]:!border-none"
                }
                showVolumeControl={false}
              />
            </div>
          )}
        
          {/* Footer Row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-auto flex-shrink-0">
            {showUniversityInfo && post.university ? (
              <>
                <span className="text-xs font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                  {post.university.name}
                </span>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{getRelativeTime(post.createdAt)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{getRelativeTime(post.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
