'use client';

import React from 'react';

interface ShopItemIconProps {
  type: string;
  category: string;
  className?: string;
}

export function ShopItemIcon({ type, category, className = "h-12 w-12" }: ShopItemIconProps) {
  // --- ENERGY POTIONS ---
  if (category === 'energy') {
    const isMinor = type.includes('minor');
    const isMedium = type.includes('medium');
    const color = isMinor ? '#60A5FA' : isMedium ? '#8B5CF6' : '#F59E0B'; // Blue -> Purple -> Gold
    
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad_pot_${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#000', stopOpacity: 0.9 }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Bottle Body */}
        <path d="M30 40 Q30 30 50 30 Q70 30 70 40 L75 80 Q75 90 50 90 Q25 90 25 80 Z" fill={`url(#grad_pot_${type})`} stroke={color} strokeWidth="2" />
        {/* Liquid inner glow */}
        <path d="M35 50 Q35 45 50 45 Q65 45 65 50 L68 80 Q68 85 50 85 Q32 85 32 80 Z" fill={color} opacity="0.3" filter="url(#glow)" />
        {/* Bolt Icon */}
        <path d="M50 45 L58 60 L50 60 L55 75 L42 55 L50 55 Z" fill="white" filter="url(#glow)">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </path>
        {/* Bottle Neck */}
        <rect x="42" y="20" width="16" height="12" rx="4" fill="#333" stroke={color} strokeWidth="1" />
        <rect x="40" y="15" width="20" height="6" rx="2" fill={color} />
      </svg>
    );
  }

  // --- SHIELDS ---
  if (category === 'shields') {
    const isCrystal = type.includes('crystal');
    const isStar = type.includes('star');
    const color = isCrystal ? '#10B981' : isStar ? '#6366F1' : '#EC4899'; // Emerald -> Indigo -> Pink
    
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad_shd_${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#064E3B', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        {/* Shield Shape */}
        <path d="M50 15 L80 25 L80 50 Q80 80 50 90 Q20 80 20 50 L20 25 Z" fill={`url(#grad_shd_${type})`} stroke="white" strokeWidth="2" filter="url(#glow)" />
        {/* Inner Detail */}
        <path d="M50 25 L70 32 L70 50 Q70 70 50 78 Q30 70 30 50 L30 32 Z" fill="white" opacity="0.1" />
        {/* Center Icon (Lock or Star) */}
        {isCrystal ? (
          <path d="M40 50 H60 V70 H40 Z M45 50 V45 Q45 40 50 40 Q55 40 55 45 V50" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
        ) : (
          <path d="M50 35 L55 48 H68 L58 55 L62 68 L50 60 L38 68 L42 55 L32 48 H45 Z" fill="white" filter="url(#glow)" />
        )}
      </svg>
    );
  }

  // --- CHESTS ---
  if (category === 'chests') {
    const isBronze = type.includes('bronze');
    const isSilver = type.includes('silver');
    const mainColor = isBronze ? '#B45309' : isSilver ? '#94A3B8' : '#F59E0B'; // Amber -> Slate -> Gold
    const detailColor = isBronze ? '#78350F' : isSilver ? '#475569' : '#B45309';
    
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad_ch_${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: mainColor }} />
            <stop offset="100%" style={{ stopColor: detailColor }} />
          </linearGradient>
        </defs>
        {/* Chest Base */}
        <rect x="20" y="50" width="60" height="35" rx="4" fill={`url(#grad_ch_${type})`} stroke="#1a1a1a" strokeWidth="2" />
        {/* Chest Lid */}
        <path d="M20 50 Q20 30 50 30 Q80 30 80 50 Z" fill={`url(#grad_ch_${type})`} stroke="#1a1a1a" strokeWidth="2" />
        {/* Vertical Straps */}
        <rect x="30" y="32" width="6" height="53" fill={detailColor} opacity="0.6" stroke="#1a1a1a" strokeWidth="1" />
        <rect x="64" y="32" width="6" height="53" fill={detailColor} opacity="0.6" stroke="#1a1a1a" strokeWidth="1" />
        {/* Keyhole Plate */}
        <circle cx="50" cy="55" r="8" fill="#1a1a1a" />
        <rect x="48" y="55" width="4" height="8" rx="2" fill={mainColor} />
        {/* Sparkle */}
        <circle cx="25" cy="40" r="2" fill="white">
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }

  // --- OTHER ---
  return (
    <div className={`flex items-center justify-center bg-card/40 rounded-xl border border-white/5 ${className}`}>
      <span className="text-2xl">📦</span>
    </div>
  );
}
