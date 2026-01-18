import React from 'react';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 select-none group ${className}`}>
      <span className="font-display font-black text-3xl tracking-tighter" style={{color: 'var(--text-primary)'}}>
        Zuni
      </span>
      <div className="h-3 w-3 bg-yellow-400 border-2 border-black rounded-full mt-3 group-hover:bg-pink-400 transition-colors duration-200" style={{borderColor: 'var(--text-primary)'}}></div>
    </div>
  );
}

