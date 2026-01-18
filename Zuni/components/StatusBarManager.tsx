'use client'

import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export default function StatusBarManager() {
  const { theme } = useTheme()

  useEffect(() => {
    // Only run in Capacitor environment
    if (typeof window === 'undefined' || !(window as any).Capacitor) {
      return
    }

    const updateStatusBar = async () => {
      try {
        const { StatusBar } = await import('@capacitor/status-bar')
        
        if (theme === 'dark') {
          // Dark mode: light content on dark background
          await StatusBar.setStyle({ style: 'light' })
          await StatusBar.setBackgroundColor({ color: '#151515' })
        } else {
          // Light mode: dark content on light background
          await StatusBar.setStyle({ style: 'dark' })
          await StatusBar.setBackgroundColor({ color: '#F3F4F6' })
        }
      } catch (error) {
        // StatusBar plugin not available or not installed
        console.debug('StatusBar plugin not available:', error)
      }
    }

    updateStatusBar()
  }, [theme])

  return null
}
