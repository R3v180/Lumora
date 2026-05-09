'use client';

import { useState, useEffect } from 'react';

import { useTranslations } from 'next-intl';
import { Sparkles, Zap, Shield, Globe } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { usePlayer } from '@/hooks/usePlayer';
import { useGameStore } from '@/lib/store';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AchievementsPanel } from '@/components/progression/AchievementsPanel';
import { PlayerProfileEditor } from '@/components/progression/PlayerProfileEditor';
import { ChestPanel } from '@/components/progression/ChestPanel';

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
  const storeSanctuaryLevel = useGameStore((s) => s.sanctuaryLevel);

  const lumens = player !== null ? storeLumens : 100;
  const energy = player !== null ? storeEnergy : 100;
  const maxEnergy = player !== null ? storeMaxEnergy : 100;
  const sanctuaryLevel = player !== null ? storeSanctuaryLevel : 1;

  // Chest notification
  const [chestCount, setChestCount] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/chest').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.chests) setChestCount(d.chests.length);
    }).catch(() => {});
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 h-14">
        {/* Left: Profile Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0">
              <Sparkles className="h-4 w-4 text-lumora-gold" />
              <span className="font-fantasy text-xs font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent truncate max-w-[80px] sm:max-w-[120px]">
                {isAuthenticated ? player?.displayName || t('welcome') : t('welcome')}
              </span>
              {chestCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 rounded-full h-3 w-3 animate-pulse border border-background" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[90vw] sm:max-w-md p-0 bg-background/95 backdrop-blur-md border-r-border/20 flex flex-col overflow-y-auto">
            <SheetHeader className="p-4 border-b border-border/10">
              <SheetTitle className="font-fantasy text-lg text-left text-lumora-gold">{t('travelerProfile')}</SheetTitle>
            </SheetHeader>
            <div className="p-4 flex-1">
              {isAuthenticated ? (
                <>
                  <PlayerProfileEditor />

                  {/* Event + Language — moved here from TopBar */}
                  <div className="flex items-center justify-between rounded-xl glass-card-subtle p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-lumora-pink" />
                      <span className="text-xs text-lumora-pink font-semibold">Evento Activo</span>
                    </div>
                    <LanguageSwitcher />
                  </div>

                  <ChestPanel />
                  <AchievementsPanel />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Inicia sesión para ver tu perfil.</p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Center: Resources — compact pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-lumora-gold/10 px-2.5 py-1 border border-lumora-gold/15">
            <Sparkles className="h-3 w-3 text-lumora-gold" />
            <span className="text-[11px] font-semibold text-lumora-gold font-title">{lumens.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-lumora-blue/10 px-2.5 py-1 border border-lumora-blue/15">
            <Zap className="h-3 w-3 text-lumora-blue" />
            <span className="text-[11px] font-semibold text-lumora-blue font-title">{energy}/{maxEnergy}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-lumora-purple/10 px-2 py-1 border border-lumora-purple/15">
            <Shield className="h-3 w-3 text-lumora-purple" />
            <span className="text-[11px] font-semibold text-lumora-purple font-title">{sanctuaryLevel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
