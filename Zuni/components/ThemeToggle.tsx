'use client'

import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, effectiveTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
      style={{
        backgroundColor: effectiveTheme === 'dark' ? '#FFE066' : '#E5E7EB',
        border: '2px solid var(--border-color)'
      }}
      aria-label="Toggle theme"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          effectiveTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
        }`}
        style={{
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      />
    </button>
  )
}
