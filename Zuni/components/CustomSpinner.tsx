'use client'

interface CustomSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CustomSpinner({ size = 'md', className = '' }: CustomSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="relative w-full h-full">
        {/* Simple dots animation */}
        <div className="flex space-x-1 justify-center items-center h-full">
          <div 
            className="w-1 h-1 rounded-full animate-bounce" 
            style={{
              animationDelay: '0ms',
              backgroundColor: 'var(--text-secondary)'
            }}
          ></div>
          <div 
            className="w-1 h-1 rounded-full animate-bounce" 
            style={{
              animationDelay: '150ms',
              backgroundColor: 'var(--text-secondary)'
            }}
          ></div>
          <div 
            className="w-1 h-1 rounded-full animate-bounce" 
            style={{
              animationDelay: '300ms',
              backgroundColor: 'var(--text-secondary)'
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}
