"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mail, RefreshCw, ArrowLeft } from "lucide-react"
import { Logo } from "@/components/Logo"

export default function CheckEmail() {
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  const resendVerification = async () => {
    setResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
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
            {/* Icon */}
            <div className="w-20 h-20 bg-[#FFE066] rounded-full border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Mail className="h-10 w-10 text-black" />
            </div>
            
            <h2 className="text-3xl font-display font-bold text-black dark:text-white mb-4">
              E-postanı Kontrol Et
            </h2>
            
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-6 font-sans">
              E-posta adresine bir doğrulama bağlantısı gönderdik.
            </p>
            
            {email && (
              <div className="inline-block px-4 py-2 bg-gray-100 dark:bg-[#1a1a1a] border-2 border-black rounded font-mono text-sm font-bold mb-6 text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0)]">
                {email}
              </div>
            )}

            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8">
              Lütfen gelen kutunu kontrol et ve hesabını etkinleştirmek için doğrulama bağlantısına tıkla.
            </p>

            {message && (
              <div className={`px-4 py-3 rounded border-2 border-black text-sm font-bold mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                message.includes('gönderildi') 
                  ? 'bg-[#4ADE80] text-black' 
                  : 'bg-[#EF4444] text-white'
              }`}>
                {message}
              </div>
            )}

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
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            E-postayı almadın mı? Spam klasörünü kontrol et veya{" "}
            <button
              onClick={resendVerification}
              disabled={resending}
              className="font-bold text-black dark:text-white hover:underline decoration-2 underline-offset-2"
            >
              tekrar gönder
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
