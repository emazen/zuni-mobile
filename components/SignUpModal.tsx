'use client';

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Sparkles } from "lucide-react"

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

export default function SignUpModal({ isOpen, onClose, onSwitchToSignIn }: SignUpModalProps) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [gender, setGender] = useState("")
  const [customColor, setCustomColor] = useState("")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    if (!username.trim()) {
      setError("Username is required")
      setLoading(false)
      return
    }

    if (!gender) {
      setError("Please select a gender identity")
      setLoading(false)
      return
    }

    if (gender === "custom" && !customColor) {
      setError("Please select a custom color")
      setLoading(false)
      return
    }

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        email,
        password,
        gender,
        customColor: gender === "custom" ? customColor : "",
        isSignUp: "true",
        redirect: false,
      })

      if (result?.error) {
        // Check if this is the success message (account created but needs verification)
        if (result.error.includes("Account created successfully")) {
          // Close modal and redirect to check email page
          onClose()
          router.push(`/auth/check-email?email=${encodeURIComponent(email)}`)
        } else {
          setError(result.error)
        }
      } else {
        // Close modal and redirect to check email page
        onClose()
        router.push(`/auth/check-email?email=${encodeURIComponent(email)}`)
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white border-4 border-black brutal-shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" 
        style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          {/* Header Section */}
          <div className="text-center mb-8 flex flex-col items-center">
            {/* Logo Icon (Yellow Ball) */}
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 bg-[#FFE066] border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce-subtle relative">
                <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-white/40 rounded-full"></div>
              </div>
            </div>
            <h2 className="text-2xl font-black text-black dark:text-white mb-2 leading-tight" style={{ fontFeatureSettings: '"liga" 1, "kern" 1', textRendering: 'optimizeLegibility' }}>
              Zuni'ye Katıl!
            </h2>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-[280px] leading-relaxed">
              Üniversiteli arkadaşlarınla anonim ve güvenli bir şekilde fikirlerini özgürce paylaş.
            </p>
            
            {/* Enhanced Trust Signals for Sign Up */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500/30 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wider text-center">
                  SADECE .EDU E-POSTASIYLA DOĞRULANMIŞ ÖĞRENCİLER
                </span>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-tighter text-center">
                🔒 KİMLİĞİN HER ZAMAN GİZLİ TUTULUR • VERİLERİN ASLA PAYLAŞILMAZ
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm font-bold" style={{backgroundColor: 'var(--brutal-red)', border: '4px solid var(--border-color)', color: '#fff'}}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-black mb-2" style={{color: 'var(--text-primary)'}}>
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="brutal-input w-full"
                placeholder="Choose your username"
                maxLength={20}
              />
              <p className="mt-2 text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>
                This will be your display name on the board
              </p>
            </div>

            <div>
              <label className="block text-sm font-black mb-3" style={{color: 'var(--text-primary)'}}>
                Gender Identity
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`p-3 brutal-border transition-all relative`}
                  style={{
                    backgroundColor: gender === "male" ? 'var(--brutal-blue)' : 'var(--bg-secondary)',
                    color: gender === "male" ? '#000' : 'var(--text-primary)',
                    borderWidth: '2px',
                    boxShadow: gender === "male" ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none'
                  }}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2 brutal-border"></div>
                    <span className="text-sm font-black">Male</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`p-3 brutal-border transition-all relative`}
                  style={{
                    backgroundColor: gender === "female" ? 'var(--brutal-pink)' : 'var(--bg-secondary)',
                    color: gender === "female" ? '#000' : 'var(--text-primary)',
                    borderWidth: '2px',
                    boxShadow: gender === "female" ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none'
                  }}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 bg-pink-500 rounded-full mx-auto mb-2 brutal-border"></div>
                    <span className="text-sm font-black">Female</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setGender("custom")
                    setShowColorPicker(true)
                  }}
                  className={`p-3 brutal-border transition-all relative`}
                  style={{
                    backgroundColor: gender === "custom" ? 'var(--brutal-purple)' : 'var(--bg-secondary)',
                    color: gender === "custom" ? '#000' : 'var(--text-primary)',
                    borderWidth: '2px',
                    boxShadow: gender === "custom" ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none'
                  }}
                >
                  <div className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-2 brutal-border ${
                      customColor 
                        ? "" 
                        : "bg-gray-400"
                    }`} style={customColor ? { backgroundColor: customColor } : {}}></div>
                    <span className="text-sm font-black">Custom</span>
                  </div>
                </button>
              </div>
              
              {/* Color Picker for Custom Gender */}
              {gender === "custom" && showColorPicker && (
                <div className="mt-4 p-4 brutal-border" style={{backgroundColor: 'var(--bg-secondary)'}}>
                  <label className="block text-sm font-black mb-3" style={{color: 'var(--text-primary)'}}>
                    Choose Your Color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => {
                          setCustomColor(color.value)
                          setShowColorPicker(false)
                        }}
                        className={`p-2 brutal-border transition-all ${
                          customColor === color.value
                            ? "brutal-shadow-sm"
                            : ""
                        }`}
                        style={{
                          backgroundColor: customColor === color.value ? '#FFE066' : 'var(--bg-secondary)',
                          borderColor: 'var(--border-color)'
                        }}
                        title={color.name}
                      >
                        <div className="w-6 h-6 rounded-full mx-auto" style={{ backgroundColor: color.value }}></div>
                      </button>
                    ))}
                  </div>
                  {customColor && (
                    <p className="mt-3 text-xs font-semibold text-center" style={{color: 'var(--text-secondary)'}}>
                      Selected: {colorOptions.find(c => c.value === customColor)?.name || "Custom Color"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-black mb-2" style={{color: 'var(--text-primary)'}}>
                Educational Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brutal-input w-full"
                placeholder="your.email@university.edu"
              />
              <p className="mt-2 text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>
                Only educational email addresses (.edu, .ac.uk, etc.) are accepted.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-black mb-2" style={{color: 'var(--text-primary)'}}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brutal-input w-full"
                placeholder="Create a password (min. 6 characters)"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-black mb-2" style={{color: 'var(--text-primary)'}}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="brutal-input w-full"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full brutal-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
              Already have an account?{" "}
              <button 
                onClick={onSwitchToSignIn} 
                className="font-black hover:text-pink-600 transition-colors" 
                style={{color: 'var(--text-primary)'}}
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

