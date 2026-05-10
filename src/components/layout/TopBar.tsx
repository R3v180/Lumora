'use client';

import { useState, useEffect } from 'react';

import { PlayerAvatar } from '@/components/progression/PlayerAvatar';
import { useTranslations } from 'next-intl';
import { Sparkles, Zap, Shield, Globe, TrendingUp } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { usePlayer } from '@/hooks/usePlayer';
import { useGameStore } from '@/lib/store';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AchievementsPanel } from '@/components/progression/AchievementsPanel';
import { PlayerProfileEditor } from '@/components/progression/PlayerProfileEditor';
import { AudioSettingsPanel } from '@/components/progression/AudioSettingsPanel';
import { DailyChallengesPanel } from '@/components/progression/DailyChallengesPanel';

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
  const storeTotalPower = useGameStore((s) => s.totalPower);

  const lumens = player !== null ? storeLumens : 100;
  const energy = player !== null ? storeEnergy : 100;
  const maxEnergy = player !== null ? storeMaxEnergy : 100;
  const sanctuaryLevel = player !== null ? storeSanctuaryLevel : 1;
  const totalPower = player !== null ? storeTotalPower : 0;

  // Chest notification logic remains for the TopBar badge
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
            <button className="relative flex items-center gap-2 hover:opacity-80 transition-all active:scale-95 shrink-0 group">
              <PlayerAvatar 
                avatarId={player?.avatar} 
                displayName={player?.displayName} 
                size="xs"
                className="border-lumora-gold/30 group-hover:border-lumora-gold/60"
              />
              <div className="flex flex-col items-start leading-none">
                <span className="font-fantasy text-[10px] font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent truncate max-w-[80px] sm:max-w-[120px]">
                  {isAuthenticated ? player?.displayName || t('welcome') : t('welcome')}
                </span>
                <span className="text-[7px] text-white/30 font-black uppercase tracking-widest">
                  LV.{player?.level || 1}
                </span>
              </div>
              {chestCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 rounded-full h-3 w-3 animate-pulse border border-background" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[90vw] sm:max-w-md p-0 bg-background/95 backdrop-blur-md border-r-border/20 flex flex-col overflow-y-auto">
            <SheetHeader className="p-4 border-b border-border/10">
              <SheetTitle className="font-fantasy text-lg text-left text-lumora-gold">{t('travelerProfile')}</SheetTitle>
            </SheetHeader>
            <div className="p-4 flex-1 space-y-6">
              {isAuthenticated ? (
                <>
                  {/* 1. Identity */}
                  <PlayerProfileEditor />

                  {/* 2. Active Progression: Missions */}
                  <div className="space-y-2">
                    <DailyChallengesPanel />
                  </div>

                  {/* 3. Long-term Progression: Achievements */}
                  <AchievementsPanel />

                  {/* 4. Language & Meta */}
                  <div className="flex items-center justify-between rounded-2xl glass-card-subtle p-4 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-lumora-pink/20 flex items-center justify-center border border-lumora-pink/30">
                        <Globe className="h-4 w-4 text-lumora-pink" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Preferencia</span>
                        <span className="text-xs text-white font-bold uppercase">Idioma</span>
                      </div>
                    </div>
                    <LanguageSwitcher />
                  </div>

                  {/* 5. Settings: Audio at the very bottom */}
                  <div className="pt-4 border-t border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                    <AudioSettingsPanel />
                  </div>
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
          <div className="hidden xs:flex items-center gap-1 rounded-full bg-lumora-pink/10 px-2 py-1 border border-lumora-pink/15">
            <TrendingUp className="h-3 w-3 text-lumora-pink" />
            <span className="text-[11px] font-semibold text-lumora-pink font-title">{totalPower >= 1000 ? `${(totalPower/1000).toFixed(1)}k` : totalPower}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
