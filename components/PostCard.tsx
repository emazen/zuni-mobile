"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Clock, TrendingUp, Image as ImageIcon } from "lucide-react"
import AudioPlayer from "./AudioPlayer"
import { useEffect, useState } from "react"
import { getAudioDurationFromUrl } from "@/lib/utils"

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
  // Keep audio cards aligned: limit content preview to 2 lines when audio exists
  const contentLineClamp = post.audio ? 2 : (showUniversityInfo ? 2 : 3)
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined)

  // Extract audio duration when post has audio
  useEffect(() => {
    if (!post.audio) return

    const extractDuration = async () => {
      try {
        const duration = await getAudioDurationFromUrl(post.audio!)
        setAudioDuration(Math.round(duration))
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

  const isNew = hasNewMessages(post)

  return (
    <div className="relative group h-full">
      <Link 
        href={`/?post=${post.id}`}
        onClick={handlePostClick}
        className="block h-full"
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
          <div className={`${post.audio ? 'mb-1' : 'mb-4'} flex gap-4 min-h-0`}>
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
              <h3 
                className="font-display font-bold text-2xl leading-tight mb-2 text-black dark:text-white group-hover:text-pink-500 transition-colors"
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

          {/* Audio Player - Slightly below center for better visual weight balance */}
          {post.audio && (
            <div className="flex-1 flex flex-col justify-center mb-2 w-full pt-2" onClick={(e) => e.stopPropagation()}>
              <AudioPlayer 
                key={`${post.audio}-${audioDuration}`}
                audioUrl={post.audio} 
                duration={audioDuration}
                className="p-5 gap-3 text-sm w-full min-h-[80px] [&>div>button]:p-3 [&>div>div>div]:h-3 [&>div>div>div>div]:h-3 [&>div>div>div.flex]:text-sm"
                showVolumeControl={false}
              />
            </div>
          )}
        
          {/* Footer Row */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
            {showUniversityInfo && post.university ? (
              <>
                <span className="text-sm font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                  {post.university.name}
                </span>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(post.createdAt).toLocaleString('tr-TR', { 
                    year: 'numeric', 
                    month: 'numeric', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(post.createdAt).toLocaleString('tr-TR', { 
                  year: 'numeric', 
                  month: 'numeric', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
