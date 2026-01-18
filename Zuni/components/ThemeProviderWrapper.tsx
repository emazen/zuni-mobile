'use client'

import { useSession } from 'next-auth/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useEffect } from 'react'

interface ThemeProviderWrapperProps {
  children: React.ReactNode
}

export function ThemeProviderWrapper({ children }: ThemeProviderWrapperProps) {
  const { data: session } = useSession()
  const isLoggedIn = !!session

  useEffect(() => {
    // Theme is already applied by blocking script in layout.tsx
    // This effect only ensures consistency and enables transitions
    
    // Add theme-loaded class to enable transitions after component mounts
    // Use a small delay to ensure blocking script has run
    const timer = setTimeout(() => {
      document.documentElement.classList.add('theme-loaded')
      document.body.classList.add('theme-loaded')
    }, 0)
    
    return () => clearTimeout(timer)
  }, [isLoggedIn])

  return (
    <ThemeProvider isLoggedIn={isLoggedIn}>
      {children}
    </ThemeProvider>
  )
}
