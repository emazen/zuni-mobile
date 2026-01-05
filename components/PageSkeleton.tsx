'use client'

export default function PageSkeleton() {
  return (
    <div className="pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="relative group h-full">
            <div className="absolute -top-3 -right-3 min-w-[32px] h-8 px-2 flex items-center justify-center rounded-full shadow-md z-20 pointer-events-none bg-gray-200 dark:bg-[#8899AC] animate-pulse">
              <div className="w-3 h-3 rounded bg-gray-300/80 dark:bg-black/10" />
            </div>

            <div className="relative h-[260px] bg-white dark:bg-[#151515] border-2 border-gray-200 dark:border-gray-700 rounded-xl flex flex-col p-4 overflow-visible" style={{ transform: 'translateY(2mm)' }}>
              {/* Metadata row */}
              <div className="flex justify-between items-center mb-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-[#8899AC] animate-pulse" />
                  <div className="h-4 w-14 rounded bg-gray-200 dark:bg-[#8899AC] animate-pulse ml-2" />
                </div>
              </div>

              {/* Title */}
              <div className="mb-2 min-h-[52px]">
                <div className="h-6 bg-gray-200 dark:bg-[#8899AC] rounded w-4/5 animate-pulse mb-2" />
                <div className="h-6 bg-gray-200 dark:bg-[#8899AC] rounded w-3/5 animate-pulse" />
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-4 bg-gray-200 dark:bg-[#8899AC] rounded w-full animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-[#8899AC] rounded w-5/6 animate-pulse" />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-auto flex-shrink-0">
                <div className="h-6 w-36 bg-gray-200 dark:bg-[#8899AC] rounded-lg animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-gray-200 dark:bg-[#8899AC] animate-pulse" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-[#8899AC] rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
