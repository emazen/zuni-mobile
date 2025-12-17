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
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        backgroundColor: theme === 'light' ? '#F3F4F6' : '#151515',
        transition: 'none', // Prevent any transition during initial load
        height: '100dvh', // Dynamic viewport height for mobile
        minHeight: '-webkit-fill-available',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
      }}
    >
      <div 
        className="flex items-center justify-center w-full"
        style={{
          padding: '0 1rem'
        }}
      >
        <div className="splash-logo-wrapper animate-pulse">
          <Logo />
        </div>
      </div>
      
      <style jsx>{`
        .splash-logo-wrapper {
          transform-origin: center;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Standard splash screen size: 1.5x scale for all devices */
          transform: scale(1.5);
        }
      `}</style>
      <style jsx global>{`
        .splash-logo-wrapper span {
          font-size: 1.875rem !important; /* text-3xl - force same size on all devices */
          line-height: 2.25rem !important;
        }
      `}</style>
    </div>
  )
}
