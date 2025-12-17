import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProviderWrapper } from '@/components/ThemeProviderWrapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })

export const metadata: Metadata = {
  title: 'Zuni',
  description: 'Üniversitene özel gönderiler paylaş ve tartışmalara katıl.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // CRITICAL: Execute immediately, before any CSS or rendering
                // This prevents flash of wrong theme
                // Safari-compatible: use setProperty instead of cssText
                try {
                  // Check if we're on an auth page (signin, signup, verify-email, etc.)
                  var currentPath = window.location.pathname;
                  var isAuthPage = currentPath.startsWith('/auth/');
                  
                  // Get theme from localStorage - respect dark mode preference for logged-out users
                  // First-time visitors (no saved preference) will default to light mode
                  var savedTheme = localStorage.getItem('theme');
                  var theme = savedTheme === 'dark' ? 'dark' : 'light';
                  
                  // Get document elements (available even during script execution)
                  var html = document.documentElement;
                  var body = document.body || document.getElementsByTagName('body')[0];
                  
                  // Immediately remove any existing theme classes
                  html.classList.remove('light', 'dark');
                  if (body) {
                    body.classList.remove('light', 'dark');
                  }
                  
                  // Apply correct theme class BEFORE anything else renders
                  html.classList.add(theme);
                  if (body) {
                    body.classList.add(theme);
                  }
                  
                  // Safari-compatible: use setProperty for each CSS variable
                  // This works better in Safari than cssText
                  if (theme === 'dark') {
                    html.style.setProperty('--bg-primary', '#151515', 'important');
                    html.style.setProperty('--bg-secondary', '#242526', 'important');
                    html.style.setProperty('--text-primary', '#FFFFFF', 'important');
                    html.style.setProperty('--text-secondary', '#8899AC', 'important');
                    html.style.setProperty('--border-color', '#2d2d2d', 'important');
                    html.style.setProperty('background-color', '#151515', 'important');
                    if (body) {
                      body.style.setProperty('background-color', '#151515', 'important');
                      body.style.setProperty('--bg-primary', '#151515', 'important');
                    }
                  } else {
                    html.style.setProperty('--bg-primary', '#F3F4F6', 'important');
                    html.style.setProperty('--bg-secondary', '#FFFFFF', 'important');
                    html.style.setProperty('--text-primary', '#000000', 'important');
                    html.style.setProperty('--text-secondary', '#6B7280', 'important');
                    html.style.setProperty('--border-color', '#000000', 'important');
                    html.style.setProperty('background-color', '#F3F4F6', 'important');
                    if (body) {
                      body.style.setProperty('background-color', '#F3F4F6', 'important');
                      body.style.setProperty('--bg-primary', '#F3F4F6', 'important');
                    }
                  }
                  
                  // Store theme in data attribute (SplashScreen reads this synchronously)
                  html.setAttribute('data-theme', theme);
                  if (body) {
                    body.setAttribute('data-theme', theme);
                  }
                  
                  // Also watch for DOMContentLoaded to ensure body is styled when available
                  // Safari sometimes needs this extra step
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                      var b = document.body;
                      if (b) {
                        b.classList.remove('light', 'dark');
                        if (theme === 'dark') {
                          b.classList.add('dark');
                          b.style.setProperty('background-color', '#151515', 'important');
                          b.style.setProperty('--bg-primary', '#151515', 'important');
                          b.setAttribute('data-theme', 'dark');
                        } else {
                          b.classList.add('light');
                          b.style.setProperty('background-color', '#F3F4F6', 'important');
                          b.style.setProperty('--bg-primary', '#F3F4F6', 'important');
                          b.setAttribute('data-theme', 'light');
                        }
                      }
                    }, { once: true });
                  } else if (body) {
                    // If DOM already loaded, apply immediately
                    body.classList.remove('light', 'dark');
                      if (theme === 'dark') {
                        body.classList.add('dark');
                        body.style.setProperty('background-color', '#151515', 'important');
                        body.style.setProperty('--bg-primary', '#151515', 'important');
                        body.setAttribute('data-theme', 'dark');
                    } else {
                      body.classList.add('light');
                      body.style.setProperty('background-color', '#F3F4F6', 'important');
                      body.style.setProperty('--bg-primary', '#F3F4F6', 'important');
                      body.setAttribute('data-theme', 'light');
                    }
                  }
                } catch (e) {
                  // Fallback: ensure light mode and set attribute
                  document.documentElement.classList.add('light');
                  document.documentElement.style.setProperty('background-color', '#F3F4F6', 'important');
                  document.documentElement.style.setProperty('--bg-primary', '#F3F4F6', 'important');
                  document.documentElement.setAttribute('data-theme', 'light');
                  if (document.body) {
                    document.body.style.setProperty('background-color', '#F3F4F6', 'important');
                  }
                }
              })();
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Default to light mode to prevent flash - script will override if dark */
              /* Safari-compatible: Use !important and explicit body selectors */
              html {
                background-color: #F3F4F6 !important;
              }
              html.light {
                background-color: #F3F4F6 !important;
              }
              html.dark {
                background-color: #202124 !important;
              }
              /* Safari-specific: Explicitly set body background */
              body {
                background-color: #F3F4F6 !important;
              }
              html.light body,
              body.light,
              html.light > body {
                background-color: #F3F4F6 !important;
              }
              html.dark body,
              body.dark,
              html.dark > body {
                background-color: #202124 !important;
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${plusJakarta.variable} font-sans h-full m-0 p-0`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProviderWrapper>
            {children}
          </ThemeProviderWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}
