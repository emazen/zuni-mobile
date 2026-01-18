// Cache for universities data (since it rarely changes)
let universitiesCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getUniversitiesCache() {
  return {
    cache: universitiesCache,
    timestamp: cacheTimestamp,
    duration: CACHE_DURATION,
  };
}

export function setUniversitiesCache(cache: any[], timestamp: number) {
  universitiesCache = cache;
  cacheTimestamp = timestamp;
}

// Export function to invalidate cache (called when posts are created/deleted)
export function invalidateUniversitiesCache() {
  universitiesCache = null;
  cacheTimestamp = 0;
}
