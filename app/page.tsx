"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { MessageSquare, LogOut, User, GraduationCap, Star, BookOpen, Plus, Menu, X, Send, Calendar, TrendingUp, Building2, Moon, Sun, ArrowUpDown, Clock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import CustomSpinner from "@/components/CustomSpinner"
import Link from "next/link"
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
  const [posts, setPosts] = useState<Post[]>([])
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my-activity' | 'subscribed' | 'trending'>('my-activity')
  
  // Get post ID and university ID from URL parameters
  const postId = searchParams.get('post')
  const universityParam = searchParams.get('university')
  const refreshParam = searchParams.get('refresh')

  // Load active tab from localStorage on component mount
  useEffect(() => {
    const savedActiveTab = localStorage.getItem('activeTab')
    if (savedActiveTab && ['my-activity', 'subscribed', 'trending'].includes(savedActiveTab)) {
      setActiveTab(savedActiveTab as 'my-activity' | 'subscribed' | 'trending')
    }
  }, [])

  // Handle refresh parameter - refresh data when coming back from post deletion
  useEffect(() => {
    if (refreshParam) {
      fetchData()
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

  // Reset carousel index when userActivity changes
  useEffect(() => {
    if (userActivity) {
      setMyPostsIndex(0)
      setCommentedPostsIndex(0)
    }
  }, [userActivity?.userPosts.length, userActivity?.postsWithUserComments.length])

  // Control splash screen minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 1500) // Show splash for at least 1.5 seconds

    return () => clearTimeout(timer)
  }, [])

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
      fetchData()
    } else {
      setLoading(false)
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
    
    // If navigating from create-post, don't wait for initial data fetch
    // This allows immediate navigation to university board
    if (!navigatingFromCreatePost && loading) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const universityIdFromUrl = urlParams.get('university')
    
    // Clear the navigation flag if it matches
    if (navigatingFromCreatePost && universityIdFromUrl === navigatingFromCreatePost) {
      sessionStorage.removeItem('navigatingToUniversity')
    }
    
    // Only handle university redirect if:
    // 1. There's a university parameter in URL
    // 2. We're not showing a post detail view
    // 3. We haven't already loaded the university board data (avoid duplicate loads)
    if (universityIdFromUrl && !postId) {
      if (showUniversityBoard && universityLoading && selectedUniversity?.id !== universityIdFromUrl) {
        // We're showing university board but need to load different university
        // Load data directly
        const loadUniversityData = async () => {
          try {
            const [universityResponse, postsResponse] = await Promise.all([
              fetch(`/api/universities/${universityIdFromUrl}`),
              fetch(`/api/universities/${universityIdFromUrl}/posts`)
            ])
            
            if (universityResponse.ok && postsResponse.ok) {
              const university = await universityResponse.json()
              const posts = await postsResponse.json()
              
              setSelectedUniversity({
                id: university.id,
                name: university.name,
                shortName: university.shortName,
                city: university.city,
                type: university.type
              })
              setUniversityPosts(posts)
              setUniversityLoading(false)
            } else {
              // Error loading - go back to main page
              setShowUniversityBoard(false)
              setUniversityLoading(false)
            }
          } catch (error) {
            console.error('Error loading university data:', error)
            setShowUniversityBoard(false)
            setUniversityLoading(false)
          }
        }
        loadUniversityData()
      } else if (!showUniversityBoard || !selectedUniversity) {
        // Not showing university board OR no university loaded - load it
        // If navigating from create-post, show board immediately
        if (navigatingFromCreatePost) {
          setShowUniversityBoard(true)
          setUniversityLoading(true)
          // Load university data immediately without waiting
          const loadUniversityData = async () => {
            try {
              const [universityResponse, postsResponse] = await Promise.all([
                fetch(`/api/universities/${universityIdFromUrl}`),
                fetch(`/api/universities/${universityIdFromUrl}/posts`)
              ])
              
              if (universityResponse.ok && postsResponse.ok) {
                const university = await universityResponse.json()
                const posts = await postsResponse.json()
                
                setSelectedUniversity({
                  id: university.id,
                  name: university.name,
                  shortName: university.shortName,
                  city: university.city,
                  type: university.type
                })
                setUniversityPosts(posts)
                setUniversityLoading(false)
              } else {
                setUniversityLoading(false)
              }
            } catch (error) {
              console.error('Error loading university data:', error)
              setUniversityLoading(false)
            }
          }
          loadUniversityData()
        } else {
          setShowUniversityBoard(true)
          if (!selectedUniversity || selectedUniversity.id !== universityIdFromUrl) {
            setUniversityLoading(true)
            handleUniversityClick(universityIdFromUrl)
          }
        }
      }
    }
  }, [postId, status, session, loading, showUniversityBoard, selectedUniversity, isNavigatingBack, universityLoading])


  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path === '/') {
        setShowUniversityBoard(false)
        setShowPostDetail(false)
        setSelectedPostId(null)
        setSelectedUniversity(null)
        setUniversityPosts([])
        setPostSource(null)
        setPostSourceUniversityId(null)
      } else if (path.startsWith('/university/')) {
        const universityId = path.split('/')[2]
        if (universityId && universityId !== selectedUniversity?.id) {
          handleUniversityClick(universityId)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedUniversity])

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

  const fetchData = async () => {
    try {
      console.log('fetchData: Starting to fetch all data...')
      
      // Fetch all main datasets in parallel to reduce total load time
      const [activityResponse, subscribedResponse, allPostsResponse] = await Promise.all([
        fetch("/api/user/activity"),
        fetch("/api/user/subscribed-posts"),
        fetch("/api/posts"),
      ])

      // User activity (includes user's posts and posts with user comments)
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setUserActivity(activityData)
        console.log('fetchData: User activity updated')
      } else {
        console.error('fetchData: Failed to load user activity', activityResponse.status)
      }

      // Posts from subscribed universities
      if (subscribedResponse.ok) {
        const subscribedData = await subscribedResponse.json()
        setPosts(subscribedData)
        console.log('fetchData: Subscribed posts updated')
      } else {
        console.error('fetchData: Failed to load subscribed posts', subscribedResponse.status)
      }

      // All posts for trending section
      if (allPostsResponse.ok) {
        const allPostsData = await allPostsResponse.json()
        setAllPosts(allPostsData)
        console.log('fetchData: All posts updated')
      } else {
        console.error('fetchData: Failed to load all posts', allPostsResponse.status)
      }
      
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
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const { signOut } = await import("next-auth/react")
    signOut({ callbackUrl: "/" })
  }

  const handlePostClick = (postId: string) => {
    // Track where the post was opened from
    // If we're on main page (not showing university board), source is 'main'
    // If we're showing a university board, source is 'university'
    const source = showUniversityBoard ? 'university' : 'main'
    setPostSource(source)
    
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
    
    // Update URL immediately for proper navigation
    // CRITICAL: Include university parameter if opened from university board
    // This ensures refresh works correctly - we can restore postSource from URL
    if (source === 'university' && universityIdToStore) {
      router.push(`/?post=${postId}&university=${universityIdToStore}`)
    } else {
      router.push(`/?post=${postId}`)
    }
    
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
    setShowPostDetail(false)
    setSelectedPostId(null)
    setPostSource(null)
    setPostSourceUniversityId(null)
    
    // Clear the post parameter from URL immediately using window.history
    // This ensures searchParams updates synchronously before router.replace()
    // CRITICAL: This prevents PostDetailView from rendering because postId check will fail
    // Also prevents useEffect from re-triggering and re-opening the post
    if (currentPostId) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('post')
      // Keep university param if going to university board, otherwise remove it too
      if (source === 'main' || (!urlUniversityId && source !== 'university')) {
        currentUrl.searchParams.delete('university')
      }
      window.history.replaceState({}, '', currentUrl.toString())
      
      // CRITICAL: Immediately update state to reflect URL change
      // This prevents any useEffect from seeing the old postId and re-opening it
      // Do this synchronously before any async operations
      setShowPostDetail(false)
      setSelectedPostId(null)
    }
    
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
      
      // Navigate based on where the user came from (postSource)
      // CRITICAL: If source is explicitly 'main', ALWAYS go to main page (user was on main page)
      // If source is 'university' or null/undefined (refresh case), use university context
      
      // Priority for determining destination:
      // 1. If source === 'main' → ALWAYS go to main page (user came from main page)
      // 2. If source === 'university' → go to university board
      // 3. If source is null/undefined (refresh) → use universityId from post data/URL
      
      // Navigate immediately - don't wait for anything
      if (source === 'main') {
        // User explicitly came from main page - always return to main page
        // Ensure post detail is closed and URL is cleared
        setShowUniversityBoard(false)
        setShowPostDetail(false)
        setSelectedPostId(null)
        
        // Navigate to main page (URL post param already cleared above)
        router.replace('/')
        
        // Clear the navigating flag after navigation completes
        // Use longer delay to ensure:
        // 1. URL change has fully propagated
        // 2. All state updates have been applied
        // 3. No useEffect can re-trigger before navigation is complete
        setTimeout(() => {
          // Final check: ensure URL doesn't have post parameter
          const finalCheck = new URLSearchParams(window.location.search)
          if (!finalCheck.get('post')) {
            setIsNavigatingBack(false)
          } else {
            // If post still in URL (shouldn't happen), wait a bit more
            setTimeout(() => {
              setIsNavigatingBack(false)
            }, 100)
          }
        }, 200)
      } else if (source === 'university' || urlUniversityId) {
        // Go to university board if:
        // 1. Source is explicitly 'university', OR
        // 2. We have a university ID from function param (post data), state, or URL (refresh case)
        const targetUniversityId = urlUniversityId
        if (targetUniversityId) {
          // Always set university board state immediately (before navigation)
          // This ensures UI updates immediately
          setShowUniversityBoard(true)
          
          // URL post param already cleared above, now set university param
          // Navigate immediately - don't wait for data loading
          const targetUrl = shouldRefresh 
            ? `/?university=${targetUniversityId}&refresh=true`
            : `/?university=${targetUniversityId}`
          router.replace(targetUrl)
          
          // Load data in background (non-blocking)
          // Don't wait for this - navigation happens immediately above
          if (selectedUniversity?.id !== targetUniversityId) {
            setUniversityLoading(true)
            
            // Use the handleUniversityClick function logic directly to ensure consistent data loading
            // but modified to not navigate again
            Promise.all([
              fetch(`/api/universities/${targetUniversityId}`),
              fetch(`/api/universities/${targetUniversityId}/posts`)
            ]).then(([universityResponse, postsResponse]) => {
              if (universityResponse.ok && postsResponse.ok) {
                return Promise.all([universityResponse.json(), postsResponse.json()])
              } else {
                throw new Error('Failed to fetch university data')
              }
            }).then(([university, posts]) => {
              setSelectedUniversity({
                id: university.id,
                name: university.name,
                shortName: university.shortName,
                city: university.city,
                type: university.type
              })
              setUniversityPosts(posts)
              setUniversityLoading(false)
            }).catch((error) => {
              console.error('Error loading university data:', error)
              setUniversityLoading(false)
            })
          }
          
          // Clear the navigating flag after navigation completes
          // Use a longer delay to allow the URL change to trigger useEffect
          setTimeout(() => {
            setIsNavigatingBack(false)
          }, 200)
        } else {
          // Fallback: if we don't have university ID, go to main page
          setShowUniversityBoard(false)
          router.replace('/')
          setTimeout(() => {
            setIsNavigatingBack(false)
          }, 50)
        }
      } else {
        // Final fallback: go to main page
        setShowUniversityBoard(false)
        router.replace('/')
        setTimeout(() => {
          setIsNavigatingBack(false)
        }, 50)
      }
      
      // Try to refresh data to get latest comments (async, don't block navigation)
      if (session) {
        fetchData().catch(error => {
          console.log('Data refresh failed on go back, but badge logic should still work:', error)
        })
      }
      } else {
      // If no postId, just navigate based on source
      if (source === 'main') {
        router.replace('/')
      } else if (source === 'university') {
        const targetUniversityId = sourceUniId || universityId
        if (targetUniversityId) {
          router.replace(`/?university=${targetUniversityId}`)
        } else {
          router.replace('/')
        }
      } else if (universityId) {
        router.replace(`/?university=${universityId}`)
      } else {
        router.replace('/')
      }
      
      // Clear the navigating flag after a short delay to allow navigation to complete
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
    if (session) {
      fetchData().catch(error => {
        console.log('Data refresh failed:', error)
      })
    }
  }


  const handleTabChange = (tab: 'my-activity' | 'subscribed' | 'trending') => {
    setActiveTab(tab)
    localStorage.setItem('activeTab', tab)
  }

  const handleUniversityClick = async (universityId: string) => {
    // Close mobile menu when clicking a board (mobile only)
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }

    // Check if user is authenticated - show modal if not
    if (!session) {
      setShowAuthModal(true)
      return
    }

    // Set navigation flag to prevent useEffect interference
    setIsNavigatingBack(true)

    // Clear post detail state immediately (before async operations)
    setShowUniversityBoard(true)
    setShowPostDetail(false)
    setSelectedPostId(null)
    setPostSource(null)
    setPostSourceUniversityId(null)
    setUniversityLoading(true)
    
    // Only navigate if URL doesn't already have this university parameter
    // This prevents clearing URL on refresh
    const currentUrl = new URL(window.location.href)
    const currentUniParam = currentUrl.searchParams.get('university')
    const hasPostParam = currentUrl.searchParams.has('post')
    
    if (currentUniParam !== universityId || hasPostParam) {
      router.replace(`/?university=${universityId}`)
    }
    
    try {
      console.log(`🎯 Fetching university data for ID: ${universityId}`)
      
      // Fetch university info and posts
      const [universityResponse, postsResponse] = await Promise.all([
        fetch(`/api/universities/${universityId}`),
        fetch(`/api/universities/${universityId}/posts`)
      ])
      
      console.log('📊 University response status:', universityResponse.status)
      console.log('📊 Posts response status:', postsResponse.status)
      
      if (universityResponse.ok && postsResponse.ok) {
        const university = await universityResponse.json()
        const posts = await postsResponse.json()
        
        console.log('✅ University data:', university)
        console.log('✅ Posts data:', posts.length, 'posts')
        
        setSelectedUniversity({
          id: university.id,
          name: university.name,
          shortName: university.shortName,
          city: university.city,
          type: university.type
        })
        setUniversityPosts(posts)
      } else {
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
    } catch (error) {
      console.error('💥 Error fetching university data:', error)
      setShowUniversityBoard(false)
    } finally {
      setUniversityLoading(false)
      setIsRedirecting(false) // Clear redirecting state when done
      // Clear navigation flag after a delay
      setTimeout(() => {
        setIsNavigatingBack(false)
      }, 100)
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
    
    // Clear URL parameters explicitly to prevent useEffect from re-triggering
    window.history.replaceState({}, '', '/')
    
    // Use router.replace for proper navigation
    router.replace('/')
    
    // Clear the navigating flag after a short delay
    setTimeout(() => {
      setIsNavigatingBack(false)
    }, 100)
  }




  if (status === "loading" || isRedirecting || showSplash || isAuthenticating) {
    return <SplashScreen />
  }

  return (
    <div className="h-screen overflow-hidden" style={{backgroundColor: 'var(--bg-primary)'}}>
      {/* Header */}
      <header className={`brutal-header ${isMobile ? 'fixed top-0 left-0 right-0 z-50' : 'relative'}`}>
        <div className="w-full px-2 sm:px-4">
          <div className="flex justify-between items-center h-16">
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
                         className="p-3 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow"
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
                      className="p-3 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow"
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
      <div className={`flex ${isMobile ? 'absolute inset-0 top-16' : 'h-[calc(100vh-64px)] sm:h-[calc(100dvh-64px)]'} overscroll-none`}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <UniversitySidebar onUniversityClick={handleUniversityClick} />
        )}
        
        <div className={`flex-1 ${isMobile ? 'overflow-y-auto overscroll-none h-full pb-0' : 'overflow-y-auto overscroll-none h-full pb-20 sm:pb-0'}`} style={{backgroundColor: 'var(--bg-primary)'}}>
          {/* Mobile Universities Full Page - No Sliding */}
          {isMobile && isMobileMenuOpen ? (
            <div className="h-full flex flex-col" style={{backgroundColor: 'var(--bg-primary)'}}>
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
          ) : (showPostDetail && (postId || selectedPostId)) ? (
            <PostDetailView postId={postId || selectedPostId || ''} onGoBack={handleGoBack} onCommentAdded={handleCommentAdded} onPostDeleted={fetchData} />
          ) : (showUniversityBoard || (session && universityParam && !postId)) ? (
            <div className={`${isMobile ? 'h-full' : 'h-full overflow-y-auto overscroll-none'}`}>
              <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col ${isMobile ? 'min-h-[calc(100dvh-64px)]' : 'min-h-full'}`}>
                <div className="flex-1">
                {/* University Posts */}
                {universityLoading || !selectedUniversity ? (
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

                    <div className="text-center py-12">
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

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {universityPosts
                       .sort((a, b) => {
                         if (sortBy === 'newest') {
                           // Sort by creation time (newest first)
                           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                         } else {
                           // Sort by comment count (most commented first)
                           const aComments = a._count?.comments || 0
                           const bComments = b._count?.comments || 0
                           return bComments - aComments
                         }
                       })
                       .map((post) => (
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
                   )}
                </div>

                {/* Footer */}
                {!universityLoading && selectedUniversity && (
                  <footer className="mt-8" style={{paddingBottom: 0, marginBottom: '-1rem'}}>
                    <div className="max-w-4xl mx-auto px-6" style={{paddingBottom: 0, marginBottom: 0}}>
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
              </main>
            </div>
          ) : (
              <div className={`h-full flex flex-col overscroll-none ${!session ? 'overflow-hidden' : ''}`}>
                {!session ? (
                  <main className="h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-y-auto overflow-x-hidden no-overscroll">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
                    
                    <div className="text-center max-w-4xl mx-auto w-full z-10 py-8">
                      <div className="mb-6 sm:mb-10 inline-flex items-center justify-center">
                         <div className="bg-white border-4 border-black p-4 sm:p-6 rounded-2xl rotate-3 hover:rotate-0 transition-transform duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
                           <Logo className="scale-125 sm:scale-[2]" />
                    </div>
                      </div>
                      
                      <h1 className="text-6xl md:text-8xl font-display font-black text-black mb-6 tracking-tighter leading-none" style={{color: 'var(--text-primary)'}}>
                        FULL<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">GİZLİLİK.</span>
                    </h1>
                      
                      <p lang="tr" className="text-xl md:text-2xl font-medium text-gray-600 mb-12 max-w-xl mx-auto leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                        Üniversite bağlamında bilgi paylaşımının en filtresiz hali.
                      </p>

                      {/* Minimalist Features Grid */}
                      <div className="grid grid-cols-4 gap-2 md:gap-6 max-w-3xl mx-auto mb-8">
                        {[
                          { icon: MessageSquare, text: "Tartış" },
                          { icon: Building2, text: "Keşfet" },
                          { icon: User, text: "Bağlan" },
                          { icon: TrendingUp, text: "Yüksel" }
                        ].map((item, i) => (
                          <div key={i} className="flex flex-col items-center justify-center p-2 md:p-6 transition-all duration-300 group cursor-default">
                            <item.icon className="w-6 h-6 md:w-8 md:h-8 mb-2 text-black group-hover:scale-110 transition-transform duration-300" style={{color: 'var(--text-primary)'}} />
                            <span className="font-bold text-xs md:text-sm uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>{item.text}</span>
                    </div>
                        ))}
                    </div>
                    </div>
                    
                    {/* Footer for Welcome Screen */}
                    <footer className="absolute bottom-2 left-0 right-0 z-20 w-full py-2">
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
                  <div className={`flex-1 ${isMobile ? '' : 'overflow-y-auto'}`}>
                    <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col ${isMobile ? 'min-h-[calc(100dvh-64px)]' : 'min-h-full'}`}>
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
                {loading ? (
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
                              <BookOpen className="h-6 w-6 mr-3 text-black" style={{color: 'var(--text-primary)'}} />
                              Gönderiler ({userActivity.userPosts.length})
                            </h3>
                            <div>
                              {/* Carousel Container */}
                              <div className="mb-6 min-h-[280px] lg:min-h-[560px]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {getVisiblePosts(userActivity.userPosts, myPostsIndex).map((post) => (
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
                              {getTotalSlides(userActivity.userPosts) > 1 && (
                                <div className="flex items-center justify-center gap-6">
                                  {/* Previous Arrow */}
                                  <button
                                    onClick={() => goToPrevSlide(myPostsIndex, userActivity.userPosts, setMyPostsIndex)}
                                    className="bg-white border-2 border-black brutal-shadow-sm p-2.5 hover:brutal-shadow transition-all flex items-center justify-center"
                                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', width: '40px', height: '40px'}}
                                  >
                                    <ChevronLeft className="h-5 w-5" style={{color: 'var(--text-primary)'}} />
                                  </button>
                                  
                                  {/* Dots Indicator */}
                                  <div className="flex items-center gap-2 min-w-[100px] justify-center">
                                    {Array.from({ length: getTotalSlides(userActivity.userPosts) }).map((_, index) => (
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
                                    onClick={() => goToNextSlide(myPostsIndex, userActivity.userPosts, setMyPostsIndex)}
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
                              <MessageSquare className="h-5 w-5 mr-2 text-black" style={{color: 'var(--text-primary)'}} />
                              Yorumlar ({userActivity.postsWithUserComments.length})
                            </h3>
                            <div>
                              {/* Carousel Container */}
                              <div className="mb-6 min-h-[280px] lg:min-h-[560px]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {getVisiblePosts(userActivity.postsWithUserComments, commentedPostsIndex).map((post) => (
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
                              {getTotalSlides(userActivity.postsWithUserComments) > 1 && (
                                <div className="flex items-center justify-center gap-6">
                                  {/* Previous Arrow */}
                                  <button
                                    onClick={() => goToPrevSlide(commentedPostsIndex, userActivity.postsWithUserComments, setCommentedPostsIndex)}
                                    className="bg-white border-2 border-black brutal-shadow-sm p-2.5 hover:brutal-shadow transition-all flex items-center justify-center"
                                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', width: '40px', height: '40px'}}
                                  >
                                    <ChevronLeft className="h-5 w-5" style={{color: 'var(--text-primary)'}} />
                                  </button>
                                  
                                  {/* Dots Indicator */}
                                  <div className="flex items-center gap-2 min-w-[100px] justify-center">
                                    {Array.from({ length: getTotalSlides(userActivity.postsWithUserComments) }).map((_, index) => (
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
                                    onClick={() => goToNextSlide(commentedPostsIndex, userActivity.postsWithUserComments, setCommentedPostsIndex)}
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
                      <div className="text-center py-12 bg-white brutal-border brutal-shadow-sm" style={{backgroundColor: 'var(--bg-secondary)'}}>
                        <BookOpen className="h-16 w-16 mx-auto text-black mb-4" style={{color: 'var(--text-primary)'}} />
                        <h3 className="text-2xl font-semibold text-black mb-3" style={{color: 'var(--text-primary)'}}>
                          Henüz bir aktiviten yok
                        </h3>
                        <p className="text-lg font-medium text-black" style={{color: 'var(--text-secondary)'}}>
                          Henüz bir gönderi paylaşmadın veya bir gönderiye yorum yapmadın.
                        </p>
                      </div>
                    )}
                      </>
                    )}

                    {activeTab === 'subscribed' && (
                      <>
                    {posts.length === 0 ? (
                      <div className="text-center py-12 bg-white brutal-border brutal-shadow-sm" style={{backgroundColor: 'var(--bg-secondary)'}}>
                        <Star className="h-16 w-16 mx-auto text-black mb-4" style={{color: 'var(--text-primary)'}} />
                        <h3 className="text-2xl font-semibold text-black mb-3" style={{color: 'var(--text-primary)'}}>
                          Abone olduğun üniversitelerden gönderi yok
                        </h3>
                        <p className="text-lg font-medium text-black" style={{color: 'var(--text-secondary)'}}>
                          Üniversite panolarına abone olarak gönderileri burada görebilirsin. Sol menüdeki yıldız ikonunu kullan!
                        </p>
                      </div>
                    ) : (
                      <div className="pt-6 pb-6">
                        <h3 className="text-2xl font-display font-bold text-black mb-4 flex items-center" style={{color: 'var(--text-primary)'}}>
                          <Star className="h-6 w-6 mr-3 text-yellow-500" />
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
                        {allPosts.filter(post => post.isTrending).length === 0 ? (
                          <div className="text-center py-12 bg-white brutal-border brutal-shadow-sm" style={{backgroundColor: 'var(--bg-secondary)'}}>
                            <TrendingUp className="h-16 w-16 mx-auto text-black mb-4" style={{color: 'var(--text-primary)'}} />
                            <h3 className="text-2xl font-semibold text-black mb-3" style={{color: 'var(--text-primary)'}}>
                              Trend gönderi yok
                            </h3>
                            <p className="text-lg font-medium text-black" style={{color: 'var(--text-secondary)'}}>
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
                        <footer className="mt-8" style={{paddingBottom: 0, marginBottom: '-1rem'}}>
                          <div className="max-w-4xl mx-auto px-6" style={{paddingBottom: 0, marginBottom: 0}}>
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