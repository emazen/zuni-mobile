'use client'

import Logo from '@/components/Logo'

export default function SplashScreen() {
  // Get theme synchronously from document (set by blocking script in layout)
  // This function is called during render, so it must be synchronous
  const getTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    
    // Priority 1: Check data-theme attribute (set by blocking script immediately)
    const dataTheme = document.documentElement.getAttribute('data-theme')
    if (dataTheme === 'dark') return 'dark'
    if (dataTheme === 'light') return 'light'
    
    // Priority 2: Check class (also set by blocking script)
    if (document.documentElement.classList.contains('dark')) return 'dark'
    if (document.documentElement.classList.contains('light')) return 'light'
    
    // Priority 3: Check localStorage (should already be applied by script, but fallback)
    try {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark') return 'dark'
      if (savedTheme === 'light') return 'light'
    } catch (e) {
      // localStorage not available
    }
    
    // Final fallback
    return 'light'
  }

  // Get theme synchronously - no hooks, no async operations
  const theme = getTheme()
  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center w-full"
      style={{
        backgroundColor: theme === 'light' ? '#F3F4F6' : '#151515',
        transition: 'none', // Prevent any transition during initial load
        minHeight: '-webkit-fill-available'
      }}
    >
      <div className="text-center animate-pulse">
        <div className="scale-[2.5] transform origin-center">
          <Logo />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}
