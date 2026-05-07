'use client';

import { useTranslations } from 'next-intl';
import { ShoppingBag, Sparkles, Crown, Palette, Box, Zap } from 'lucide-react';

export default function ShopPage() {
  const t = useTranslations('shop');

  const categories = [
    { key: 'lumenPacks', icon: Sparkles, color: 'lumora-gold' },
    { key: 'seasonPass', icon: Crown, color: 'lumora-purple' },
    { key: 'cosmetics', icon: Palette, color: 'lumora-pink' },
    { key: 'bundles', icon: Box, color: 'lumora-emerald' },
    { key: 'boosts', icon: Zap, color: 'lumora-blue' },
  ] as const;

  return (
    <div className="flex flex-col items-center px-4 pt-6">
      <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-emerald bg-clip-text text-transparent mb-6">
        {t('title')}
      </h1>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              className="flex items-center gap-4 rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 hover:bg-card/80 transition-colors"
            >
              <div className={`rounded-xl bg-${cat.color}/10 p-3`}>
                <Icon className={`h-6 w-6 text-${cat.color}`} />
              </div>
              <div className="text-left">
                <span className="font-semibold text-sm">{t(cat.key)}</span>
                <p className="text-xs text-muted-foreground">Disponible pronto</p>
              </div>
              <ShoppingBag className="h-4 w-4 text-muted-foreground ml-auto" />
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Shop and monetization coming in Phase 5
      </p>
    </div>
  );
}
