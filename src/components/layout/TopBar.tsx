'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, Zap, Shield, Globe } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { usePlayer } from '@/hooks/usePlayer';
import { useGameStore } from '@/lib/store';

export function TopBar() {
  const t = useTranslations('home');
  const { player, isAuthenticated } = usePlayer();

  // Read instant values from Zustand store (synced by SlotMachine/bonus/shop/etc.)
  // The store is updated by usePlayer on first load and by game actions in real-time.
  // We prefer store values because they update instantly (no API round-trip).
  // Fall back to usePlayer API data on first render before the store is populated.
  const storeLumens = useGameStore((s) => s.lumens);
  const storeEnergy = useGameStore((s) => s.energy);
  const storeMaxEnergy = useGameStore((s) => s.maxEnergy);
  const storeLevel = useGameStore((s) => s.level);

  const lumens = player ? storeLumens : (player?.lumens ?? 100);
  const energy = player ? storeEnergy : (player?.energy ?? 100);
  const maxEnergy = player ? storeMaxEnergy : (player?.maxEnergy ?? 100);
  const sanctuaryLevel = player ? storeLevel : (player?.sanctuaryLevel ?? 1);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: App name */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-lumora-gold" />
          <span className="font-fantasy text-sm font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent">
            {isAuthenticated ? player?.displayName || t('welcome') : t('welcome')}
          </span>
        </div>

        {/* Center: Resources */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-lumora-gold/10 px-3 py-1 border border-lumora-gold/15">
            <Sparkles className="h-3.5 w-3.5 text-lumora-gold" />
            <span className="text-xs font-semibold text-lumora-gold font-title">{lumens.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-lumora-blue/10 px-3 py-1 border border-lumora-blue/15">
            <Zap className="h-3.5 w-3.5 text-lumora-blue" />
            <span className="text-xs font-semibold text-lumora-blue font-title">{energy}/{maxEnergy}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-lumora-purple/10 px-3 py-1 border border-lumora-purple/15">
            <Shield className="h-3.5 w-3.5 text-lumora-purple" />
            <span className="text-xs font-semibold text-lumora-purple font-title">{sanctuaryLevel}</span>
          </div>
        </div>

        {/* Right: Event + Language */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-lumora-pink/10 px-2 py-1">
            <Globe className="h-3.5 w-3.5 text-lumora-pink" />
            <span className="text-[10px] text-lumora-pink">Evento</span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
