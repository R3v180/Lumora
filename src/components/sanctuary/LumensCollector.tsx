'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// === TYPES ===
interface LumensCollectorProps {
  idleLumens: number;
  lumensPerHour: number;
  hoursSinceCollection: number;
  totalLumens: number;
  onCollect: () => Promise<{ collected: number; totalLumens: number } | null>;
}

export function LumensCollector({
  idleLumens,
  lumensPerHour,
  hoursSinceCollection,
  totalLumens,
  onCollect,
}: LumensCollectorProps) {
  const [isCollecting, setIsCollecting] = useState(false);
  const [justCollected, setJustCollected] = useState<number | null>(null);
  const [showFloatingLumens, setShowFloatingLumens] = useState(false);

  const handleCollect = async () => {
    if (idleLumens <= 0 || isCollecting) return;

    setIsCollecting(true);
    try {
      const result = await onCollect();
      if (result && result.collected > 0) {
        setJustCollected(result.collected);
        setShowFloatingLumens(true);
        setTimeout(() => {
          setShowFloatingLumens(false);
          setJustCollected(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to collect lumens:', err);
      toast.error('Error al recolectar Lumens');
    }
    setIsCollecting(false);
  };

  const hasLumensToCollect = idleLumens > 0;
  const maxOfflineHours = 8;
  const offlineProgress = Math.min(hoursSinceCollection / maxOfflineHours, 1);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-2xl border border-lumora-gold/20 bg-gradient-to-r from-lumora-gold/5 via-card/60 to-lumora-gold/5 p-4 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-lumora-gold" />
            <span className="text-sm font-semibold text-lumora-gold">Generación Idle</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lumora-gold/10 border border-lumora-gold/20">
            <TrendingUp className="h-3 w-3 text-lumora-gold" />
            <span className="text-xs font-bold text-lumora-gold">{lumensPerHour}/h</span>
          </div>
        </div>

        {/* Idle progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {hoursSinceCollection < 1
                ? `${Math.floor(hoursSinceCollection * 60)} min`
                : `${hoursSinceCollection.toFixed(1)}h`}
              {' / '}{maxOfflineHours}h máximo
            </span>
            <span className="text-[10px] text-lumora-gold font-semibold">
              +{idleLumens} Lumens
            </span>
          </div>
          <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-lumora-gold/80 to-lumora-pink/60 rounded-full"
              animate={{ width: `${offlineProgress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Collect button */}
        <div className="relative">
          <Button
            onClick={handleCollect}
            disabled={!hasLumensToCollect || isCollecting}
            className={`w-full rounded-xl h-11 font-semibold gap-2 ${
              hasLumensToCollect
                ? 'bg-gradient-to-r from-lumora-gold to-lumora-pink text-white hover:opacity-90'
                : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
            }`}
          >
            {isCollecting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            ) : (
              <Coins className="h-4 w-4" />
            )}
            {isCollecting
              ? 'Recolectando...'
              : hasLumensToCollect
              ? `Recolectar ${idleLumens} Lumens`
              : 'Sin Lumens para recolectar'}
          </Button>

          {/* Floating collected animation */}
          <AnimatePresence>
            {showFloatingLumens && justCollected !== null && (
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -40 }}
                exit={{ opacity: 0, y: -60 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-full bg-lumora-gold/20 border border-lumora-gold/40 backdrop-blur-sm"
              >
                <Sparkles className="h-3 w-3 text-lumora-gold" />
                <span className="text-sm font-bold text-lumora-gold">+{justCollected}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current total */}
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Balance: {totalLumens.toLocaleString()} Lumens
        </p>
      </div>
    </div>
  );
}
