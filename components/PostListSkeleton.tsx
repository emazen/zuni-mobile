'use client'

export default function PostListSkeleton() {
  return (
    <div className="pt-6">
      {/* My Posts Section Skeleton */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4 flex items-center">
          <div className="h-6 w-6 bg-gray-200 dark:bg-[#8899AC] rounded animate-pulse mr-3"></div>
          <div className="h-6 bg-gray-200 dark:bg-[#8899AC] rounded w-32 animate-pulse"></div>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="relative group">
              {/* Message count badge skeleton */}
              <div className="absolute -top-3 -right-3 flex items-center gap-1 z-30 pointer-events-none">
                <div className="text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center animate-pulse bg-gray-100 dark:bg-[#8899AC]">
                  <div className="w-3 h-3 rounded bg-gray-200 dark:bg-[#8899AC]"></div>
                </div>
              </div>
              
              <div className="border-2 border-gray-200 dark:border-[#3a3b3c] h-64 flex flex-col overflow-hidden bg-white dark:bg-[#121212]">
                <div className="flex-1 flex flex-col">
                  {/* University info skeleton */}
                  <div className="flex items-center gap-3 mb-3 px-6 pt-6">
                    <div className="h-5 w-16 bg-gray-100 dark:bg-[#8899AC] rounded-full animate-pulse border border-gray-200 dark:border-[#3a3b3c]"></div>
                    <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-32 animate-pulse"></div>
                  </div>
                  
                  {/* Post content area */}
                  <div className="text-left w-full flex-1 flex flex-col overflow-hidden px-6">
                    {/* Post title skeleton */}
                    <div className="mb-3 overflow-hidden">
                      <div className="h-6 bg-gray-100 dark:bg-[#8899AC] rounded w-3/4 animate-pulse mb-1"></div>
                      <div className="h-6 bg-gray-100 dark:bg-[#8899AC] rounded w-1/2 animate-pulse"></div>
                    </div>
                    
                    {/* Post content skeleton */}
                    <div className="flex-1 overflow-hidden">
                      <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-full animate-pulse mb-1"></div>
                      <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-5/6 animate-pulse mb-1"></div>
                      <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-4/6 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {/* Footer skeleton */}
                <div className="flex items-center text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3b3c] px-6">
                  <div className="flex items-center mr-4">
                    <div className="w-4 h-4 bg-gray-100 dark:bg-[#8899AC] rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-xs">
                    <div className="h-3 bg-gray-100 dark:bg-[#8899AC] rounded w-24 animate-pulse"></div>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posts with Comments Section Skeleton */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4 flex items-center">
          <div className="h-5 w-5 bg-gray-200 dark:bg-[#8899AC] rounded animate-pulse mr-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-[#8899AC] rounded w-48 animate-pulse"></div>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="relative group">
              {/* Message count badge skeleton */}
              <div className="absolute -top-3 -right-3 flex items-center gap-1 z-30 pointer-events-none">
                <div className="text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center animate-pulse bg-gray-100 dark:bg-[#8899AC]">
                  <div className="w-3 h-3 rounded bg-gray-200 dark:bg-[#8899AC]"></div>
                </div>
              </div>
              
              <div className="border-2 border-gray-200 dark:border-[#3a3b3c] h-64 flex flex-col overflow-hidden bg-white dark:bg-[#121212]">
                <div className="flex-1 flex flex-col">
                  {/* University info skeleton */}
                  <div className="flex items-center gap-3 mb-3 px-6 pt-6">
                    <div className="h-5 w-16 bg-gray-100 dark:bg-[#8899AC] rounded-full animate-pulse border border-gray-200 dark:border-[#3a3b3c]"></div>
                    <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-32 animate-pulse"></div>
                  </div>
                  
                  {/* Post content area */}
                  <div className="text-left w-full flex-1 flex flex-col overflow-hidden px-6">
                    {/* Post title skeleton */}
                    <div className="mb-3 overflow-hidden">
                      <div className="h-6 bg-gray-100 dark:bg-[#8899AC] rounded w-3/4 animate-pulse mb-1"></div>
                      <div className="h-6 bg-gray-100 dark:bg-[#8899AC] rounded w-1/2 animate-pulse"></div>
                    </div>
                    
                    {/* Post content skeleton */}
                    <div className="flex-1 overflow-hidden">
                      <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-full animate-pulse mb-1"></div>
                      <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-5/6 animate-pulse mb-1"></div>
                      <div className="h-4 bg-gray-100 dark:bg-[#8899AC] rounded w-4/6 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {/* Footer skeleton */}
                <div className="flex items-center text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3b3c] px-6">
                  <div className="flex items-center mr-4">
                    <div className="w-4 h-4 bg-gray-100 dark:bg-[#8899AC] rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-xs">
                    <div className="h-3 bg-gray-100 dark:bg-[#8899AC] rounded w-24 animate-pulse"></div>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}