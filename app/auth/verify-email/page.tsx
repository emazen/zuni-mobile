"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, RefreshCw, ArrowRight, ArrowLeft } from "lucide-react"
import { Logo } from "@/components/Logo"

export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [hasVerified, setHasVerified] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Doğrulama jetonu bulunamadı')
      return
    }

    // Prevent double verification calls
    if (hasVerified) {
      return
    }

    verifyEmail(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const verifyEmail = async (token: string) => {
    if (hasVerified) {
      return // Prevent double calls
    }

    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        // First successful verification
        setHasVerified(true)
        setStatus('success')
        setMessage('E-postan başarıyla doğrulandı! Artık hesabına giriş yapabilirsin.')
      } else {
        // Check if error suggests user might already be verified (from a previous verification)
        if (data.error?.includes('already been used') || data.error?.includes('already verified')) {
          // Only show "already verified" if we haven't already shown success
          // This handles the case where React Strict Mode causes double calls
          if (!hasVerified) {
            setHasVerified(true)
            setStatus('success')
            setMessage('E-postan başarıyla doğrulandı! Artık hesabına giriş yapabilirsin.')
          }
        } else if (data.error?.includes('expired')) {
          setStatus('expired')
          setMessage('Doğrulama bağlantısının süresi doldu. Lütfen yenisini iste.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Doğrulama başarısız. Lütfen tekrar dene.')
        }
      }
    } catch (error) {
      setStatus('error')
      setMessage('Doğrulama sırasında bir hata oluştu. Lütfen tekrar dene.')
    }
  }

  const resendVerification = async () => {
    setResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        setMessage('Yeni bir doğrulama e-postası gelen kutuna gönderildi.')
      } else {
        setMessage(data.error || 'Doğrulama e-postası gönderilemedi.')
      }
    } catch (error) {
      setMessage('Bir hata oluştu. Lütfen tekrar dene.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FFFDF5] dark:bg-black transition-colors duration-300">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Logo className="scale-150" />
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#151515] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="p-8 text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-6 dark:border-white dark:border-t-transparent"></div>
                <h2 className="text-2xl font-display font-bold text-black dark:text-white mb-2">
                  Doğrulanıyor...
                </h2>
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  E-postan doğrulanıyor, lütfen bekle...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-20 h-20 bg-[#4ADE80] rounded-full border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <CheckCircle className="h-10 w-10 text-black" />
                </div>
                
                <h2 className="text-3xl font-display font-bold text-black dark:text-white mb-4">
                  E-posta Doğrulandı!
                </h2>
                
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-8 font-sans">
                  {message}
                </p>

                <Link
                  href="/"
                  className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-3 px-4 rounded border-2 border-black hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2"
                >
                  Hesabına Giriş Yap
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-20 h-20 bg-[#EF4444] rounded-full border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <XCircle className="h-10 w-10 text-white" />
                </div>
                
                <h2 className="text-3xl font-display font-bold text-black dark:text-white mb-4">
                  Doğrulama Başarısız
                </h2>
                
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-8 font-sans">
                  {message}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={resendVerification}
                    disabled={resending}
                    className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-3 px-4 rounded border-2 border-black hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Tekrar Gönder
                      </>
                    )}
                  </button>
                  
                  <Link
                    href="/"
                    className="w-full bg-transparent text-black dark:text-white font-bold py-3 px-4 rounded border-2 border-black hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Ana Sayfaya Dön
                  </Link>
                </div>
              </>
            )}

            {status === 'expired' && (
              <>
                <div className="w-20 h-20 bg-[#F97316] rounded-full border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <XCircle className="h-10 w-10 text-black" />
                </div>
                
                <h2 className="text-3xl font-display font-bold text-black dark:text-white mb-4">
                  Bağlantı Süresi Doldu
                </h2>
                
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-8 font-sans">
                  {message}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={resendVerification}
                    disabled={resending}
                    className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-3 px-4 rounded border-2 border-black hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Yeni Bağlantı İste
                      </>
                    )}
                  </button>
                  
                  <Link
                    href="/"
                    className="w-full bg-transparent text-black dark:text-white font-bold py-3 px-4 rounded border-2 border-black hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Ana Sayfaya Dön
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Yardıma mı ihtiyacın var?{" "}
            <a href="mailto:support@zuni.social" className="font-bold text-black dark:text-white hover:underline decoration-2 underline-offset-2">
              Destek ile İletişime Geç
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
