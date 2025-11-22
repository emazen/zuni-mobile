'use client';

import { Lock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function AuthModal({ isOpen, onClose, onSignIn, onSignUp }: AuthModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Small delay to ensure the component renders in closed state first, then animates open
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10);
      return () => clearTimeout(timer);
    } else if (isMounted) {
      // Start closing animation
      setIsVisible(false);
      // Unmount after animation completes
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMounted]);

  // Keep modal mounted during closing animation
  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="relative bg-white dark:bg-[#151515] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm overflow-hidden transition-all duration-100 ease-out" 
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
          transition: 'opacity 100ms ease-out, transform 100ms ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-[#FFE066] rounded-full border-2 border-black flex items-center justify-center mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Lock className="w-8 h-8 text-black" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-display font-bold text-black dark:text-white mb-3">
            Giriş Yapmalısın
          </h2>

          {/* Description */}
          <p className="text-base font-medium text-gray-600 dark:text-gray-300 mb-8 leading-relaxed font-sans">
            Üniversite panolarını görüntülemek ve sohbete katılmak için giriş yapman gerekiyor.
          </p>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                onClose()
                onSignIn()
              }}
              className="w-full bg-black text-white dark:bg-white dark:text-black font-bold py-3 px-4 rounded border-2 border-black hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
            >
              Giriş Yap
            </button>
            <button
              onClick={() => {
                onClose()
                onSignUp()
              }}
              className="w-full bg-transparent text-black dark:text-white font-bold py-3 px-4 rounded border-2 border-black hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Hesap Oluştur
            </button>
          </div>

          {/* Info */}
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-6">
            Sadece .edu uzantılı email adresleri kabul edilir
          </p>
        </div>
      </div>
    </div>
  );
}

