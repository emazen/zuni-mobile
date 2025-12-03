'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Building2, Star, ChevronLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
  type: 'public' | 'private';
  isSubscribed?: boolean;
}

interface UniversitySidebarProps {
  onUniversityClick?: (universityId: string) => void;
  isMobile?: boolean;
}

export default function UniversitySidebar({ onUniversityClick, isMobile = false }: UniversitySidebarProps = {}) {
  const { data: session, status } = useSession();
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'subscribed' | 'all' | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isSwitchingTabs, setIsSwitchingTabs] = useState(false);

  useEffect(() => {
    // Wait for session status to resolve to avoid initial filter flicker
    if (status === 'loading') return;

    // Clear cache when session changes (login/logout) to get fresh subscription data
    if (status === 'authenticated' || status === 'unauthenticated') {
      localStorage.removeItem('universities_cache');
      localStorage.removeItem('universities_cache_timestamp');
    }

    // Don't set selectedType here - let it be determined after data loads
    fetchUniversities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  useEffect(() => {
    // Filter immediately when dependencies change
    filterUniversities();
    
    // Mark initial load as complete after first filtering
    if (universities.length > 0 && !initialLoadComplete) {
      setInitialLoadComplete(true);
      setLoading(false);
    }
  }, [universities, searchTerm, selectedType, initialLoadComplete]);
  
  // Separate effect to clear switching flag after filtering completes
  useEffect(() => {
    if (isSwitchingTabs) {
      const timer = setTimeout(() => {
        setIsSwitchingTabs(false);
      }, 100); // Give enough time for filtering to complete
      return () => clearTimeout(timer);
    }
  }, [isSwitchingTabs, filteredUniversities.length]); // Clear flag after filtered list updates

  // Tab selection is now handled in fetchUniversities to avoid glitch

  const fetchUniversities = async () => {
    try {
      // Check if we have cached data first
      const cacheKey = 'universities_cache';
      const cacheTimestampKey = 'universities_cache_timestamp';
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
      const now = Date.now();
      
      // Use cached data if it's still fresh
      if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
        const data = JSON.parse(cachedData);
        setUniversities(data);
        
        // Only set initial tab selection on first load, preserve user choice afterwards
        if (loading && session) {
          const subscribedCount = data.filter((uni: University) => uni.isSubscribed).length;
          setSelectedType(subscribedCount > 0 ? 'subscribed' : 'all');
        } else if (!session) {
          setSelectedType('all');
        }
        return;
      }
      
      // Fetch fresh data from API
      const response = await fetch('/api/universities');
      if (response.ok) {
        const data = await response.json();
        setUniversities(data);
        
        // Cache the data
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimestampKey, now.toString());
        
        // Only set initial tab selection on first load, preserve user choice afterwards
        if (loading && session) {
          const subscribedCount = data.filter((uni: University) => uni.isSubscribed).length;
          setSelectedType(subscribedCount > 0 ? 'subscribed' : 'all');
        } else if (!session) {
          setSelectedType('all');
        }
      }
    } catch (error) {
      console.error('Error fetching universities:', error);
      setLoading(false);
    }
  };

  // Function to manually refresh cache (can be called from parent components if needed)
  const refreshUniversitiesCache = () => {
    localStorage.removeItem('universities_cache');
    localStorage.removeItem('universities_cache_timestamp');
    fetchUniversities();
  };

  const filterUniversities = () => {
    // If selectedType is not set yet, don't filter
    if (selectedType === null) {
      setFilteredUniversities([]);
      return;
    }

    // CRITICAL: Filter synchronously to prevent glitch
    // Start with all universities for "all" tab, or filter immediately for "subscribed"
    let filtered = selectedType === 'all' ? [...universities] : universities.filter(uni => uni.isSubscribed);

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(uni =>
        uni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.shortName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    // Update filtered list immediately (synchronously)
    setFilteredUniversities(filtered);
  };

  const toggleSubscription = async (universityId: string, isSubscribed: boolean) => {
    if (!session) return;
    
    setSubscribing(universityId);
    
    // Optimistically update UI
    const previousUniversities = universities;
    const updatedUniversities = universities.map(uni => 
      uni.id === universityId 
        ? { ...uni, isSubscribed: !isSubscribed }
        : uni
    );
    setUniversities(updatedUniversities);
    localStorage.setItem('universities_cache', JSON.stringify(updatedUniversities));
    localStorage.setItem('universities_cache_timestamp', Date.now().toString());
    
    try {
      const method = isSubscribed ? 'DELETE' : 'POST';
      const response = await fetch(`/api/universities/${universityId}/subscribe`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Subscription request failed');
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      // Revert optimistic update
      setUniversities(previousUniversities);
      localStorage.setItem('universities_cache', JSON.stringify(previousUniversities));
      localStorage.setItem('universities_cache_timestamp', Date.now().toString());
    } finally {
      setSubscribing(null);
    }
  };

  // Remove the loading return - show the full sidebar with skeleton content

  if (isCollapsed && !isMobile && session) {
    return (
      <div className={`w-0 bg-transparent border-0 flex flex-col h-[calc(100vh-64px)] relative overflow-visible pointer-events-none ${session ? 'sidebar-transition' : ''}`}>
        {session && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-6 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-[#121212] border-2 border-black rounded-full brutal-shadow-sm hover:brutal-shadow transition-all duration-150 z-20 pointer-events-auto"
            style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
            title="Expand sidebar"
          >
            <ChevronLeft className="h-3 w-3 text-black dark:text-white rotate-180 transition-transform" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'w-full' : 'w-80 brutal-sidebar'} flex flex-col ${isMobile ? 'h-full' : 'h-[calc(100vh-64px)]'} relative ${isMobile ? '' : (session ? 'sidebar-transition' : '')} ${isMobile ? '' : 'overflow-y-auto overflow-x-hidden overscroll-none'}`}>
      {/* Arrow Button on Edge (static icon, rotates via CSS) - Hidden on Mobile and for non-logged-in users */}
      {!isMobile && session && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-6 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-[#121212] border-2 border-black rounded-full brutal-shadow-sm hover:brutal-shadow transition-all duration-150 z-20"
          style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
          title="Collapse sidebar"
        >
          <ChevronLeft className={`h-3 w-3 text-black dark:text-white transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b-4 border-black" style={{borderColor: 'var(--border-color)'}}>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-black" style={{color: 'var(--text-primary)'}} />
          <input
            type="text"
            placeholder="Üniversite ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="brutal-input w-full pl-4 pr-12 py-3"
          />
        </div>

        {/* Type Filter - Only show for logged-in users */}
        {session && (
          <div className="flex gap-3 mb-2">
            <button
              onClick={() => {
                setIsSwitchingTabs(true);
                setSelectedType('subscribed');
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 border-2 border-black flex items-center ${
                selectedType === 'subscribed'
                  ? 'bg-yellow-300 text-black brutal-shadow-sm'
                  : 'bg-white text-black hover:bg-pink-100'
              }`}
              style={{backgroundColor: selectedType === 'subscribed' ? '#FFE066' : 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: selectedType === 'subscribed' ? '#000' : 'var(--text-primary)'}}
            >
              <Star className="h-4 w-4 mr-1" />
              Abone
            </button>
            <button
              onClick={() => {
                setIsSwitchingTabs(true);
                setSelectedType('all');
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 border-2 border-black flex items-center ${
                selectedType === 'all'
                  ? 'bg-yellow-300 text-black brutal-shadow-sm'
                  : 'bg-white text-black hover:bg-yellow-100'
              }`}
              style={{backgroundColor: selectedType === 'all' ? '#FFE066' : 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: selectedType === 'all' ? '#000' : 'var(--text-primary)'}}
            >
              Tümü
            </button>
          </div>
        )}
      </div>

      {/* University List */}
      <div className="flex-1 overflow-y-auto transition-opacity duration-300 ease-in-out">
        <div className="p-2">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="block p-4 border-2 border-gray-300 bg-gray-100 dark:border-[#3a3b3c] dark:bg-[#121212]">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 dark:bg-[#8899AC] rounded w-3/4 mb-2"></div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="h-3 bg-gray-200 dark:bg-[#8899AC] rounded w-16"></div>
                      <div className="h-5 bg-gray-200 dark:bg-[#8899AC] rounded w-12"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <div className="h-4 bg-gray-200 dark:bg-[#8899AC] rounded w-8"></div>
                    <div className="h-8 w-8 bg-gray-200 dark:bg-[#8899AC] rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : selectedType === null ? (
          <div className="animate-pulse space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="block p-4 border-2 border-gray-300 bg-gray-100 dark:border-[#3a3b3c] dark:bg-[#121212]">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 dark:bg-[#8899AC] rounded w-3/4 mb-2"></div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="h-3 bg-gray-200 dark:bg-[#8899AC] rounded w-16"></div>
                      <div className="h-5 bg-gray-200 dark:bg-[#8899AC] rounded w-12"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <div className="h-4 bg-gray-200 dark:bg-[#8899AC] rounded w-8"></div>
                    <div className="h-8 w-8 bg-gray-200 dark:bg-[#8899AC] rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUniversities.length === 0 && !isSwitchingTabs ? (
          <div className="text-center py-8 text-black" style={{color: 'var(--text-primary)'}}>
            <Building2 className="h-12 w-12 mx-auto mb-3 text-black" style={{color: 'var(--text-primary)'}} />
            <p className="font-semibold text-lg">
              {selectedType === 'subscribed' 
                ? 'Henüz abone olunan üniversite yok' 
                : searchTerm ? 'Üniversite bulunamadı' : 'Üniversite bulunamadı'
              }
            </p>
            {selectedType === 'subscribed' && (
              <div className="text-sm font-medium text-black mt-2 space-y-1" style={{color: 'var(--text-secondary)'}}>
                <p>İlginizi çeken üniversiteleri keşfetmek için</p>
                <p>"Tümü" sekmesine geçin ve yıldız ikonuna tıklayın</p>
              </div>
            )}
          </div>
        ) : (
            <div className="space-y-3">
              {filteredUniversities.map((university) => (
                <div
                  key={university.id}
                  className="block p-4 border-2 border-black bg-white brutal-shadow-sm hover:brutal-shadow transition-all duration-150 group"
                  style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => onUniversityClick ? onUniversityClick(university.id) : window.location.href = `${window.location.origin}/university/${university.id}`}
                      className="flex-1 min-w-0 text-left"
                    >
                      <h3 className="text-sm font-semibold text-black group-hover:text-pink-600 transition-colors truncate" style={{color: 'var(--text-primary)'}}>
                        {university.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-black" style={{color: 'var(--text-secondary)'}}>{university.city}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium border-2 border-black ${
                          university.type === 'public'
                            ? 'bg-green-300 text-black'
                            : 'bg-purple-300 text-black'
                        }`} style={{borderColor: 'var(--border-color)'}}>
                          {university.type === 'public' ? 'Devlet' : 'Vakıf'}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-3 ml-2">
                      <span className="text-xs text-black font-semibold font-mono" style={{color: 'var(--text-primary)'}}>
                        {university.shortName}
                      </span>
                      {session && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSubscription(university.id, university.isSubscribed || false);
                          }}
                          disabled={subscribing === university.id}
                          className={`p-2 rounded-full border-2 border-black transition-all duration-150 ${
                            university.isSubscribed
                              ? 'bg-yellow-300 text-black brutal-shadow-sm'
                              : 'bg-white text-black hover:bg-pink-100'
                          } ${subscribing === university.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{backgroundColor: university.isSubscribed ? '#FFE066' : 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: university.isSubscribed ? '#000' : 'var(--text-primary)'}}
                          title={university.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                        >
                          <Star 
                            className={`h-4 w-4 ${university.isSubscribed ? 'fill-current' : ''}`} 
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={`p-4 border-t-2 border-black ${isMobile ? 'pb-8' : ''} transition-opacity duration-300 ease-in-out`} style={{borderColor: 'var(--border-color)'}}>
        {loading || selectedType === null ? (
          <div className="animate-pulse">
            <div className="h-3 bg-gray-200 dark:bg-[#8899AC] rounded w-24 mx-auto"></div>
          </div>
        ) : (
          <p className="text-xs text-black font-semibold text-center transition-opacity duration-200 delay-100" style={{color: 'var(--text-primary)'}}>
            {selectedType === 'subscribed' 
              ? `${filteredUniversities.length} abone olunan üniversite`
              : `${filteredUniversities.length} üniversite`
            }
          </p>
        )}
      </div>
    </div>
  );
}
