'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, Zap, Shield, Globe } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function TopBar() {
  const t = useTranslations('home');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: App name */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-lumora-gold" />
          <span className="font-fantasy text-sm font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent">
            {t('welcome')}
          </span>
        </div>

        {/* Center: Resources */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-lumora-gold/10 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-lumora-gold" />
            <span className="text-xs font-semibold text-lumora-gold">100</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-lumora-blue/10 px-3 py-1">
            <Zap className="h-3.5 w-3.5 text-lumora-blue" />
            <span className="text-xs font-semibold text-lumora-blue">100</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-lumora-purple/10 px-3 py-1">
            <Shield className="h-3.5 w-3.5 text-lumora-purple" />
            <span className="text-xs font-semibold text-lumora-purple">1</span>
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
