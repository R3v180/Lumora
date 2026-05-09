'use client';

import React from 'react';
import { Sparkles, Zap, Box, Palette, Crown, Coffee, Wind, Heart, Star, Cloud } from 'lucide-react';

interface ShopItemIconProps {
  type: string;
  category: string;
  className?: string;
}

export function ShopItemIcon({ type, category, className = "h-12 w-12" }: ShopItemIconProps) {
  // Map types to specific SVG/Icon representations
  if (category === 'boost') {
    if (type === 'energy' || type === 'energy_refill') return <Zap className={`${className} text-lumora-blue`} />;
    if (type === 'exp_boost') return <Star className={`${className} text-lumora-purple`} />;
    return <Zap className={`${className} text-lumora-blue`} />;
  }

  if (category === 'pass') {
    return <Crown className={`${className} text-lumora-gold`} />;
  }

  // Decorative SVGs
  switch (type) {
    case 'fountain':
      return (
        <div className={`relative ${className}`}>
          <Cloud className="absolute inset-0 text-blue-400 opacity-50 blur-[2px]" />
          <Wind className="relative z-10 text-blue-500 animate-pulse" />
        </div>
      );
    case 'crystal':
      return (
        <div className={`relative ${className}`}>
          <div className="absolute inset-0 bg-lumora-purple/30 rounded-full blur-xl animate-pulse" />
          <Sparkles className="relative z-10 text-lumora-purple" />
        </div>
      );
    case 'lamp':
      return (
        <div className={`relative ${className}`}>
          <div className="absolute inset-0 bg-lumora-gold/40 rounded-full blur-md" />
          <Star className="relative z-10 text-lumora-gold animate-bounce" />
        </div>
      );
    case 'tree':
      return (
        <div className={`relative ${className}`}>
          <Heart className="absolute inset-0 text-lumora-emerald opacity-40 blur-[1px]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-1.5 h-4 bg-amber-900/40 rounded-full mb-[-4px]" />
            <Cloud className="h-8 w-8 text-lumora-emerald" />
          </div>
        </div>
      );
    case 'flower_bed':
      return (
        <div className={`relative ${className} flex items-center justify-center`}>
          <div className="absolute inset-0 bg-lumora-pink/20 rounded-full" />
          <Palette className="relative z-10 text-lumora-pink" />
        </div>
      );
    default:
      return <Box className={`${className} text-muted-foreground`} />;
  }
}
