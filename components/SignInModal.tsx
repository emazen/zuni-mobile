'use client';

import { useState } from "react"
import { signIn } from "next-auth/react"
import { ShieldCheck, Sparkles } from "lucide-react"

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp: () => void;
}

export default function SignInModal({ isOpen, onClose, onSwitchToSignUp }: SignInModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        isSignUp: "false",
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        onClose()
        window.location.reload()
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
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
            <h2 className="text-2xl font-black text-black dark:text-white mb-2 leading-tight text-center">
              Tekrar Hoş Geldin!
            </h2>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-[280px] leading-relaxed text-center">
              Kampüsteki son gelişmeleri kaçırma, hemen giriş yap.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm font-bold" style={{backgroundColor: 'var(--brutal-red)', border: '4px solid var(--border-color)', color: '#fff'}}>
                {error}
              </div>
            )}

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
                Only educational email addresses (.edu, .ac.uk, etc.) are accepted
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
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full brutal-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
              Don't have an account?{" "}
              <button 
                onClick={onSwitchToSignUp} 
                className="font-black hover:text-pink-600 transition-colors" 
                style={{color: 'var(--text-primary)'}}
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

