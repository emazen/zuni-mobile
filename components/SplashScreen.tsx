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
          /* Base scale for consistent proportions across all devices */
          /* Desktop (1920px): 2.5 = ~0.13% of viewport */
          /* Mobile (375px): ~0.49 = same visual proportion */
          transform: scale(2.5);
        }
        
        /* Proportional scaling: maintain same visual size ratio */
        /* Desktop: 1920px base, Mobile: 375px (0.195x ratio) */
        /* To maintain same visual proportion: 2.5 * 0.195 ≈ 0.49 */
        /* But we want it bigger on mobile, so using proportional calculation */
        @media (max-width: 640px) {
          .splash-logo-wrapper {
            /* Mobile viewport is ~375px, desktop is ~1920px */
            /* Ratio: 375/1920 = 0.195 */
            /* To maintain visual proportion: 2.5 * (375/1920) * 4 ≈ 1.95 */
            /* Using a more visible scale while maintaining proportion */
            transform: scale(1.95);
          }
        }
        
        @media (min-width: 641px) and (max-width: 1024px) {
          .splash-logo-wrapper {
            /* Tablet: ~768px, ratio: 768/1920 = 0.4 */
            /* Proportional: 2.5 * 0.4 * 2.25 ≈ 2.25 */
            transform: scale(2.25);
          }
        }
        
        @media (min-width: 1025px) {
          .splash-logo-wrapper {
            transform: scale(2.5);
          }
        }
      `}</style>
    </div>
  )
}
