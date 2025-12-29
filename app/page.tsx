"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { MessageSquare, LogOut, User, GraduationCap, Star, BookOpen, Plus, Menu, X, Send, Calendar, TrendingUp, Building2, Moon, Sun, ArrowUpDown, Clock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import CustomSpinner from "@/components/CustomSpinner"
import Link from "next/link"
import Image from "next/image"
import UniversitySidebar from "@/components/UniversitySidebar"
import PostDetailView from "@/components/PostDetailView"
import SplashScreen from "@/components/SplashScreen"
import PostCard from "@/components/PostCard"
import PostListSkeleton from "@/components/PostListSkeleton"
import ThemeToggle from "@/components/ThemeToggle"
import { useTheme } from "@/contexts/ThemeContext"
import AuthModalCombined from "@/components/AuthModalCombined"
import AuthModal from "@/components/AuthModal"
import Logo from "@/components/Logo"

interface Post {
  id: string
  title: string
  content: string
  author: {
    name: string
    email: string
    gender: string
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

interface SubscribedUniversity {
  id: string
  university: {
    id: string
    name: string
    shortName: string
    city: string
    type: string
  }
  createdAt: string
}

interface UserActivity {
  userPosts: Post[]
  postsWithUserComments: Post[]
  subscribedUniversities: SubscribedUniversity[]
}

interface University {
  id: string
  name: string
  shortName: string
  city: string
  type: 'public' | 'private'
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, effectiveTheme, toggleTheme } = useTheme()
  const mainScrollRef = useRef<HTMLDivElement | null>(null)
  const lastMainScrollTopRef = useRef<number>(0)
  const shouldRestoreMainScrollOnBackRef = useRef<boolean>(false)
  const [isRestoringMainScroll, setIsRestoringMainScroll] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [subscribedPostsLoaded, setSubscribedPostsLoaded] = useState(false)
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [allPostsLoaded, setAllPostsLoaded] = useState(false)
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my-activity' | 'subscribed' | 'trending'>(() => {
    if (typeof window === 'undefined') return 'my-activity'
    const savedActiveTab = localStorage.getItem('activeTab')
    if (savedActiveTab && ['my-activity', 'subscribed', 'trending'].includes(savedActiveTab)) {
      return savedActiveTab as 'my-activity' | 'subscribed' | 'trending'
    }
    return 'my-activity'
  })
  
  // Get post ID and university ID from URL parameters
  const postId = searchParams.get('post')
  const universityParam = searchParams.get('university')
  const refreshParam = searchParams.get('refresh')

  // Handle refresh parameter - refresh data when coming back from post deletion
  useEffect(() => {
    if (refreshParam) {
      fetchData(false) // Don't show loading on refresh
      // If there's a university parameter in URL, refresh university posts too
      const urlParams = new URLSearchParams(window.location.search)
      const uniParam = urlParams.get('university')
      if (uniParam) {
        // Show loader during refresh
        setUniversityLoading(true)
        const refreshUniversityPosts = async () => {
          try {
            const postsResponse = await fetch(`/api/universities/${uniParam}/posts`)
            if (postsResponse.ok) {
              const posts = await postsResponse.json()
              setUniversityPosts(posts)
            }
          } catch (error) {
            console.error('Error refreshing university posts:', error)
          } finally {
            // Hide loader after refresh completes
            setUniversityLoading(false)
          }
        }
        refreshUniversityPosts()
      } else {
        // If no university param, hide loader after fetchData completes
        setTimeout(() => {
          setUniversityLoading(false)
        }, 100)
      }
      // Clean up URL by removing refresh parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('refresh')
      window.history.replaceState({}, '', url.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshParam])


  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Initialize selectedPostId and showPostDetail from URL to prevent flash on refresh
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('post')
    }
    return null
  })
  const [showPostDetail, setShowPostDetail] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      return !!urlParams.get('post')
    }
    return false
  })
  // Initialize postSource synchronously from URL to prevent double-click issues on refresh
  const [postSource, setPostSource] = useState<'main' | 'university' | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlPostId = urlParams.get('post')
      const urlUniversityParam = urlParams.get('university')
      if (urlPostId) {
        // If university param exists → opened from university board
        // If no university param → opened from main page
        return urlUniversityParam ? 'university' : 'main'
      }
    }
    return null
  })
  // Initialize postSourceUniversityId synchronously from URL
  const [postSourceUniversityId, setPostSourceUniversityId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlUniversityParam = urlParams.get('university')
      return urlUniversityParam || null
    }
    return null
  })
  // Track which tab user was on when opening a post (for back navigation)
  const [postSourceTab, setPostSourceTab] = useState<'my-activity' | 'subscribed' | 'trending' | null>(null)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false) // Flag to prevent useEffect from re-triggering
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set())
  const [postViewTimestamps, setPostViewTimestamps] = useState<Map<string, string>>(new Map())
  const [userJustCommented, setUserJustCommented] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // Initialize showUniversityBoard based on URL parameter to prevent flash on refresh
  const [showUniversityBoard, setShowUniversityBoard] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const universityParam = urlParams.get('university')
      const postParam = urlParams.get('post')
      // If there's a university param but no post param, we're loading a university board
      return !!universityParam && !postParam
    }
    return false
  })
  const [selectedUniversity, setSelectedUniversity] = useState<{id: string, name: string, shortName: string, city: string, type: 'public' | 'private'} | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [universityPosts, setUniversityPosts] = useState<Post[]>([])
  const [universityPostsLoaded, setUniversityPostsLoaded] = useState<Record<string, boolean>>({})
  // Initialize universityLoading based on URL parameter to show loading state immediately on refresh
  const [universityLoading, setUniversityLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const universityParam = urlParams.get('university')
      const postParam = urlParams.get('post')
      // If there's a university param but no post param, show loading immediately
      return !!universityParam && !postParam
    }
    return false
  })
  const [isUniversityRefreshing, setIsUniversityRefreshing] = useState(false)
  // Track the latest requested university ID to prevent race conditions
  const latestUniversityRequestRef = useRef<string | null>(null)
  // AbortController to cancel previous requests when a new one is initiated
  const abortControllerRef = useRef<AbortController | null>(null)
  const universityRefreshAbortControllerRef = useRef<AbortController | null>(null)
  // Track if a request is currently in progress to prevent duplicate requests
  const isRequestInProgressRef = useRef<boolean>(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAuthModalCombined, setShowAuthModalCombined] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [myPostsIndex, setMyPostsIndex] = useState(0)
  const [commentedPostsIndex, setCommentedPostsIndex] = useState(0)
  const postsPerSlide = 4

  // Carousel helper functions for My Posts
  const getTotalSlides = (posts: Post[]) => Math.ceil(posts.length / postsPerSlide)
  
  const goToNextSlide = (currentIndex: number, posts: Post[], setIndex: (val: number) => void) => {
    const totalSlides = getTotalSlides(posts)
    setIndex((currentIndex + 1) % totalSlides)
  }
  
  const goToPrevSlide = (currentIndex: number, posts: Post[], setIndex: (val: number) => void) => {
    const totalSlides = getTotalSlides(posts)
    setIndex((currentIndex - 1 + totalSlides) % totalSlides)
  }
  
  const goToSlide = (index: number, setIndex: (val: number) => void) => {
    setIndex(index)
  }
  
  const getVisiblePosts = (posts: Post[], currentIndex: number) => {
    const start = currentIndex * postsPerSlide
    return posts.slice(start, start + postsPerSlide)
  }

  // Sort user posts: 
  // 1. New commented posts first (by latest comment timestamp)
  // 2. Commented but seen posts (by latest comment timestamp, not view timestamp)
  // 3. Posts with no activity (by creation time, newest first)
  // OPTIMIZED: Pre-compute timestamps to avoid repeated Date parsing
  const sortedUserPosts = useMemo(() => {
    if (!userActivity?.userPosts) return []
    
    // Pre-compute all timestamps once
    const postsWithTimestamps = userActivity.userPosts.map(post => {
      const viewTimestamp = postViewTimestamps.get(post.id)
      const viewTime = viewTimestamp ? new Date(viewTimestamp).getTime() : 0
      const latestCommentTime = post.latestCommentTimestamp ? new Date(post.latestCommentTimestamp).getTime() : 0
      const createdAtTime = new Date(post.createdAt).getTime()
      const hasNewComments = post.latestCommentTimestamp && (!viewTimestamp || latestCommentTime > viewTime)
      const hasComments = !!post.latestCommentTimestamp
      
      return {
        post,
        viewTime,
        latestCommentTime,
        createdAtTime,
        hasNewComments,
        hasComments
      }
    })
    
    return postsWithTimestamps.sort((a, b) => {
      // Posts with new comments come first
      if (a.hasNewComments && !b.hasNewComments) return -1
      if (!a.hasNewComments && b.hasNewComments) return 1
      
      // If both have new comments, sort by latest comment timestamp (newest first)
      if (a.hasNewComments && b.hasNewComments) {
        return b.latestCommentTime - a.latestCommentTime
      }
      
      // If neither has new comments, check if they have activity (comments)
      // Posts with activity (commented but seen) come before posts with no activity
      if (a.hasComments && !b.hasComments) return -1
      if (!a.hasComments && b.hasComments) return 1
      
      // If both have activity (commented but seen), sort by latest comment timestamp (newest first)
      if (a.hasComments && b.hasComments) {
        return b.latestCommentTime - a.latestCommentTime
      }
      
      // If neither has activity, sort by creation date (newest first)
      return b.createdAtTime - a.createdAtTime
    }).map(item => item.post)
  }, [userActivity?.userPosts, postViewTimestamps])

  // Sort posts with user comments using the same ordering system
  // 1. New commented posts first (by latest comment timestamp)
  // 2. Commented but seen posts (by latest comment timestamp, not view timestamp)
  // 3. Posts with no activity (by creation time, newest first)
  // OPTIMIZED: Pre-compute timestamps to avoid repeated Date parsing
  const sortedCommentedPosts = useMemo(() => {
    if (!userActivity?.postsWithUserComments) return []
    
    // Pre-compute all timestamps once
    const postsWithTimestamps = userActivity.postsWithUserComments.map(post => {
      const viewTimestamp = postViewTimestamps.get(post.id)
      const viewTime = viewTimestamp ? new Date(viewTimestamp).getTime() : 0
      const latestCommentTime = post.latestCommentTimestamp ? new Date(post.latestCommentTimestamp).getTime() : 0
      const createdAtTime = new Date(post.createdAt).getTime()
      const hasNewComments = post.latestCommentTimestamp && (!viewTimestamp || latestCommentTime > viewTime)
      const hasComments = !!post.latestCommentTimestamp
      
      return {
        post,
        viewTime,
        latestCommentTime,
        createdAtTime,
        hasNewComments,
        hasComments
      }
    })
    
    return postsWithTimestamps.sort((a, b) => {
      // Posts with new comments come first
      if (a.hasNewComments && !b.hasNewComments) return -1
      if (!a.hasNewComments && b.hasNewComments) return 1
      
      // If both have new comments, sort by latest comment timestamp (newest first)
      if (a.hasNewComments && b.hasNewComments) {
        return b.latestCommentTime - a.latestCommentTime
      }
      
      // If neither has new comments, check if they have activity (comments)
      // Posts with activity (commented but seen) come before posts with no activity
      if (a.hasComments && !b.hasComments) return -1
      if (!a.hasComments && b.hasComments) return 1
      
      // If both have activity (commented but seen), sort by latest comment timestamp (newest first)
      if (a.hasComments && b.hasComments) {
        return b.latestCommentTime - a.latestCommentTime
      }
      
      // If neither has activity, sort by creation date (newest first)
      return b.createdAtTime - a.createdAtTime
    }).map(item => item.post)
  }, [userActivity?.postsWithUserComments, postViewTimestamps])

  const sortedUniversityPosts = useMemo(() => {
    if (!universityPosts || universityPosts.length === 0) return []

    // Pre-compute values once to avoid repeated Date parsing
    const postsWithMeta = universityPosts.map(post => ({
      post,
      createdAtTime: new Date(post.createdAt).getTime(),
      commentCount: post._count?.comments || 0,
    }))

    postsWithMeta.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.createdAtTime - a.createdAtTime
      }
      return b.commentCount - a.commentCount
    })

    return postsWithMeta.map(x => x.post)
  }, [universityPosts, sortBy])

  const preloadImages = async (urls: string[], timeoutMs = 1200) => {
    if (typeof window === 'undefined') return
    if (!urls.length) return

    const uniqueUrls = Array.from(new Set(urls)).filter(Boolean)
    const timeout = new Promise<void>(resolve => setTimeout(resolve, timeoutMs))

    const loads = uniqueUrls.map(
      url =>
        new Promise<void>(resolve => {
          const img = new window.Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = url
        })
    )

    await Promise.race([Promise.allSettled(loads).then(() => undefined), timeout])
  }

  // (Tab title is constant "Zuni" now; post meta cache removed.)

  const getUniversityMetaFromCaches = (universityId: string) => {
    // Prefer our sessionStorage board cache (freshest for the current session)
    const boardCache = readUniversityBoardCache(universityId)
    if (boardCache?.university?.id === universityId) return boardCache.university

    // Fallback: UniversitySidebar caches universities list in localStorage
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('universities_cache')
      if (!raw) return null
      const list = JSON.parse(raw) as Array<{
        id: string
        name: string
        shortName: string
        city: string
        type: 'public' | 'private'
      }>
      const found = list.find(u => u.id === universityId)
      return found || null
    } catch {
      return null
    }
  }

  // Tab title: always "Zuni"
  const setBaseTabTitle = () => {
    if (typeof document === 'undefined') return
    if (document.title !== 'Zuni') document.title = 'Zuni'
  }

  const getUniversityCacheKey = (universityId: string) => `universityBoardCache_${universityId}`

  const readUniversityBoardCache = (universityId: string) => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(getUniversityCacheKey(universityId))
      if (!raw) return null
      return JSON.parse(raw) as {
        university: { id: string; name: string; shortName: string; city: string; type: 'public' | 'private' }
        posts: Post[]
        cachedAt: number
      }
    } catch {
      return null
    }
  }

  const writeUniversityBoardCache = (
    universityId: string,
    university: { id: string; name: string; shortName: string; city: string; type: 'public' | 'private' },
    posts: Post[]
  ) => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(
        getUniversityCacheKey(universityId),
        JSON.stringify({ university, posts, cachedAt: Date.now() })
      )
    } catch {
      // ignore quota / serialization errors
    }
  }

  const hydrateUniversityBoardFromCache = (universityId: string) => {
    const cached = readUniversityBoardCache(universityId)
    if (!cached) return false

    setShowUniversityBoard(true)
    setShowPostDetail(false)
    setSelectedPostId(null)
    setPostSource(null)
    setPostSourceUniversityId(null)
    setPostSourceTab(null)
    setSelectedUniversity(cached.university)
    setUniversityPosts(cached.posts || [])
    setUniversityPostsLoaded(prev => ({ ...prev, [universityId]: true }))
    setUniversityLoading(false)
    return true
  }

  const refreshUniversityBoard = async (universityId: string, showLoading: boolean) => {
    if (status === 'loading') return
    if (status === 'unauthenticated' || !session) return

    // Cancel any previous background refresh for university board
    if (universityRefreshAbortControllerRef.current) {
      universityRefreshAbortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    universityRefreshAbortControllerRef.current = abortController

    if (showLoading) {
      setUniversityLoading(true)
    } else {
      setIsUniversityRefreshing(true)
    }

    // Set selectedUniversity synchronously from cache to stabilize UI
    const cachedMeta = getUniversityMetaFromCaches(universityId)
    if (cachedMeta) setSelectedUniversity(cachedMeta)
    setBaseTabTitle()

    try {
      // Start both requests immediately, but apply university name ASAP (tab title consistency)
      const universityFetch = fetch(`/api/universities/${universityId}`, { signal: abortController.signal })
      const postsFetch = fetch(`/api/universities/${universityId}/posts`, { signal: abortController.signal })

      const universityResponse = await universityFetch
      let uniObjForCache:
        | { id: string; name: string; shortName: string; city: string; type: 'public' | 'private' }
        | null = null

      if (universityResponse.ok) {
        const university = await universityResponse.json()
        const uniObj = {
          id: university.id,
          name: university.name,
          shortName: university.shortName,
          city: university.city,
          type: university.type,
        } as const
        uniObjForCache = uniObj
        setSelectedUniversity(uniObj)
        setBaseTabTitle()
      }

      const postsResponse = await postsFetch
      if (!postsResponse.ok) return
      const posts = await postsResponse.json()

      // Preload first visible images so UI appears "all at once" after loader
      const firstImageUrls = (posts || [])
        .filter((p: any) => !!p?.image)
        .slice(0, 6)
        .map((p: any) => p.image as string)
      await preloadImages(firstImageUrls, 1200)

      // If user switched boards mid-refresh, don't overwrite the visible board.
      if (latestUniversityRequestRef.current && latestUniversityRequestRef.current !== universityId) {
        return
      }

      setUniversityPosts(posts)
      setUniversityPostsLoaded(prev => ({ ...prev, [universityId]: true }))

      // Update cache when we have both uni + posts (uni might have been set above)
      if (uniObjForCache?.id === universityId) {
        writeUniversityBoardCache(universityId, uniObjForCache, posts)
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      console.error('Error refreshing university board:', error)
    } finally {
      setIsUniversityRefreshing(false)
      setUniversityLoading(false)
    }
  }

  // Reset carousel index when userActivity changes
  useEffect(() => {
    if (userActivity) {
      setMyPostsIndex(0)
      setCommentedPostsIndex(0)
    }
  }, [userActivity?.userPosts.length, userActivity?.postsWithUserComments.length])

  // Keep tab title stable as "Zuni" (Next.js may re-apply metadata).
  useEffect(() => {
    if (typeof document === 'undefined') return
    const titleEl = document.querySelector('title')
    if (!titleEl) return
    const observer = new MutationObserver(() => setBaseTabTitle())
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true })
    setBaseTabTitle()
    return () => observer.disconnect()
  }, [])

  // Control splash screen minimum display time
  useEffect(() => {
    // On initial load, show splash screen even if postId or universityParam exists (refresh case)
    // But if navigating programmatically (state change), don't show splash
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 1000) // Show splash for at least 1 second

    return () => clearTimeout(timer)
  }, []) // Only run on mount, not on postId/universityParam changes

  // Sync postSource with URL parameters when they change (handles navigation without refresh)
  // Note: Initial values are set synchronously in useState initialization above
  // This useEffect only handles updates when URL changes without page refresh
  useEffect(() => {
    if (isNavigatingBack) return
    
    // Read from searchParams directly
    const urlPostId = searchParams.get('post')
    const urlUniversityParam = searchParams.get('university')
    
    // Only update if URL has changed and postSource doesn't match
    // This handles cases where user navigates via URL without page refresh
    if (urlPostId) {
      const expectedSource = urlUniversityParam ? 'university' : 'main'
      if (postSource !== expectedSource) {
        setPostSource(expectedSource)
        setPostSourceUniversityId(urlUniversityParam || null)
        console.log('📌 Updated postSource from URL:', expectedSource, urlUniversityParam)
      }
    }
  }, [searchParams, isNavigatingBack, postSource]) // Sync with URL changes

  // Mark post as viewed when opened via URL parameters
  useEffect(() => {
    // Skip if we're navigating back (to prevent re-triggering and re-opening the post)
    if (isNavigatingBack) return
    
    // CRITICAL: Double-check URL to ensure postId is actually in the URL
    // This prevents re-opening after "Geri Dön" when URL was cleared
    const currentUrlParams = new URLSearchParams(window.location.search)
    const actualPostIdInUrl = currentUrlParams.get('post')
    
    // Only proceed if:
    // 1. postId from searchParams exists
    // 2. URL actually has the post parameter (defensive check)
    // 3. Data is loaded
    if (postId && postId === actualPostIdInUrl && (posts.length > 0 || allPosts.length > 0 || (universityPosts && universityPosts.length > 0))) {
      // Skip showing post detail if already showing the same post (prevents re-opening after navigation)
      // BUT still update timestamp on refresh (don't skip timestamp update)
      const shouldShowPostDetail = !showPostDetail || selectedPostId !== postId
      // Set post source based on current view state or URL parameter (if not already set)
      // IMPORTANT: Only set if postSource is null - don't override existing value
      // This prevents losing the source after commenting or other state updates
      if (!postSource) {
        // Priority 1: Check if university parameter is in URL (from create-post redirect)
        if (universityParam) {
          setPostSource('university')
          setPostSourceUniversityId(universityParam)
          // DON'T call handleUniversityClick here - it would switch away from post detail
          // Just store the university ID for "Geri Dön" navigation
          // The university board will load when user clicks "Geri Dön"
        } else {
          // Priority 2: Use current view state
          const source = showUniversityBoard ? 'university' : 'main'
          setPostSource(source)
          
          // If opened from university board via URL, store the university ID
          if (source === 'university' && selectedUniversity?.id) {
            setPostSourceUniversityId(selectedUniversity.id)
          }
        }
      }
      // If postSource is already set, ensure postSourceUniversityId is also set if we have universityParam
      else if (postSource === 'university' && universityParam && !postSourceUniversityId) {
        setPostSourceUniversityId(universityParam)
      }
      
      // Show post detail when opened via URL (only if not already showing)
      // This prevents re-opening after navigation
      if (shouldShowPostDetail) {
        setSelectedPostId(postId)
        setShowPostDetail(true)
      }
      
      // Mark post as viewed and save to database
      setViewedPosts(prev => {
        const newSet = new Set(Array.from(prev).concat(postId))
        return newSet
      })
      
      // CRITICAL: ALWAYS update view timestamp when post is in URL (including on refresh)
      // This ensures that when user refreshes post details and sees all comments (including new ones),
      // the timestamp is updated to reflect their current viewing time
      // On refresh, this will update the timestamp even if showPostDetail is already true
      if (session?.user?.id && session?.user?.email) {
        const currentTimestamp = new Date().toISOString()
        
        // Update local state immediately (synchronously)
        // This happens on both initial open AND refresh
        setPostViewTimestamps(prev => {
          const newMap = new Map(prev)
          newMap.set(postId, currentTimestamp)
          // Also save to localStorage as backup
          const userKey = `postViewTimestamps_${session.user.email}`
          localStorage.setItem(userKey, JSON.stringify(Array.from(newMap.entries())))
          console.log(`Updated view timestamp for post ${postId} (refresh: ${!shouldShowPostDetail}): ${currentTimestamp}`)
          return newMap
        })
        
        // Then save to database (async, non-blocking)
        const markPostAsRead = async () => {
          try {
            const response = await fetch(`/api/posts/${postId}/mark-read`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            
            if (response.ok) {
              console.log('Post marked as read in database')
            }
          } catch (error) {
            console.error('Error marking post as read:', error)
            // Error is okay - local state already updated, so badge will still work
          }
        }
        
        markPostAsRead()
      }
    }
  }, [postId, posts, allPosts, universityPosts, session?.user?.id, showUniversityBoard, postSource, isNavigatingBack, universityParam, showPostDetail, selectedPostId])

  // Additional effect to mark user's own posts as viewed immediately
  useEffect(() => {
    if (postId && session?.user?.id && session?.user?.email && (posts.length > 0 || allPosts.length > 0 || (universityPosts && universityPosts.length > 0))) {
      const allPostsList = [...posts, ...allPosts, ...(universityPosts || [])]
      const post = allPostsList.find(p => p.id === postId)
      
      // If this is the user's own post, mark it as viewed immediately
      if (post && post.author.email === session.user.email) {
        setViewedPosts(prev => {
          const newSet = new Set(Array.from(prev).concat(postId))
          return newSet
        })
        
        // CRITICAL: Update view timestamp IMMEDIATELY in local state (before API call)
        // This ensures the timestamp is available on refresh
        const currentTimestamp = new Date().toISOString()
        
        // Update local state immediately (synchronously)
        setPostViewTimestamps(prev => {
          const newMap = new Map(prev)
          newMap.set(postId, currentTimestamp)
          // Also save to localStorage as backup
          const userKey = `postViewTimestamps_${session.user.email}`
          localStorage.setItem(userKey, JSON.stringify(Array.from(newMap.entries())))
          return newMap
        })
        
        // Then save to database (async, non-blocking)
        const markOwnPostAsRead = async () => {
          try {
            const response = await fetch(`/api/posts/${postId}/mark-read`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            
            if (response.ok) {
              console.log('Own post marked as read in database')
            }
          } catch (error) {
            console.error('Error marking own post as read:', error)
            // Error is okay - local state already updated
          }
        }
        
        markOwnPostAsRead()
      }
    }
  }, [postId, session?.user?.id, session?.user?.email, posts, allPosts, universityPosts, showPostDetail, isNavigatingBack, postSource, universityParam, showUniversityBoard, selectedUniversity])

  // Load viewed posts from database on component mount
  useEffect(() => {
    const loadReadPosts = async () => {
      if (session?.user?.id && session?.user?.email) {
        // First, try to load from localStorage (fast, synchronous)
        // This ensures timestamps are available immediately on refresh
        const userKey = `postViewTimestamps_${session.user.email}`
        const savedTimestamps = localStorage.getItem(userKey)
        if (savedTimestamps) {
          try {
            const parsed = JSON.parse(savedTimestamps)
            const localStorageMap = new Map<string, string>(parsed)
            // Set immediately from localStorage (no waiting for API)
            setPostViewTimestamps(localStorageMap)
            console.log('Loaded postViewTimestamps from localStorage:', localStorageMap.size, 'posts')
          } catch (error) {
            console.error('Error parsing postViewTimestamps from localStorage:', error)
          }
        }
        
        // Then load from database (to get latest data, but don't overwrite if localStorage has newer data)
        try {
          const response = await fetch('/api/user/read-posts')
          if (response.ok) {
            const readPostsData = await response.json()
            // Convert the response to Map format
            const databaseMap = new Map<string, string>(Object.entries(readPostsData as Record<string, string>))
            
            // Merge with localStorage data, preferring the newer timestamp
            setPostViewTimestamps(prev => {
              const mergedMap = new Map(prev)
              databaseMap.forEach((dbTimestamp, postId) => {
                const localTimestamp = prev.get(postId)
                // Use the newer timestamp (more recent = larger ISO string)
                if (!localTimestamp || dbTimestamp > localTimestamp) {
                  mergedMap.set(postId, dbTimestamp)
                } else {
                  mergedMap.set(postId, localTimestamp)
                }
              })
              
              // Save merged data back to localStorage
              localStorage.setItem(userKey, JSON.stringify(Array.from(mergedMap.entries())))
              
              return mergedMap
            })
            
            console.log('Loaded postViewTimestamps from database and merged:', databaseMap.size, 'posts')
          }
        } catch (error) {
          console.error('Error loading read posts from database:', error)
          // If database load fails, localStorage data is still available
        }
      }
    
      // Load user-specific userJustCommented from localStorage (still needed for comment tracking)
      if (session?.user?.email) {
        const userJustCommentedKey = `userJustCommented_${session.user.email}`
        const savedUserJustCommented = localStorage.getItem(userJustCommentedKey)
        if (savedUserJustCommented) {
          try {
            const parsed = JSON.parse(savedUserJustCommented)
            setUserJustCommented(new Set(parsed))
            console.log(`Loaded userJustCommented from localStorage:`, Array.from(parsed))
          } catch (error) {
            console.error('Error parsing userJustCommented from localStorage:', error)
          }
        }
      }
    }

    loadReadPosts()
  }, [session?.user?.id, session?.user?.email])

  // DON'T initialize timestamps for posts when first loaded
  // Timestamps should only be set when user actively views a post
  // This way, if a post has comments, the badge will show red until user views it

  useEffect(() => {
    if (status === "loading") return
    
    // Only fetch data if user is authenticated
    if (session) {
      fetchData(true) // Show loading on initial load
    } else {
      setLoading(false)
      setUniversityLoading(false)
    }
  }, [session, status, router])

  // Handle URL parameters for university redirects (handles refresh case and navigation from handleGoBack)
  // This runs after session is ready and data is loaded
  useEffect(() => {
    // CRITICAL: Allow this to run even during navigation IF we're showing university board
    // This ensures the component reacts to URL changes immediately
    // Only block if we're navigating back AND not showing university board (prevents interference)
    if (isNavigatingBack && !showUniversityBoard && !postId) {
      // We're navigating away, but not to university board - skip
      return
    }
    
    // Wait for session to be ready
    if (status === "loading") return
    if (!session) return // Don't load university board if not authenticated
    
    // Check if we're navigating from create-post page (skip loading wait)
    const navigatingFromCreatePost = typeof window !== 'undefined' 
      ? sessionStorage.getItem('navigatingToUniversity')
      : null
    
    const urlParams = new URLSearchParams(window.location.search)
    const universityIdFromUrl = urlParams.get('university')

    // If we're landing directly on a university board (refresh / deep link),
    // DON'T wait for main feed loading — load the board immediately in parallel.
    if (!navigatingFromCreatePost && loading && !universityIdFromUrl) return
    
    // Clear the navigation flag if it matches
    if (navigatingFromCreatePost && universityIdFromUrl === navigatingFromCreatePost) {
      sessionStorage.removeItem('navigatingToUniversity')
    }
    
    // Only handle university redirect if:
    // 1. There's a university parameter in URL
    // 2. We're not showing a post detail view
    // 3. We're not navigating back (prevents state conflicts and data refresh)
    // 4. We haven't already loaded the university board data (avoid duplicate loads)
    if (universityIdFromUrl && !postId && !isNavigatingBack) {
      const wasAlreadyShowingThisUniversity =
        showUniversityBoard && selectedUniversity?.id === universityIdFromUrl

      // If we're already showing this university board, don't refresh data
      // This prevents posts from reordering when going back
      if (wasAlreadyShowingThisUniversity) {
        // Already showing this university - don't refresh
        return
      }
      
      // Ensure university board is shown immediately
      setShowUniversityBoard(true)

      // Always show the 3-dot loader on refresh/deep-link, then reveal everything together
      refreshUniversityBoard(universityIdFromUrl, true)
    }
  }, [postId, status, session, loading, showUniversityBoard, selectedUniversity, isNavigatingBack, universityLoading])


  // Handle browser back/forward buttons and two-finger swipe gestures
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href)
      const path = url.pathname
      const searchParams = url.searchParams
      const postParam = searchParams.get('post')
      const universityParam = searchParams.get('university')
      
      // Set navigating back flag to prevent useEffect from interfering
      setIsNavigatingBack(true)
      // Keep tab title constant
      setBaseTabTitle()

      // If we're leaving post detail back to a list, hide content until scroll is restored
      if (!postParam && shouldRestoreMainScrollOnBackRef.current) {
        setIsRestoringMainScroll(true)
      }
      
      if (path === '/') {
        if (postParam) {
          // Going back to a post detail view
          setSelectedPostId(postParam)
          setShowPostDetail(true)
          // Ensure post detail starts from top (not prior list scroll position)
          requestAnimationFrame(() => {
            try {
              mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
            } catch {
              if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0
              window.scrollTo(0, 0)
            }
          })
          if (universityParam) {
            setPostSource('university')
            setPostSourceUniversityId(universityParam)
          } else {
            setPostSource('main')
          }
        } else if (universityParam) {
          // Going back to a university board
          // Always restore university board state, even if it's the same university
          // This ensures the board is shown when swiping back from post detail
          setShowUniversityBoard(true)
          setShowPostDetail(false)
          setSelectedPostId(null)
          
          // Handle university board restoration
          // Only show auth modal if we're sure user is unauthenticated (not loading)
          if (status === 'authenticated' && session) {
            if (universityParam !== selectedUniversity?.id) {
              // Different university - load it
              handleUniversityClick(universityParam)
            } else if (selectedUniversity) {
              // Same university - just ensure board is visible
              // Don't reload data to prevent posts from reordering
                setUniversityLoading(false)
              } else {
              // University not loaded - load it
              handleUniversityClick(universityParam)
            }
          } else if (status === 'unauthenticated') {
            // User is not authenticated - show auth modal
            setShowAuthModal(true)
          }
          // If status is still loading, restore state but don't load data yet
          // The useEffect will handle loading when session is ready

          // Restore list scroll position when returning from post detail
          if (shouldRestoreMainScrollOnBackRef.current) {
            const top = lastMainScrollTopRef.current
            requestAnimationFrame(() => {
              try {
                mainScrollRef.current?.scrollTo({ top, left: 0, behavior: 'auto' })
              } catch {
                if (mainScrollRef.current) mainScrollRef.current.scrollTop = top
              }
              setIsRestoringMainScroll(false)
              shouldRestoreMainScrollOnBackRef.current = false
            })
          }
        } else {
          // Going back to main page
          // Only update state, don't trigger full reload
        setShowUniversityBoard(false)
        setShowPostDetail(false)
        setSelectedPostId(null)
        setSelectedUniversity(null)
        setUniversityPosts([])
        setUniversityPostsLoaded({})
        
          // Restore the tab user was on when they opened the post
          // If postSourceTab is set, restore it; otherwise default to "Aktiviteler"
          if (postSourceTab) {
            setActiveTab(postSourceTab)
            localStorage.setItem('activeTab', postSourceTab)
          } else {
            // Only reset to "Aktiviteler" if we don't have a stored tab
            setActiveTab('my-activity')
            localStorage.setItem('activeTab', 'my-activity')
          }
          
          setPostSource(null)
          setPostSourceUniversityId(null)
          setPostSourceTab(null)
          
          // Don't refresh posts data when going back to prevent reordering
          // Posts are already loaded and visible

          // Restore list scroll position when returning from post detail
          if (shouldRestoreMainScrollOnBackRef.current) {
            const top = lastMainScrollTopRef.current
            requestAnimationFrame(() => {
              try {
                mainScrollRef.current?.scrollTo({ top, left: 0, behavior: 'auto' })
              } catch {
                if (mainScrollRef.current) mainScrollRef.current.scrollTop = top
              }
              setIsRestoringMainScroll(false)
              shouldRestoreMainScrollOnBackRef.current = false
            })
          }
        }
      } else if (path.startsWith('/university/')) {
        const universityId = path.split('/')[2]
        // Restore university board state
        if (universityId) {
          setShowUniversityBoard(true)
          setShowPostDetail(false)
          setSelectedPostId(null)
          
          // Only load data if session is ready
          if (universityId !== selectedUniversity?.id && status === 'authenticated' && session) {
            handleUniversityClick(universityId)
          } else if (status === 'unauthenticated') {
            // User is not authenticated - show auth modal
            setShowAuthModal(true)
          }
          // If status is still loading, state is restored and useEffect will handle loading

          // Restore list scroll position when returning from post detail
          if (shouldRestoreMainScrollOnBackRef.current) {
            const top = lastMainScrollTopRef.current
            requestAnimationFrame(() => {
              try {
                mainScrollRef.current?.scrollTo({ top, left: 0, behavior: 'auto' })
              } catch {
                if (mainScrollRef.current) mainScrollRef.current.scrollTop = top
              }
              setIsRestoringMainScroll(false)
              shouldRestoreMainScrollOnBackRef.current = false
            })
          }
        }
      }
      
      // Clear navigating back flag after a short delay
      setTimeout(() => {
        setIsNavigatingBack(false)
      }, 100)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedUniversity, status, session, postSourceTab])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showSortDropdown && !target.closest('.sort-dropdown')) {
        setShowSortDropdown(false)
      }
    }

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSortDropdown])

  // Debug sorting
  useEffect(() => {
    if (universityPosts.length > 0) {
      console.log('Sorting posts by:', sortBy)
      const sortedPosts = [...universityPosts].sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        } else {
          const aComments = a._count?.comments || 0
          const bComments = b._count?.comments || 0
          console.log(`Post "${a.title}": ${aComments} comments`)
          console.log(`Post "${b.title}": ${bComments} comments`)
          return bComments - aComments
        }
      })
      console.log('Sorted posts:', sortedPosts.map(p => ({ title: p.title, comments: p._count?.comments || 0 })))
    }
  }, [sortBy, universityPosts])

  const fetchSubscribedPosts = async () => {
    if (!session) return
    try {
      const res = await fetch("/api/user/subscribed-posts")
      if (res.ok) {
        const data = await res.json()
        setPosts(data)
      } else {
        console.error('fetchSubscribedPosts: Failed', res.status)
      }
    } catch (e) {
      console.error('fetchSubscribedPosts: Error', e)
    } finally {
      setSubscribedPostsLoaded(true)
    }
  }

  const fetchAllPosts = async () => {
    if (!session) return
    try {
      const res = await fetch("/api/posts")
      if (res.ok) {
        const data = await res.json()
        setAllPosts(data)
      } else {
        console.error('fetchAllPosts: Failed', res.status)
      }
    } catch (e) {
      console.error('fetchAllPosts: Error', e)
    } finally {
      setAllPostsLoaded(true)
    }
  }

  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      console.log('fetchData: Starting to fetch all data...')
      
      // OPTIMIZED: Start all fetches in parallel, but set userActivity immediately when ready
      // This makes "Gönderilerim" and "Yorumlarım" appear as fast as university board
      const activityPromise = fetch("/api/user/activity").then(async (response) => {
        if (response.ok) {
          const activityData = await response.json()
          // Set immediately - don't wait for other data
        setUserActivity(activityData)
          console.log('fetchData: User activity updated (immediate)')
      } else {
          console.error('fetchData: Failed to load user activity', response.status)
        }
      }).catch(error => {
        console.error('fetchData: Error loading user activity', error)
      })
      
      // Only fetch the active tab’s dataset on initial refresh to maximize speed.
      // Other tabs will lazy-load when the user switches to them.
      const promises: Promise<any>[] = [activityPromise]
      if (activeTab === 'subscribed') {
        setSubscribedPostsLoaded(false)
        promises.push(fetchSubscribedPosts())
      }
      if (activeTab === 'trending') {
        setAllPostsLoaded(false)
        promises.push(fetchAllPosts())
      }

      await Promise.all(promises)
      
      // If we're currently viewing a university board, also fetch its posts
      if (selectedUniversity) {
        const universityResponse = await fetch(`/api/universities/${selectedUniversity.id}/posts`)
        if (universityResponse.ok) {
          const universityData = await universityResponse.json()
          setUniversityPosts(universityData)
          console.log(`fetchData: University posts updated for ${selectedUniversity.name}`)
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      // Always clear loading state when done (whether it was set or not)
      // This ensures posts render immediately after data is fetched
      setLoading(false)
    }
  }

  // Lazy-load tab data when user switches tabs (don’t refetch if already loaded)
  useEffect(() => {
    if (!session || status !== 'authenticated') return
    if (activeTab === 'subscribed' && !subscribedPostsLoaded) {
      setSubscribedPostsLoaded(false)
      fetchSubscribedPosts()
    }
    if (activeTab === 'trending' && !allPostsLoaded) {
      setAllPostsLoaded(false)
      fetchAllPosts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, session, status])

  const handleSignOut = async () => {
    const { signOut } = await import("next-auth/react")
    const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : "/"
    signOut({ callbackUrl })
  }

  const handlePostClick = (postId: string) => {
    // Track where the post was opened from
    // If we're on main page (not showing university board), source is 'main'
    // If we're showing a university board, source is 'university'
    const source = showUniversityBoard ? 'university' : 'main'
    setPostSource(source)
    
    // Store the current active tab so we can restore it when going back
    if (source === 'main') {
      setPostSourceTab(activeTab)
    } else {
      // If from university board, no tab to restore (will go back to university board)
      setPostSourceTab(null)
    }
    
    // If we're on a university board, store the university ID for back navigation
    let universityIdToStore = null
    if (source === 'university' && selectedUniversity?.id) {
      universityIdToStore = selectedUniversity.id
      setPostSourceUniversityId(universityIdToStore)
    } else {
      setPostSourceUniversityId(null)
    }
    
    // Update both states simultaneously to prevent glitch
    setSelectedPostId(postId)
    setShowPostDetail(true)

    // Save current list scroll position so back returns to where user left off
    lastMainScrollTopRef.current = mainScrollRef.current?.scrollTop ?? 0
    shouldRestoreMainScrollOnBackRef.current = true

    // Mobile: ensure post detail opens from top (not current list scroll position)
    // We scroll the main scroll container (not the window) because the app uses an inner overflow container.
    requestAnimationFrame(() => {
      try {
        mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      } catch {
        // Fallbacks for older browsers / edge cases
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0
        window.scrollTo(0, 0)
      }
    })
    
    // Update URL using router.push to create history entry for back navigation
    // State is already updated above, so this just updates the URL
    // CRITICAL: Include university parameter if opened from university board
    const newUrl = source === 'university' && universityIdToStore
      ? `/?post=${postId}&university=${universityIdToStore}`
      : `/?post=${postId}`
    
    // Use router.push to create history entry so back gesture works
    // Since state is already updated, this should be seamless
    router.push(newUrl, { scroll: false })

    // Keep tab title constant
    setBaseTabTitle()
    
    // Mark post as viewed and save to localStorage
    setViewedPosts(prev => {
      const newSet = new Set(Array.from(prev).concat(postId))
      localStorage.setItem('viewedPosts', JSON.stringify(Array.from(newSet)))
      return newSet
    })
    
    // Remove from "user just commented" set since they're now viewing the post
    if (session?.user?.email) {
      const userJustCommentedKey = `userJustCommented_${session.user.email}`
      setUserJustCommented(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        console.log(`Removed post ${postId} from userJustCommented set`)
        // Persist to localStorage
        localStorage.setItem(userJustCommentedKey, JSON.stringify(Array.from(newSet)))
        return newSet
      })
    }
    
    // Save the timestamp when user views this post
    if (session?.user?.email) {
      const userKey = `postViewTimestamps_${session.user.email}`
      
      // Find the post to check if current user is the author
      const allPostsList = [...posts, ...allPosts, ...(universityPosts || [])]
      const post = allPostsList.find(p => p.id === postId)
      
      // Only update view timestamp if user is NOT the post author
      // Post author's view timestamp should remain as post creation time
      if (!post || session.user.email !== post.author.email) {
        const currentTimestamp = new Date().toISOString()
        
        setPostViewTimestamps(prev => {
          const newMap = new Map(prev)
          // Update to current timestamp to mark when user viewed the post
          newMap.set(postId, currentTimestamp)
          localStorage.setItem(userKey, JSON.stringify(Array.from(newMap.entries())))
          console.log(`User viewed post ${postId}, saved view timestamp: ${currentTimestamp}`)
          return newMap
        })
      } else {
        console.log(`Post author ${session.user.email} viewed their own post ${postId}, keeping original view timestamp`)
      }
    }
  }

  const handleGoBack = (universityId?: string, shouldRefresh?: boolean) => {
    // Get values before clearing state
    const currentPostId = postId || selectedPostId
    
    // Read directly from URL FIRST (most reliable source on refresh)
    // This ensures we have correct context even if state hasn't initialized properly
    const urlSearchParams = new URLSearchParams(window.location.search)
    const urlUniversityParam = urlSearchParams.get('university')
    const urlPostId = urlSearchParams.get('post')
    
    // Determine source from URL if state isn't ready (refresh case)
    // Priority: URL (most reliable) > state > function param
    let source = postSource
    let sourceUniId = postSourceUniversityId
    
    // If state is null but we have URL params, determine source from URL
    if (!source && urlPostId) {
      source = urlUniversityParam ? 'university' : 'main'
      sourceUniId = urlUniversityParam || null
      console.log('📌 Determined source from URL in handleGoBack:', source, sourceUniId)
    }
    
    // Priority: function param (from post data) > state > URL search params
    const urlUniversityId = universityId || sourceUniId || urlUniversityParam || universityParam
    
    // Set flag to prevent useEffect from re-triggering
    // CRITICAL: Set this FIRST to prevent any useEffect from running during navigation
    setIsNavigatingBack(true)
    
    // Immediately clear post detail state BEFORE navigation
    // This ensures the view switches immediately
    // Hide the list briefly so we can restore scroll without a visible "jump to top"
    if (shouldRestoreMainScrollOnBackRef.current) {
      setIsRestoringMainScroll(true)
    }
    setShowPostDetail(false)
    setSelectedPostId(null)
    setPostSource(null)
    setPostSourceUniversityId(null)
    
      // Navigate to appropriate board
      if (currentPostId) {
      // Mark the post as viewed before going back (especially important for newly created posts)
      setViewedPosts(prev => {
          const newSet = new Set(Array.from(prev).concat(currentPostId))
        localStorage.setItem('viewedPosts', JSON.stringify(Array.from(newSet)))
        return newSet
      })
      
        // CRITICAL: Update view timestamp when going back
        // When user goes back, they've just finished viewing the post and all comments
        // This ensures that any comments they saw won't trigger a red badge
        // The timestamp should represent when user LAST VIEWED the post, not when they opened it
        if (session?.user?.email) {
          const currentTimestamp = new Date().toISOString()
          setPostViewTimestamps(prev => {
            const newMap = new Map(prev)
            newMap.set(currentPostId, currentTimestamp)
            // Save to localStorage immediately
            const userKey = `postViewTimestamps_${session.user.email}`
            localStorage.setItem(userKey, JSON.stringify(Array.from(newMap.entries())))
            console.log(`Updated view timestamp for post ${currentPostId} when going back: ${currentTimestamp}`)
            return newMap
          })
          
          // Also update in database (async, non-blocking)
          fetch(`/api/posts/${currentPostId}/mark-read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }).catch(error => {
            console.error('Error updating read timestamp on go back:', error)
            // Error is okay - local state already updated
          })
        }
      
      // Remove from "user just commented" set when going back
      // This allows the badge to turn red if new comments are added
      if (session?.user?.email) {
        const userJustCommentedKey = `userJustCommented_${session.user.email}`
        setUserJustCommented(prev => {
          const newSet = new Set(prev)
          newSet.delete(currentPostId)
          localStorage.setItem(userJustCommentedKey, JSON.stringify(Array.from(newSet)))
          console.log(`Removed post ${currentPostId} from userJustCommented when going back`)
          return newSet
        })
      }
      
      // Use browser back navigation to go back through history
      // This allows two-finger swipe back gesture to work properly
      // The popstate handler will restore the correct state based on URL
      // NOTE: We don't refresh data here to prevent posts from reordering
      // Set tab title immediately so it doesn't flash old post title.
      // If user opened post from main, back should show "Zuni" on main screen.
      if (source === 'main') {
        setBaseTabTitle()
      }
      window.history.back()
          } else {
      // If no postId, use browser back to go through history
      window.history.back()
      
      // Clear the navigating flag after a short delay
      setTimeout(() => {
        setIsNavigatingBack(false)
      }, 100)
    }
  }

  const handleCommentAdded = () => {
    const currentPostId = selectedPostId || postId
    
    // Add this post to the "user just commented" set to prevent red badge
    if (currentPostId && session?.user?.email) {
      const userJustCommentedKey = `userJustCommented_${session.user.email}`
      setUserJustCommented(prev => {
        const newSet = new Set(prev)
        newSet.add(currentPostId)
        // Persist to localStorage
        localStorage.setItem(userJustCommentedKey, JSON.stringify(Array.from(newSet)))
        console.log(`User added comment to post ${currentPostId}`)
        return newSet
      })
      
      // Update the view timestamp to current time since user just interacted with the post
      const userKey = `postViewTimestamps_${session.user.email}`
      const currentTimestamp = new Date().toISOString()
      
      setPostViewTimestamps(prev => {
        const newMap = new Map(prev)
        newMap.set(currentPostId, currentTimestamp)
        localStorage.setItem(userKey, JSON.stringify(Array.from(newMap.entries())))
        console.log(`Updated view timestamp for post ${currentPostId} after comment`)
        return newMap
      })
    }
    
    // Try to refresh data, but don't rely on it
    // Don't show loading state to prevent UI flash
    if (session) {
      fetchData(false).catch(error => {
        console.log('Data refresh failed:', error)
      })
    }
  }


  const handleTabChange = (tab: 'my-activity' | 'subscribed' | 'trending') => {
    setActiveTab(tab)
    localStorage.setItem('activeTab', tab)
  }

  const handleUniversityClick = async (
    universityId: string,
    options?: { forceReload?: boolean }
  ) => {
    // Close mobile menu when clicking a board (mobile only)
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }

    // Check if session is still loading - wait for it
    if (status === 'loading') {
      return
    }

    // Check if user is authenticated - show modal if not
    // Only check after session status is resolved
    if (status === 'unauthenticated' || !session) {
      setShowAuthModal(true)
      return
    }

    // If user clicks the same university while in post detail, just return to the board
    // without refetching/reloading (mobile app feeling).
    if (selectedUniversity?.id === universityId && !options?.forceReload) {
      // If we're currently in post detail (or board hidden), restore board view immediately.
      if (showPostDetail || !showUniversityBoard) {
        setIsNavigatingBack(true)
        setShowUniversityBoard(true)
        setShowPostDetail(false)
        setSelectedPostId(null)
        setPostSource(null)
        setPostSourceUniversityId(null)
        setPostSourceTab(null)
        setUniversityLoading(false)

        // Ensure URL points to the board (but don't create duplicate history entry if already there)
        const targetUrl = `/?university=${universityId}`
        if (typeof window !== 'undefined' && window.location.search.includes('post=')) {
          router.push(targetUrl, { scroll: false })
        }

        setTimeout(() => setIsNavigatingBack(false), 100)
      }

      console.log('✅ Same university clicked; restored board without reload')
      return
    }

    // If already showing this university board, don't reload unless explicitly forced
    if (
      showUniversityBoard &&
      selectedUniversity?.id === universityId &&
      !universityLoading &&
      !options?.forceReload
    ) {
      console.log('✅ Already showing this university board, skipping reload')
      return
    }

    // Prevent duplicate requests for the same university
    if (isRequestInProgressRef.current && latestUniversityRequestRef.current === universityId) {
      console.log('⚠️ Request already in progress for this university, ignoring duplicate click')
      return
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Track this as the latest request
    latestUniversityRequestRef.current = universityId
    isRequestInProgressRef.current = true

    // Set navigation flag to prevent useEffect interference
    setIsNavigatingBack(true)

    // University boards should not affect tab title
    setBaseTabTitle()

    // Clear ALL state immediately (before async operations)
    // This prevents old state from being used when rapidly clicking different universities
    setShowUniversityBoard(true)
    setShowPostDetail(false)
    setSelectedPostId(null)
    setPostSource(null)
    setPostSourceUniversityId(null)
    setPostSourceTab(null)
    setUniversityPosts([])
    setUniversityPostsLoaded(prev => ({ ...prev, [universityId]: false }))
    setUniversityLoading(true)
    
    // Update URL using router.push to create history entry for back navigation
    // (Don't also call window.history.pushState — it can create duplicate entries)
    const newUrl = `/?university=${universityId}`
    
    // Also update Next.js router state (but don't trigger navigation)
    // This ensures searchParams updates correctly
    router.push(newUrl, { scroll: false })
    
    try {
      console.log(`🎯 Fetching university data for ID: ${universityId}`)
      
      // Start both fetches immediately, but apply university name ASAP (tab title consistency)
      const universityFetch = fetch(`/api/universities/${universityId}`, { signal: abortController.signal })
      const postsFetch = fetch(`/api/universities/${universityId}/posts`, { signal: abortController.signal })

      const universityResponse = await universityFetch
      const postsResponse = await postsFetch
      
      // Check if this is still the latest request (user might have clicked another university)
      if (latestUniversityRequestRef.current !== universityId) {
        console.log('⚠️ Ignoring stale response - newer request in progress')
        isRequestInProgressRef.current = false
        return
      }
      
      console.log('📊 University response status:', universityResponse.status)
      console.log('📊 Posts response status:', postsResponse.status)
      
      if (universityResponse.ok && postsResponse.ok) {
        const university = await universityResponse.json()
        const posts = await postsResponse.json()
        
        // Double-check this is still the latest request before setting state
        if (latestUniversityRequestRef.current !== universityId) {
          console.log('⚠️ Ignoring stale data - newer request completed first')
          isRequestInProgressRef.current = false
          return
        }
        
        console.log('✅ University data:', university)
        console.log('✅ Posts data:', posts.length, 'posts')
        
        setSelectedUniversity({
          id: university.id,
          name: university.name,
          shortName: university.shortName,
          city: university.city,
          type: university.type
        })

        // Preload first visible images so UI appears "all at once" after loader
        const firstImageUrls = (posts || [])
          .filter((p: any) => !!p?.image)
          .slice(0, 6)
          .map((p: any) => p.image as string)
        await preloadImages(firstImageUrls, 1200)

        // User may have clicked another university while we were preloading images.
        // Guard against stale responses overwriting the current board.
        if (latestUniversityRequestRef.current !== universityId) {
          console.log('⚠️ Skipping stale university posts update after preload')
          isRequestInProgressRef.current = false
          return
        }

        setUniversityPosts(posts)
        setUniversityPostsLoaded(prev => ({ ...prev, [universityId]: true }))
        writeUniversityBoardCache(universityId, {
          id: university.id,
          name: university.name,
          shortName: university.shortName,
          city: university.city,
          type: university.type
        }, posts)
      } else {
        // Only handle error if this is still the latest request
        if (latestUniversityRequestRef.current !== universityId) {
          isRequestInProgressRef.current = false
          return
        }
        
        // Get error details
        const universityError = universityResponse.ok ? null : await universityResponse.text()
        const postsError = postsResponse.ok ? null : await postsResponse.text()
        
        console.error('❌ Failed to fetch university data:', {
          universityStatus: universityResponse.status,
          universityError,
          postsStatus: postsResponse.status,
          postsError,
          universityId
        })
        setShowUniversityBoard(false)
      }
    } catch (error: any) {
      // Ignore abort errors (expected when canceling previous requests)
      if (error.name === 'AbortError') {
        console.log('🛑 Request aborted for university:', universityId)
        // Don't clear loading state here - the new request will handle it
        // But clear the in-progress flag if this was the latest request
        if (latestUniversityRequestRef.current === universityId) {
          isRequestInProgressRef.current = false
        }
        return
      }
      
      // Only handle error if this is still the latest request
      if (latestUniversityRequestRef.current !== universityId) {
        isRequestInProgressRef.current = false
        return
      }
      
      console.error('💥 Error fetching university data:', error)
      setShowUniversityBoard(false)
    } finally {
      // Always clear the in-progress flag
      if (latestUniversityRequestRef.current === universityId) {
        isRequestInProgressRef.current = false
      }
      
      // Only update loading state if this is still the latest request
      if (latestUniversityRequestRef.current === universityId) {
      setUniversityLoading(false)
      setIsRedirecting(false) // Clear redirecting state when done
        // Clear navigation flag after a delay to prevent useEffect from reloading old state
        // This ensures the new university data is fully loaded before allowing useEffect to run
      setTimeout(() => {
        setIsNavigatingBack(false)
        }, 500)
      } else {
        // If this is not the latest request, still clear loading to prevent endless loading
        // This handles the case where a request completes but is superseded
        setUniversityLoading(false)
      }
    }
  }

  const handleLogoClick = () => {
    // Set flag to prevent useEffect from re-triggering
    setIsNavigatingBack(true)
    
    // Reset to main page view (synchronously, before navigation)
    setShowUniversityBoard(false)
    setShowPostDetail(false)
    setSelectedPostId(null)
    setSelectedUniversity(null)
    setUniversityPosts([])
    setPostSource(null)
    setPostSourceUniversityId(null)
    setPostSourceTab(null)
    
    // Reset to "Aktiviteler" tab (main/default tab)
    setActiveTab('my-activity')
    localStorage.setItem('activeTab', 'my-activity')
    
    // Update URL without triggering navigation/reload
    // Use replaceState to avoid creating new history entry when clicking logo
    window.history.replaceState({}, '', '/')
    
    // Refresh posts data only (mobile app-like feeling - no full reload)
    // Don't show loading state to prevent UI flash
    if (session) {
      fetchData(false).catch(error => {
        console.log('Data refresh failed on logo click:', error)
      })
    }
    
    // Clear the navigating flag after a short delay
    setTimeout(() => {
      setIsNavigatingBack(false)
    }, 100)
  }




  // Show splash screen on initial load or when session is loading
  // But don't show when navigating programmatically to post details (state change)
  // Allow splash on refresh when postId exists in URL (initial load with post detail)
  if (status === "loading" || isRedirecting || isAuthenticating) {
    return <SplashScreen />
  }
  
  // Show splash screen on initial load (even if postId exists - refresh case)
  if (showSplash) {
    return <SplashScreen />
  }

  return (
    <div className="h-screen overflow-hidden" style={{backgroundColor: 'var(--bg-primary)'}}>
      {/* Header */}
      <header className={`brutal-header ${isMobile ? 'fixed top-0 left-0 right-0 z-50' : 'relative'}`}>
        <div className="w-full px-2 sm:px-4">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex-shrink-0">
              <button onClick={handleLogoClick} className="hover:opacity-80 transition-opacity">
                <Logo />
              </button>
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
                         className="p-2.5 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow"
                         style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
                         aria-label="Universities menu"
                       >
                         <Building2 className="h-5 w-5 text-black" style={{color: 'var(--text-primary)'}} />
                       </button>
                     )}
                    
                    {/* User Menu Button */}
                    <div className="relative">
                      <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2.5 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow transition-all duration-150"
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
                              handleSignOut()
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
                      className="p-2.5 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow"
                      style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
                      aria-label="Universities menu"
                    >
                      <Building2 className="h-5 w-5 text-black" style={{color: 'var(--text-primary)'}} />
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setAuthModalMode('signin')
                      setShowAuthModalCombined(true)
                    }}
                    className="px-4 py-2.5 font-bold text-sm transition-all hover:opacity-70"
                    style={{color: 'var(--text-primary)'}}
                  >
                    Giriş Yap
                  </button>
                  
                  <button
                    onClick={() => {
                      setAuthModalMode('signup')
                      setShowAuthModalCombined(true)
                    }}
                    className="px-6 py-2.5 border-2 border-black rounded-lg brutal-shadow-sm hover:brutal-shadow hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-2 text-sm font-bold text-black bg-gradient-to-r from-yellow-400 to-pink-500"
                  >
                    Kayıt Ol
                  </button>
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
      <div className={`flex ${isMobile ? 'absolute inset-0 top-14' : 'h-[calc(100vh-56px)] sm:h-[calc(100dvh-56px)]'}`}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <UniversitySidebar onUniversityClick={handleUniversityClick} />
        )}
        
        <div
          ref={mainScrollRef}
          className={`flex-1 ${isMobile ? 'overflow-y-auto h-full pb-0' : 'overflow-y-auto h-full'} ${isRestoringMainScroll ? 'invisible pointer-events-none' : ''}`}
          style={{backgroundColor: 'var(--bg-primary)'}}
        >
          {/* Mobile Universities Full Page - No Sliding */}
          {isMobile && isMobileMenuOpen ? (
            <div className="h-full flex flex-col" style={{backgroundColor: 'var(--bg-primary)'}}>
              {/* Mobile Universities Header */}
              <div className="bg-white border-b-4 border-black px-4 py-4 mobile-menu-header" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-black" style={{color: 'var(--text-primary)'}}>Üniversiteler</h1>
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
              <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-0">
                <UniversitySidebar onUniversityClick={handleUniversityClick} isMobile={true} />
              </div>
            </div>
          ) : (showPostDetail && (postId || selectedPostId)) ? (
            <PostDetailView postId={postId || selectedPostId || ''} onGoBack={handleGoBack} onCommentAdded={handleCommentAdded} onPostDeleted={fetchData} onUniversityClick={handleUniversityClick} />
          ) : (showUniversityBoard || (universityParam && !postId)) ? (
            <div className={`flex-1 ${isMobile ? 'h-full' : 'overflow-y-auto'}`}>
              <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-0 sm:py-8 flex flex-col ${isMobile ? 'h-full' : 'min-h-[calc(100vh-56px)]'}`}>
                <div className="flex-1">
                {/* University Posts */}
                {universityLoading ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <CustomSpinner size="lg" />
                  </div>
                ) : !session ? (
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12 rounded-xl border-2 border-black bg-white dark:bg-[#151515] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{borderColor: 'var(--border-color)'}}>
                      <Building2 className="h-12 w-12 mx-auto text-black dark:text-white mb-4" />
                      <h2 className="text-2xl font-display font-bold text-black dark:text-white mb-2">Giriş Yapın</h2>
                      <p className="text-base font-sans text-gray-600 dark:text-gray-300 mb-6">Bu üniversite panosunu görmek için giriş yapmanız gerekiyor.</p>
                      <div className="flex gap-4 justify-center">
                        <button 
                          onClick={() => {
                            setAuthModalMode('signin');
                            setShowAuthModalCombined(true);
                          }}
                          className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg border-2 border-black hover:-translate-y-0.5 transition-transform"
                        >
                          Giriş Yap
                        </button>
                        <button 
                          onClick={() => {
                            setAuthModalMode('signup');
                            setShowAuthModalCombined(true);
                          }}
                          className="px-6 py-2 bg-white dark:bg-black text-black dark:text-white font-bold rounded-lg border-2 border-black hover:-translate-y-0.5 transition-transform"
                        >
                          Kayıt Ol
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !selectedUniversity ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <CustomSpinner size="lg" />
                  </div>
                ) : universityPosts.length === 0 && !universityPostsLoaded[selectedUniversity.id] ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <CustomSpinner size="lg" />
                  </div>
                ) : universityPosts.length === 0 ? (
                  <div>
                    {/* University Header */}
                    <div className="mb-8">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="mb-2">
                              <h1 className="text-2xl sm:text-4xl font-display font-bold text-black tracking-tight" style={{color: 'var(--text-primary)'}}>{selectedUniversity.name}</h1>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-sm font-medium text-black" style={{color: 'var(--text-secondary)'}}>{selectedUniversity.city}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium border-2 border-black ${
                              selectedUniversity.type === 'public'
                                ? 'bg-green-300 text-black'
                                : 'bg-purple-300 text-black'
                            }`} style={{borderColor: 'var(--border-color)'}}>
                              {selectedUniversity.type === 'public' ? 'Devlet' : 'Vakıf'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center py-12 mb-6 sm:mb-0 sm:pb-12">
                      <Building2 className="h-16 w-16 mx-auto mb-4 text-black" style={{color: 'var(--text-primary)'}} />
                      <h3 className="text-xl font-black text-black mb-2" style={{color: 'var(--text-primary)'}}>Henüz gönderi yok</h3>
                      <p className="text-black font-medium mb-6" style={{color: 'var(--text-secondary)'}}>Bu üniversitede henüz hiç gönderi paylaşılmamış.</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedUniversity?.id) {
                            router.push(`/university/${selectedUniversity.id}/create-post`);
                          }
                        }}
                        className="px-6 py-3 bg-pink-300 text-black font-semibold border-2 border-black brutal-shadow-sm hover:brutal-shadow transition-all duration-150"
                        type="button"
                      >
                        İlk Gönderiyi Oluştur
                      </button>
                    </div>
                  </div>
                 ) : (
                   <div>
                     {/* University Header */}
                     <div className="mb-8">
                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                         <div className="flex-1">
                           <div className="mb-2">
                               <h1 className="text-2xl sm:text-4xl font-display font-bold text-black tracking-tight" style={{color: 'var(--text-primary)'}}>{selectedUniversity.name}</h1>
                           </div>
                           <div className="flex items-center gap-4 flex-wrap">
                             <span className="text-sm font-medium text-black" style={{color: 'var(--text-secondary)'}}>{selectedUniversity.city}</span>
                             <span className={`text-xs px-2 py-1 rounded-full font-medium border-2 border-black ${
                               selectedUniversity.type === 'public'
                                 ? 'bg-green-300 text-black'
                                 : 'bg-purple-300 text-black'
                             }`} style={{borderColor: 'var(--border-color)'}}>
                               {selectedUniversity.type === 'public' ? 'Devlet' : 'Vakıf'}
                             </span>
                             <div className="relative sort-dropdown">
                               <button
                                 onClick={() => setShowSortDropdown(!showSortDropdown)}
                                 className="text-sm font-semibold px-2 py-1 rounded flex items-center gap-1 transition-colors text-gray-600 hover:text-black"
                                 style={{color: 'var(--text-secondary)'}}
                               >
                                 {sortBy === 'newest' ? 'En Yeni' : 'Popüler'}
                                 <ChevronDown className={`h-3 w-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                               </button>
                               
                               {showSortDropdown && (
                                 <div 
                                   className="absolute left-0 top-full mt-1 w-32 border-2 border-black brutal-shadow-sm z-50 rounded" 
                                   style={{
                                     borderColor: 'var(--border-color)',
                                     backgroundColor: 'var(--bg-secondary)'
                                   }}
                                 >
                                   <button
                                     onClick={() => {
                                       setSortBy('newest')
                                       setShowSortDropdown(false)
                                     }}
                                    className={`w-full px-3 py-2 text-left font-semibold text-sm transition-all duration-150 group ${
                                      effectiveTheme === 'dark' 
                                        ? 'text-gray-400 hover:text-gray-200' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                   >
                                     En Yeni
                                   </button>
                                   <div className="h-px" style={{backgroundColor: 'var(--border-color)'}}></div>
                                   <button
                                     onClick={() => {
                                       setSortBy('popular')
                                       setShowSortDropdown(false)
                                     }}
                                    className={`w-full px-3 py-2 text-left font-semibold text-sm transition-all duration-150 group ${
                                      effectiveTheme === 'dark' 
                                        ? 'text-gray-400 hover:text-gray-200' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                   >
                                     Popüler
                                   </button>
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                         <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedUniversity?.id) {
                              router.push(`/university/${selectedUniversity.id}/create-post`);
                            }
                          }}
                          className="w-full sm:w-auto px-6 py-3 font-semibold border-2 border-black brutal-shadow-sm hover:brutal-shadow transition-all duration-150 rounded-full bg-white text-black text-center"
                           style={{
                             backgroundColor: effectiveTheme === 'dark' ? 'var(--brutal-yellow)' : '#FFFFFF',
                             color: '#000000'
                           }}
                          type="button"
                         >
                           + Yeni Gönderi
                         </button>
                       </div>
                     </div>

                     <div className="pb-6">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {sortedUniversityPosts.map((post) => (
                       <PostCard 
                         key={post.id} 
                         post={post} 
                         viewedPosts={viewedPosts}
                         onPostClick={handlePostClick}
                         postViewTimestamps={postViewTimestamps}
                         userJustCommented={userJustCommented}
                         showUniversityInfo={false}
                       />
                     ))}
                       </div>
                     </div>
                   </div>
                   )}
                </div>

                {/* Footer */}
                {!universityLoading && selectedUniversity && (
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
              </main>
            </div>
          ) : (
              <div className={`h-full flex flex-col ${!session ? 'overflow-hidden' : ''}`}>
                {!session ? (
                  <main className="h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-y-auto overflow-x-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-15" style={{backgroundColor: '#FFE066'}}></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-15" style={{backgroundColor: '#45B7D1'}}></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-15" style={{backgroundColor: '#9B59B6'}}></div>
                    
                    <div className="text-center max-w-6xl mx-auto w-full z-10 py-6 flex flex-col items-center justify-center flex-1">
                      <div className="mb-0 sm:mb-6 w-full max-w-4xl mx-auto flex items-center justify-center">
                        <div className="bg-white border-4 border-black px-6 py-4 rounded-2xl rotate-3 hover:rotate-0 transition-transform duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] scale-75 sm:scale-100 translate-x-9 sm:translate-x-9" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
                          <Logo className="scale-[1.5] sm:scale-[1.5]" />
                        </div>
                      </div>
                      
                      <div className="relative w-full max-w-4xl mx-auto mb-6 sm:mb-10 -mt-4 sm:mt-0 flex items-center justify-center px-4 sm:px-0">
                        <div className="relative w-full min-h-[260px] max-h-[380px] sm:min-h-[320px] sm:max-h-[480px]">
                          <Image
                            src="/image.png"
                            alt="Baya bi gizli Zuni markası"
                            fill
                            priority
                            className="object-contain"
                            unoptimized
                            sizes="(max-width: 640px) 90vw, (max-width: 768px) 85vw, (max-width: 1024px) 80vw, 1024px"
                          />
                        </div>
                      </div>
                      
                      {/* Text under image */}
                      <div className="text-center max-w-2xl mx-auto px-4 -mt-4 sm:-mt-2 -mb-4">
                        <p className="text-base sm:text-lg md:text-xl font-medium text-black leading-relaxed sm:hidden" style={{color: 'var(--text-secondary)'}}>
                          Üniversitene özel yazılı, görsel ve sesli gönderiler paylaş, tartışmalara katıl.
                        </p>
                        <p className="text-base sm:text-lg md:text-xl font-medium text-black leading-relaxed hidden sm:block" style={{color: 'var(--text-secondary)'}}>
                          Üniversitene özel yazılı, görsel ve sesli gönderiler paylaş, tartışmalara katıl.
                        </p>
                      </div>

                      {/* Minimalist Features Grid */}
                      <div className="grid grid-cols-3 gap-3 md:gap-5 max-w-4xl mx-auto mb-0 w-full mt-8">
                        {[
                          { icon: MessageSquare, text: "Tartış" },
                          { icon: Building2, text: "Keşfet" },
                          { icon: User, text: "Bağlan" }
                        ].map((item, i) => (
                          <div key={i} className="flex flex-col items-center justify-center p-3 md:p-4 transition-all duration-300 group cursor-default">
                            <item.icon className="w-6 h-6 md:w-9 md:h-9 mb-2 group-hover:scale-110 transition-transform duration-300 text-black dark:text-gray-300" style={{strokeWidth: 2.5}} />
                            <span className="font-black text-xs md:text-base uppercase tracking-tight text-black dark:text-gray-300" style={{letterSpacing: '0.05em'}}>{item.text}</span>
                    </div>
                        ))}
                    </div>
                    </div>
                    
                    {/* Footer for Welcome Screen */}
                    <footer className="w-full pt-0 pb-3 z-20 -mt-2">
                      <div className="max-w-4xl mx-auto px-6 text-center">
                        <div className="flex flex-wrap justify-center items-center gap-4 mb-1">
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
                  </main>
                ) : (
                  <div className={`flex-1 ${isMobile ? 'h-full' : 'overflow-y-auto'}`}>
                    <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-0 sm:py-8 flex flex-col ${isMobile ? 'h-full' : 'min-h-full'}`}>
                      <div className="flex-1">
                    <div className="mb-4 mt-2">
                      {/* Modern Pill Navigation */}
                      <div className="flex justify-center px-2 sm:px-4">
                        <div className="flex w-full max-w-6xl p-1 sm:p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-full border-2 border-black dark:border-gray-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{borderColor: 'var(--border-color)'}}>
                      <button
                        onClick={() => handleTabChange('my-activity')}
                            className={`flex-1 py-2.5 sm:py-4 rounded-full text-xs sm:text-lg font-bold transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 ${
                          activeTab === 'my-activity'
                                ? 'bg-yellow-300 text-black shadow-sm border-2 border-black transform -translate-y-0.5' 
                                : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white border-2 border-transparent'
                        }`}
                            style={{
                              backgroundColor: activeTab === 'my-activity' ? '#FFE066' : 'transparent',
                              borderColor: activeTab === 'my-activity' ? 'var(--border-color)' : 'transparent',
                              color: activeTab === 'my-activity' ? '#000' : 'var(--text-secondary)'
                            }}
                      >
                            <BookOpen className="w-3.5 h-3.5 sm:w-6 sm:h-6 flex-shrink-0" />
                            <span className="truncate">Aktiviteler</span>
                      </button>
                          
                      <button
                        onClick={() => handleTabChange('subscribed')}
                            className={`flex-1 py-2.5 sm:py-4 rounded-full text-xs sm:text-lg font-bold transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 ${
                          activeTab === 'subscribed'
                                ? 'bg-yellow-300 text-black shadow-sm border-2 border-black transform -translate-y-0.5'
                                : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white border-2 border-transparent'
                        }`}
                            style={{
                              backgroundColor: activeTab === 'subscribed' ? '#FFE066' : 'transparent',
                              borderColor: activeTab === 'subscribed' ? 'var(--border-color)' : 'transparent',
                              color: activeTab === 'subscribed' ? '#000' : 'var(--text-secondary)'
                            }}
                      >
                            <Star className="w-3.5 h-3.5 sm:w-6 sm:h-6 flex-shrink-0" />
                            <span className="truncate">Abonelikler</span>
                      </button>
                          
                      <button
                        onClick={() => handleTabChange('trending')}
                            className={`flex-1 py-2.5 sm:py-4 rounded-full text-xs sm:text-lg font-bold transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 ${
                          activeTab === 'trending'
                                ? 'bg-yellow-300 text-black shadow-sm border-2 border-black transform -translate-y-0.5'
                                : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white border-2 border-transparent'
                        }`}
                            style={{
                              backgroundColor: activeTab === 'trending' ? '#FFE066' : 'transparent',
                              borderColor: activeTab === 'trending' ? 'var(--border-color)' : 'transparent',
                              color: activeTab === 'trending' ? '#000' : 'var(--text-secondary)'
                            }}
                      >
                            <TrendingUp className="w-3.5 h-3.5 sm:w-6 sm:h-6 flex-shrink-0" />
                            <span className="truncate">Trendler</span>
                      </button>
                        </div>
                  </div>
                    </div>

            {session && (
              <>
                {loading && !userActivity ? (
                  <PostListSkeleton />
                ) : (
                  <>
                    {activeTab === 'my-activity' && (
                      <>
                    {userActivity && (userActivity.userPosts.length > 0 || userActivity.postsWithUserComments.length > 0) ? (
                      <div className="pt-6">
                        {/* User's Posts */}
                        {userActivity.userPosts.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-2xl font-display font-bold text-black mb-4 flex items-center" style={{color: 'var(--text-primary)'}}>
                              <BookOpen className="h-6 w-6 mr-3 text-gray-400 dark:text-gray-500" />
                              Gönderiler ({userActivity.userPosts.length})
                            </h3>
                            <div>
                              {/* Carousel Container */}
                              <div className="mb-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {getVisiblePosts(sortedUserPosts, myPostsIndex).map((post) => (
                       <PostCard 
                         key={post.id} 
                         post={post} 
                         viewedPosts={viewedPosts}
                         onPostClick={handlePostClick}
                         postViewTimestamps={postViewTimestamps}
                         userJustCommented={userJustCommented}
                         showUniversityInfo={true}
                       />
                              ))}
                                </div>
                              </div>
                              
                              {/* Navigation Controls */}
                              {getTotalSlides(sortedUserPosts) > 1 && (
                                <div className="flex items-center justify-center gap-6">
                                  {/* Previous Arrow */}
                                  <button
                                    onClick={() => goToPrevSlide(myPostsIndex, sortedUserPosts, setMyPostsIndex)}
                                    className="bg-white border-2 border-black brutal-shadow-sm p-2.5 hover:brutal-shadow transition-all flex items-center justify-center"
                                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', width: '40px', height: '40px'}}
                                  >
                                    <ChevronLeft className="h-5 w-5" style={{color: 'var(--text-primary)'}} />
                                  </button>
                                  
                                  {/* Dots Indicator */}
                                  <div className="flex items-center gap-2 min-w-[100px] justify-center">
                                    {Array.from({ length: getTotalSlides(sortedUserPosts) }).map((_, index) => (
                                      <button
                                        key={index}
                                        onClick={() => goToSlide(index, setMyPostsIndex)}
                                        className={`h-2 rounded-full transition-all ${
                                          index === myPostsIndex 
                                            ? 'bg-black w-8' 
                                            : 'bg-gray-400 w-2'
                                        }`}
                                        style={{
                                          backgroundColor: index === myPostsIndex 
                                            ? 'var(--border-color)' 
                                            : 'var(--text-secondary)'
                                        }}
                                      />
                                    ))}
                                  </div>
                                  
                                  {/* Next Arrow */}
                                  <button
                                    onClick={() => goToNextSlide(myPostsIndex, sortedUserPosts, setMyPostsIndex)}
                                    className="bg-white border-2 border-black brutal-shadow-sm p-2.5 hover:brutal-shadow transition-all flex items-center justify-center"
                                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', width: '40px', height: '40px'}}
                                  >
                                    <ChevronRight className="h-5 w-5" style={{color: 'var(--text-primary)'}} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Posts with User Comments */}
                        {userActivity.postsWithUserComments.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-2xl font-display font-bold text-black mb-4 flex items-center" style={{color: 'var(--text-primary)'}}>
                              <MessageSquare className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
                              Yorumlar ({userActivity.postsWithUserComments.length})
                            </h3>
                            <div>
                              {/* Carousel Container */}
                              <div className="mb-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {getVisiblePosts(sortedCommentedPosts, commentedPostsIndex).map((post) => (
                       <PostCard 
                         key={post.id} 
                         post={post} 
                         viewedPosts={viewedPosts}
                         onPostClick={handlePostClick}
                         postViewTimestamps={postViewTimestamps}
                         userJustCommented={userJustCommented}
                         showUniversityInfo={true}
                       />
                              ))}
                                </div>
                              </div>
                              
                              {/* Navigation Controls */}
                              {getTotalSlides(sortedCommentedPosts) > 1 && (
                                <div className="flex items-center justify-center gap-6">
                                  {/* Previous Arrow */}
                                  <button
                                    onClick={() => goToPrevSlide(commentedPostsIndex, sortedCommentedPosts, setCommentedPostsIndex)}
                                    className="bg-white border-2 border-black brutal-shadow-sm p-2.5 hover:brutal-shadow transition-all flex items-center justify-center"
                                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', width: '40px', height: '40px'}}
                                  >
                                    <ChevronLeft className="h-5 w-5" style={{color: 'var(--text-primary)'}} />
                                  </button>
                                  
                                  {/* Dots Indicator */}
                                  <div className="flex items-center gap-2 min-w-[100px] justify-center">
                                    {Array.from({ length: getTotalSlides(sortedCommentedPosts) }).map((_, index) => (
                                      <button
                                        key={index}
                                        onClick={() => goToSlide(index, setCommentedPostsIndex)}
                                        className={`h-2 rounded-full transition-all ${
                                          index === commentedPostsIndex 
                                            ? 'bg-black w-8' 
                                            : 'bg-gray-400 w-2'
                                        }`}
                                        style={{
                                          backgroundColor: index === commentedPostsIndex 
                                            ? 'var(--border-color)' 
                                            : 'var(--text-secondary)'
                                        }}
                                      />
                                    ))}
                                  </div>
                                  
                                  {/* Next Arrow */}
                                  <button
                                    onClick={() => goToNextSlide(commentedPostsIndex, sortedCommentedPosts, setCommentedPostsIndex)}
                                    className="bg-white border-2 border-black brutal-shadow-sm p-2.5 hover:brutal-shadow transition-all flex items-center justify-center"
                                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', width: '40px', height: '40px'}}
                                  >
                                    <ChevronRight className="h-5 w-5" style={{color: 'var(--text-primary)'}} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10 font-sans">
                        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-80" style={{color: 'var(--text-secondary)'}} />
                        <h3 className="text-lg font-semibold tracking-tight" style={{color: 'var(--text-secondary)'}}>
                          Henüz bir aktiviten yok
                        </h3>
                        <p className="text-sm font-medium mt-1 leading-relaxed opacity-90" style={{color: 'var(--text-secondary)'}}>
                          Henüz bir gönderi paylaşmadın veya bir gönderiye yorum yapmadın.
                        </p>
                      </div>
                    )}
                      </>
                    )}

                    {activeTab === 'subscribed' && (
                      <>
                    {!subscribedPostsLoaded ? (
                      <PostListSkeleton />
                    ) : posts.length === 0 ? (
                      <div className="text-center py-10 font-sans">
                        <Star className="h-10 w-10 mx-auto mb-3 opacity-80" style={{color: 'var(--text-secondary)'}} />
                        <h3 className="text-lg font-semibold tracking-tight" style={{color: 'var(--text-secondary)'}}>
                          Abone olduğun üniversitelerden gönderi yok
                        </h3>
                        <p className="text-sm font-medium mt-1 leading-relaxed opacity-90" style={{color: 'var(--text-secondary)'}}>
                          Üniversite panolarına abone olarak gönderileri burada görebilirsin.
                        </p>
                      </div>
                    ) : (
                      <div className="pt-6 pb-6">
                        <h3 className="text-2xl font-display font-bold text-black mb-4 flex items-center" style={{color: 'var(--text-primary)'}}>
                          <Star className="h-6 w-6 mr-3 text-gray-400 dark:text-gray-500" />
                          Abonelikler ({posts.length})
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {posts.map((post) => (
                       <PostCard 
                         key={post.id} 
                         post={post} 
                         viewedPosts={viewedPosts}
                         onPostClick={handlePostClick}
                         postViewTimestamps={postViewTimestamps}
                         userJustCommented={userJustCommented}
                         showUniversityInfo={true}
                       />
                          ))}
                        </div>
                      </div>
                    )}
                      </>
                    )}

                    {activeTab === 'trending' && (
                      <>
                        {!allPostsLoaded ? (
                          <PostListSkeleton />
                        ) : allPosts.filter(post => post.isTrending).length === 0 ? (
                          <div className="text-center py-10 font-sans">
                            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-80" style={{color: 'var(--text-secondary)'}} />
                            <h3 className="text-lg font-semibold tracking-tight" style={{color: 'var(--text-secondary)'}}>
                              Trend gönderi yok
                            </h3>
                            <p className="text-sm font-medium mt-1 leading-relaxed opacity-90" style={{color: 'var(--text-secondary)'}}>
                              Son 48 saatte 10+ yorum alan gönderiler burada görünecek!
                            </p>
                          </div>
                        ) : (
                          <div className="pt-6 pb-6">
                            <h3 className="text-2xl font-display font-bold text-black mb-4 flex items-center" style={{color: 'var(--text-primary)'}}>
                              <TrendingUp className="h-6 w-6 mr-3 text-orange-500" />
                              Trend Gönderiler ({allPosts.filter(post => post.isTrending).length})
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {allPosts.filter(post => post.isTrending).map((post) => (
                       <PostCard 
                         key={post.id} 
                         post={post} 
                         viewedPosts={viewedPosts}
                         onPostClick={handlePostClick}
                         postViewTimestamps={postViewTimestamps}
                         userJustCommented={userJustCommented}
                         showUniversityInfo={true}
                       />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
                      </div>

                      {/* Footer */}
                      {!loading && (
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
                  </main>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Auth Modal (for university board access) */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSignIn={() => {
          setAuthModalMode('signin')
          setShowAuthModalCombined(true)
        }}
        onSignUp={() => {
          setAuthModalMode('signup')
          setShowAuthModalCombined(true)
        }}
      />
      
      {/* Combined Auth Modal with Toggle */}
      <AuthModalCombined 
        isOpen={showAuthModalCombined} 
        onClose={() => setShowAuthModalCombined(false)}
        initialMode={authModalMode}
        onAuthenticating={() => setIsAuthenticating(true)}
      />
    </div>
  )
}