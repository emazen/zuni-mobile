'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  effectiveTheme: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  isLoggedIn?: boolean
}

export function ThemeProvider({ children, isLoggedIn = false }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Function to apply theme to document
  // Safari-compatible: use setProperty with 'important' flag for reliable application
  const applyTheme = (themeToApply: Theme) => {
    const html = document.documentElement
    const body = document.body
    
    if (themeToApply === 'dark') {
      html.classList.remove('light')
      html.classList.add('dark')
      if (body) {
        body.classList.remove('light')
        body.classList.add('dark')
      }
      // Safari-compatible: use setProperty with 'important' for reliable updates
      html.style.setProperty('--bg-primary', '#151515', 'important')
      html.style.setProperty('--bg-secondary', '#242526', 'important')
      html.style.setProperty('--text-primary', '#FFFFFF', 'important')
      html.style.setProperty('--text-secondary', '#8899AC', 'important')
      html.style.setProperty('--border-color', '#2d2d2d', 'important')
      html.style.setProperty('background-color', '#151515', 'important')
      if (body) {
        body.style.setProperty('background-color', '#151515', 'important')
        // Force Safari to recognize the change
        body.style.setProperty('--bg-primary', '#151515', 'important')
      }
    } else {
      html.classList.remove('dark')
      html.classList.add('light')
      if (body) {
        body.classList.remove('dark')
        body.classList.add('light')
      }
      // Safari-compatible: use setProperty with 'important' for reliable updates
      html.style.setProperty('--bg-primary', '#F3F4F6', 'important')
      html.style.setProperty('--bg-secondary', '#FFFFFF', 'important')
      html.style.setProperty('--text-primary', '#000000', 'important')
      html.style.setProperty('--text-secondary', '#6B7280', 'important')
      html.style.setProperty('--border-color', '#000000', 'important')
      html.style.setProperty('background-color', '#F3F4F6', 'important')
      if (body) {
        body.style.setProperty('background-color', '#F3F4F6', 'important')
        // Force Safari to recognize the change
        body.style.setProperty('--bg-primary', '#F3F4F6', 'important')
      }
    }
    
    // Update data-theme attribute for Safari compatibility
    html.setAttribute('data-theme', themeToApply)
    if (body) {
      body.setAttribute('data-theme', themeToApply)
    }
  }

  useEffect(() => {
    setMounted(true)
    
    // Theme is already applied by blocking script on initial load, but we need to handle route changes
    // For both logged-in and logged-out users (including auth pages), check localStorage
    // This allows logged-out users to keep their dark mode preference on auth pages too
    // First-time visitors will have no saved theme, so it defaults to light
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    const themeToUse = savedTheme || currentTheme || 'light'
    setTheme(themeToUse)
    // Only apply if different (to avoid flicker)
    if (document.documentElement.getAttribute('data-theme') !== themeToUse) {
      applyTheme(themeToUse)
    }
  }, [isLoggedIn, pathname])

  const toggleTheme = () => {
    // Allow theme toggle for both logged-in and logged-out users (including on auth pages)
    // This saves the preference to localStorage so logged-out users can keep their choice
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
    
    // Safari-compatible: Force a reflow to ensure styles are applied
    // Safari sometimes needs this to properly update CSS variables
    if (typeof window !== 'undefined' && document.documentElement) {
      // Trigger a reflow by reading offsetHeight
      void document.documentElement.offsetHeight
      // Also update data-theme attribute immediately
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }

  // Calculate effective theme - use the actual theme which respects localStorage
  // This works for both logged-in and logged-out users, including on auth pages
  const effectiveTheme = theme

  // Apply effective theme to document
  useEffect(() => {
    if (mounted) {
      applyTheme(effectiveTheme)
    }
  }, [effectiveTheme, mounted])

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

