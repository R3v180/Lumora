'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, GitMerge, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { SlotMachine } from '@/components/game/SlotMachine';
import { MergePanel } from '@/components/game/MergePanel';
import { CollectionPanel } from '@/components/collection/CollectionPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { SpinsHelpDialog } from '@/components/game/SpinsHelpDialog';
import { RaceWidget } from '@/components/game/RaceWidget';

export default function SpinsPage() {
  const t = useTranslations('spins');
  const [showMerge, setShowMerge] = useState(false);
  const [showCollection, setShowCollection] = useState(false);

  return (
    <div className="flex flex-col items-center px-4 pt-4 pb-8 min-h-[70vh]">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 flex flex-col items-center"
      >
        <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent mb-1">
          {t('title')}
        </h1>
        <div className="flex items-center justify-center gap-4 mb-2">
          <SpinsHelpDialog />
        </div>
        <p className="text-xs text-muted-foreground">
          Cada giro planta semillas en Lumora
        </p>
      </motion.div>

      {/* Spin Race Widget */}
      <RaceWidget />

      {/* Slot Machine */}
      <SlotMachine />

      {/* Collection Sheet */}
      <Sheet open={showCollection} onOpenChange={setShowCollection}>
        <SheetContent side="bottom" className="h-[90vh] p-0 border-t-lumora-gold/20 overflow-hidden">
          <CollectionPanel />
        </SheetContent>
      </Sheet>

      {/* Element legend */}
      <div className="mt-6 w-full max-w-sm">
        <div className="rounded-2xl border border-border/20 bg-card/40 p-4">
          <p className="text-xs font-semibold mb-3 text-muted-foreground">
            Símbolos y Elementos
          </p>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">🔥</span>
              <span className="text-[10px] text-lumora-fire">Fuego</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">💧</span>
              <span className="text-[10px] text-lumora-water">Agua</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">🌙</span>
              <span className="text-[10px] text-lumora-dream">Sueño</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">🌿</span>
              <span className="text-[10px] text-lumora-nature">Naturaleza</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">⭐</span>
              <span className="text-[10px] text-lumora-star">Estrella</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-base">🌀</span>
              <span className="text-[10px] text-lumora-gold">Wild = Comodín</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-base">🌱</span>
              <span className="text-[10px] text-lumora-emerald">Semilla = Bonus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Merge Panel */}
      <MergePanel isOpen={showMerge} onClose={() => setShowMerge(false)} />
    </div>
  );
}
