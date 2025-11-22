'use client';

import { useState, useEffect, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

interface AuthModalCombinedProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onAuthenticating?: () => void;
}

export default function AuthModalCombined({ isOpen, onClose, initialMode = 'signin', onAuthenticating }: AuthModalCombinedProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto')
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const signInFormRef = useRef<HTMLDivElement>(null)
  const signUpFormRef = useRef<HTMLDivElement>(null)
  
  // Sign in state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [signInError, setSignInError] = useState("")
  const [signInLoading, setSignInLoading] = useState(false)
  
  // Sign up state
  const [username, setUsername] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [gender, setGender] = useState("")
  const [customColor, setCustomColor] = useState("")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [signUpError, setSignUpError] = useState("")
  const [signUpLoading, setSignUpLoading] = useState(false)
  const router = useRouter()
  
  // Update mode when initialMode prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setShouldAnimate(false) // Don't animate on initial open
      setContainerHeight('auto') // Use auto height on initial open
      setIsMounted(true)
      // Small delay to ensure the component renders in closed state first, then animates open
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 10)
      return () => clearTimeout(timer)
    } else if (isMounted) {
      // Start closing animation
      setIsVisible(false)
      // Unmount after animation completes
      const timer = setTimeout(() => {
        setIsMounted(false)
        setShouldAnimate(false)
        setContainerHeight('auto')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialMode, isMounted])
  
  // Set initial height without animation when modal first opens
  useEffect(() => {
    if (!isOpen || containerHeight !== 'auto') return
    
    const setInitialHeight = () => {
      const activeForm = mode === 'signin' ? signInFormRef.current : signUpFormRef.current
      if (activeForm) {
        const height = activeForm.scrollHeight
        if (height > 0) {
          // Set height immediately without transition
          setContainerHeight(height)
        }
      }
    }
    
    // Use multiple attempts to catch the form when it's rendered
    const timer1 = setTimeout(setInitialHeight, 10)
    const timer2 = setTimeout(setInitialHeight, 50)
    requestAnimationFrame(setInitialHeight)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [isOpen, mode, containerHeight])
  
  // Update container height when mode changes (with animation)
  useEffect(() => {
    if (!isOpen || containerHeight === 'auto') return
    
    // Only animate when switching modes, not on initial mount
    if (!shouldAnimate) {
      setShouldAnimate(true)
      return
    }
    
    const updateHeight = () => {
      // Measure both forms and use the active one's height
      const signInHeight = signInFormRef.current?.scrollHeight || 0
      const signUpHeight = signUpFormRef.current?.scrollHeight || 0
      const targetHeight = mode === 'signin' ? signInHeight : signUpHeight
      
      if (targetHeight > 0) {
        setContainerHeight(targetHeight)
      }
    }
    
    // Multiple attempts to ensure accurate measurement
    const timer1 = setTimeout(updateHeight, 10)
    const timer2 = setTimeout(updateHeight, 50)
    requestAnimationFrame(updateHeight)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [mode, signInError, signUpError, showColorPicker, gender, customColor, shouldAnimate, isOpen, containerHeight])

  // Predefined color options - distinct colors that are easy to tell apart
  const colorOptions = [
    { name: "Red", value: "#EF4444", solid: true },
    { name: "Orange", value: "#F97316", solid: true },
    { name: "Yellow", value: "#EAB308", solid: true },
    { name: "Green", value: "#22C55E", solid: true },
    { name: "Blue", value: "#3B82F6", solid: true },
    { name: "Indigo", value: "#6366F1", solid: true },
    { name: "Purple", value: "#A855F7", solid: true },
    { name: "Pink", value: "#EC4899", solid: true },
    { name: "Rose", value: "#F43F5E", solid: true },
    { name: "Teal", value: "#14B8A6", solid: true },
    { name: "Cyan", value: "#06B6D4", solid: true },
    { name: "Lime", value: "#84CC16", solid: true },
  ]

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInLoading(true)
    setSignInError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        isSignUp: "false",
        redirect: false,
      })

      if (result?.error) {
        setSignInError(result.error)
        setSignInLoading(false)
      } else {
        // Notify parent that we're authenticating (shows splash screen)
        onAuthenticating?.()
        // Keep loading state and reload immediately without closing modal
        window.location.href = '/'
      }
    } catch (err) {
      setSignInError("Bir hata oluştu. Lütfen tekrar deneyin.")
      setSignInLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpLoading(true)
    setSignUpError("")

    if (signUpPassword !== confirmPassword) {
      setSignUpError("Şifreler eşleşmiyor")
      setSignUpLoading(false)
      return
    }

    if (signUpPassword.length < 6) {
      setSignUpError("Şifre en az 6 karakter olmalı")
      setSignUpLoading(false)
      return
    }

    if (!username.trim()) {
      setSignUpError("Kullanıcı adı gerekli")
      setSignUpLoading(false)
      return
    }

    if (!gender) {
      setSignUpError("Lütfen cinsiyet kimliği seçin")
      setSignUpLoading(false)
      return
    }

    if (gender === "custom" && !customColor) {
      setSignUpError("Lütfen özel renk seçin")
      setSignUpLoading(false)
      return
    }

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        email: signUpEmail,
        password: signUpPassword,
        gender,
        customColor: gender === "custom" ? customColor : "",
        isSignUp: "true",
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes("Account created successfully")) {
          // Keep loading and redirect
          window.location.href = `/auth/check-email?email=${encodeURIComponent(signUpEmail)}`
        } else {
          setSignUpError(result.error)
          setSignUpLoading(false)
        }
      } else {
        // Keep loading and redirect
        window.location.href = `/auth/check-email?email=${encodeURIComponent(signUpEmail)}`
      }
    } catch (err) {
      setSignUpError("Bir hata oluştu. Lütfen tekrar deneyin.")
      setSignUpLoading(false)
    }
  }

  // Keep modal mounted during closing animation
  if (!isMounted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity duration-100 ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white dark:bg-[#151515] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md mx-4 overflow-hidden transition-all duration-100 ease-out"
        style={{
          maxHeight: '90vh',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
          transition: 'opacity 100ms ease-out, transform 100ms ease-out, height 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 overflow-y-auto custom-scrollbar" style={{maxHeight: '90vh'}}>
          {/* Toggle Switch */}
          <div className="mb-6">
            <div className="relative flex border-2 border-black rounded-lg overflow-hidden bg-white dark:bg-[#1a1a1a]">
              {/* Animated background slider */}
              <div 
                className="absolute top-0 bottom-0 w-1/2 transition-all duration-300 ease-in-out border-r-2 border-black"
                style={{
                  left: mode === 'signin' ? '0%' : '50%',
                  backgroundColor: '#FFE066',
                  zIndex: 0,
                  borderColor: mode === 'signin' ? 'black' : 'transparent',
                  borderRightWidth: mode === 'signin' ? '2px' : '0px',
                  borderLeftWidth: mode === 'signup' ? '2px' : '0px'
                }}
              />
              
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="relative flex-1 py-3 px-4 font-bold text-sm uppercase tracking-wide transition-colors duration-300 z-10"
                style={{
                  color: mode === 'signin' ? '#000' : 'var(--text-primary)'
                }}
              >
                GİRİŞ YAP
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="relative flex-1 py-3 px-4 font-bold text-sm uppercase tracking-wide transition-colors duration-300 z-10"
                style={{
                  color: mode === 'signup' ? '#000' : 'var(--text-primary)'
                }}
              >
                KAYIT OL
              </button>
            </div>
          </div>

          {/* Forms Container */}
          <div 
            className="relative overflow-hidden"
            style={{
              height: containerHeight === 'auto' ? 'auto' : `${containerHeight}px`,
              transition: shouldAnimate ? 'height 0.2s ease-out' : 'none'
            }}
          >
            {/* Sign In Form */}
            <div 
              ref={signInFormRef}
              className={`w-full ${
                mode === 'signin' 
                  ? 'opacity-100 pointer-events-auto relative' 
                  : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
              style={{
                transition: mode === 'signin' ? 'opacity 0.1s ease-out' : 'none'
              }}
            >
              <form className="space-y-5" onSubmit={handleSignIn}>
              {signInError && (
                <div className="px-4 py-3 rounded border-2 border-black bg-red-500 text-white text-sm font-bold mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {signInError}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide mb-2 text-black dark:text-white">
                  .EDU E-postası
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border-2 border-black rounded font-sans text-base focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder-gray-500 dark:text-white"
                  placeholder="ornek@universite.edu.tr"
                />
                <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Sadece öğrenci e-posta adresleri (.edu, .edu.tr vb.) kabul edilir
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide mb-2 text-black dark:text-white">
                  ŞİFRE
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border-2 border-black rounded font-sans text-base focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder-gray-500 dark:text-white"
                  placeholder="Şifrenizi girin"
                />
              </div>

              <button
                type="submit"
                disabled={signInLoading}
                className="w-full py-3.5 bg-[#FFE066] text-black font-bold rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider mt-2"
              >
                {signInLoading ? "GİRİŞ YAPILIYOR..." : "GİRİŞ YAP"}
              </button>
              </form>
            </div>

            {/* Sign Up Form */}
            <div 
              ref={signUpFormRef}
              className={`w-full ${
                mode === 'signup' 
                  ? 'opacity-100 pointer-events-auto relative' 
                  : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
              style={{
                transition: mode === 'signup' ? 'opacity 0.1s ease-out' : 'none'
              }}
            >
              <form className="space-y-4" onSubmit={handleSignUp}>
              {signUpError && (
                <div className="px-4 py-3 rounded border-2 border-black bg-red-500 text-white text-sm font-bold mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {signUpError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wide mb-2 text-black dark:text-white">
                    KULLANICI ADI
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border-2 border-black rounded font-sans text-sm focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder-gray-500 dark:text-white"
                    placeholder="Kullanıcı adı"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-wide mb-2 text-black dark:text-white">
                    .EDU E-postası
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border-2 border-black rounded font-sans text-sm focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder-gray-500 dark:text-white"
                    placeholder="ornek@universite.edu.tr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2 text-black dark:text-white">
                  CİNSİYET KİMLİĞİ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`p-2 transition-all rounded flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a]`}
                    style={{
                      borderWidth: gender === "male" ? '4px' : '2px',
                      borderStyle: 'solid',
                      borderColor: 'black', // Always black border
                      boxShadow: gender === "male" ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
                      transform: gender === "male" ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-full mb-1 border border-black"></div>
                    <span className="text-xs font-bold text-black dark:text-white">Erkek</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={`p-2 transition-all rounded flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a]`}
                    style={{
                      borderWidth: gender === "female" ? '4px' : '2px',
                      borderStyle: 'solid',
                      borderColor: 'black',
                      boxShadow: gender === "female" ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
                      transform: gender === "female" ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div className="w-6 h-6 bg-pink-500 rounded-full mb-1 border border-black"></div>
                    <span className="text-xs font-bold text-black dark:text-white">Kadın</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setGender("custom")
                      setShowColorPicker(true)
                    }}
                    className={`p-2 transition-all rounded flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a]`}
                    style={{
                      borderWidth: gender === "custom" ? '4px' : '2px',
                      borderStyle: 'solid',
                      borderColor: 'black',
                      boxShadow: gender === "custom" ? '4px 4px 0px 0px rgba(0,0,0,1)' : 'none',
                      transform: gender === "custom" ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div className={`w-6 h-6 rounded-full mb-1 border border-black ${
                      customColor 
                        ? "" 
                        : "bg-gray-400"
                    }`} style={customColor ? { backgroundColor: customColor } : {}}></div>
                    <span className="text-xs font-bold text-black dark:text-white">Özel</span>
                  </button>
                </div>
                
                {/* Color Picker for Custom Gender */}
                {gender === "custom" && showColorPicker && (
                  <div className="mt-2 p-3 border-2 border-black rounded bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="grid grid-cols-6 gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => {
                            setCustomColor(color.value)
                            setShowColorPicker(false)
                          }}
                          className={`w-6 h-6 rounded-full border border-black transition-transform hover:scale-110 ${
                            customColor === color.value ? "ring-2 ring-offset-2 ring-black dark:ring-white" : ""
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-bold uppercase tracking-wide mb-2 text-black dark:text-white">
                    ŞİFRE
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border-2 border-black rounded font-sans text-sm focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder-gray-500 dark:text-white"
                    placeholder="Min. 6 karakter"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wide mb-2 text-black dark:text-white">
                    ŞİFRE TEKRAR
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#1a1a1a] border-2 border-black rounded font-sans text-sm focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow placeholder-gray-500 dark:text-white"
                    placeholder="Şifreyi tekrar girin"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={signUpLoading}
                className="w-full py-3 bg-black text-white font-bold rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider mt-2 dark:bg-white dark:text-black"
              >
                {signUpLoading ? "OLUŞTURULUYOR..." : "HESAP OLUŞTUR"}
              </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

