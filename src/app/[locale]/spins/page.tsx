'use client';

import { useTranslations } from 'next-intl';

export default function SpinsPage() {
  const t = useTranslations('spins');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent mb-4">
        {t('title')}
      </h1>
      <p className="text-muted-foreground text-sm text-center mb-8">
        La mecánica de tragaperras se implementará en la Fase 2 con Phaser 3.
      </p>
      <div className="w-full max-w-md aspect-[5/4] rounded-2xl border-2 border-dashed border-lumora-purple/30 bg-card/40 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🎰</div>
          <p className="text-sm text-muted-foreground">Dream Spin Engine</p>
          <p className="text-xs text-muted-foreground mt-1">Phaser 3 Integration - Coming in Phase 2</p>
        </div>
      </div>
    </div>
  );
}
