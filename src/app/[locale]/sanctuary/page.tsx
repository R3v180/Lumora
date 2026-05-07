'use client';

import { useTranslations } from 'next-intl';
import { TreePine } from 'lucide-react';

export default function SanctuaryPage() {
  const t = useTranslations('sanctuary');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-emerald to-lumora-blue bg-clip-text text-transparent mb-4">
        {t('title')}
      </h1>
      <p className="text-muted-foreground text-sm text-center mb-8">
        Tu isla flotante personal se implementará en la Fase 3.
      </p>
      <div className="w-full max-w-md aspect-square rounded-2xl border-2 border-dashed border-lumora-emerald/30 bg-card/40 flex items-center justify-center">
        <div className="text-center">
          <TreePine className="h-16 w-16 text-lumora-emerald mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('myIsland')}</p>
          <p className="text-xs text-muted-foreground mt-1">Isometric View - Coming in Phase 3</p>
        </div>
      </div>
    </div>
  );
}
