"use client"

import { SessionProvider } from "next-auth/react"
import { useEffect } from "react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Validate NEXTAUTH_URL format on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nextAuthUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || process.env.NEXTAUTH_URL;
      if (nextAuthUrl) {
        try {
          const url = new URL(nextAuthUrl);
          if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            console.warn('NEXTAUTH_URL has invalid protocol:', nextAuthUrl);
          }
          if (url.pathname !== '/' && url.pathname !== '') {
            console.warn('NEXTAUTH_URL should not have a pathname:', nextAuthUrl);
          }
        } catch (e) {
          console.error('NEXTAUTH_URL is invalid:', nextAuthUrl, e);
        }
      } else {
        console.warn('NEXTAUTH_URL is not set. NextAuth may not work correctly.');
      }
    }
  }, []);

  return (
    <SessionProvider
      basePath="/api/auth"
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  )
}
