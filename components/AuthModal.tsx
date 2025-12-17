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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, []);

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
      }, isMobile ? 200 : 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMounted]);

  // Keep modal mounted during closing animation
  if (!isMounted) return null;

  return (
    <div className={`fixed inset-0 z-50 ${isMobile ? 'flex items-end' : 'flex items-center justify-center p-4'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity ease-out ${isMobile ? 'duration-200' : 'duration-100'}`}
        style={{
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative bg-white dark:bg-[#151515] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full overflow-hidden transition-all ease-out ${
          isMobile ? 'max-w-full duration-200' : 'max-w-sm rounded-xl duration-100'
        }`}
        style={{
          maxHeight: isMobile ? '100vh' : '90vh',
          height: isMobile ? '100vh' : 'auto',
          opacity: isVisible ? 1 : 0,
          transform: isVisible 
            ? (isMobile ? 'translateY(0)' : 'scale(1) translateY(0)')
            : (isMobile ? 'translateY(100%)' : 'scale(0.95) translateY(-10px)'),
          transition: isMobile 
            ? 'opacity 200ms ease-out, transform 200ms ease-out'
            : 'opacity 100ms ease-out, transform 100ms ease-out',
          ...(isMobile && {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 0,
            margin: 0,
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
            borderRadius: 0
          })
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle / Close Arrow - Mobile Only */}
        {isMobile && (
          <div 
            className="flex justify-center pt-3 pb-2 cursor-pointer"
            onClick={onClose}
          >
            <div className="w-12 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          </div>
        )}
        
        {/* Content */}
        <div className={`text-center ${isMobile ? 'px-6 py-6 h-full' : 'p-8'} overflow-y-auto custom-scrollbar`} style={{maxHeight: isMobile ? '100vh' : '90vh'}}>
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

