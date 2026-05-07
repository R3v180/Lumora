'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Zap, Flame, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';

interface BlessingData {
  day: number;
  displayDay: number;
  cycleDay: number;
  claimed: boolean;
  canClaim: boolean;
  readyForNextDay: boolean;
  isStreakActive: boolean;
  streak: number;
  currentReward: { day: number; lumens: number; energy: number; isMega?: boolean };
  nextReward: { day: number; lumens: number; energy: number; isMega?: boolean };
  hoursUntilNext: number;
  blessingSchedule: { day: number; lumens: number; energy: number; isMega?: boolean }[];
}

export function BlessingWidget() {
  const t = useTranslations('blessing');
  const [data, setData] = useState<BlessingData | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlessing = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/blessings');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Failed to fetch blessing:', err);
      setError('Error al cargar bendiciones');
      toast.error('Error al cargar bendiciones');
    }
  }, []);

  useEffect(() => {
    fetchBlessing();
  }, [fetchBlessing]);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch('/api/blessings', { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        setClaimResult(result);
        setShowClaim(true);
        fetchBlessing();
        useGameStore.getState().triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to claim blessing:', err);
      toast.error('Error al reclamar bendición');
    } finally {
      setIsClaiming(false);
    }
  };

  if (error) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-lumora-gold" />
          <span className="text-sm font-fantasy font-bold text-lumora-gold">{t('title')}</span>
        </div>
        <div className="flex flex-col items-center py-4">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" onClick={() => fetchBlessing()} className="rounded-xl">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="glass-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-lumora-gold" />
            <span className="text-sm font-fantasy font-bold text-lumora-gold">{t('title')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-lumora-fire" />
            <span className="text-xs font-semibold text-lumora-fire">{t('streak', { days: data.streak })}</span>
          </div>
        </div>

        {/* 7-day schedule */}
        <div className="flex gap-1.5 mb-4">
          {data.blessingSchedule.map((day) => {
            const isCurrent = day.day === data.cycleDay;
            const isPast = day.day < data.cycleDay || (data.claimed && day.day === data.cycleDay);
            const isClaimed = isPast;

            return (
              <div
                key={day.day}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center transition-all ${
                  isCurrent && !data.claimed
                    ? 'bg-lumora-gold/15 border-2 border-lumora-gold/40 ring-1 ring-lumora-gold/20'
                    : isClaimed
                    ? 'bg-lumora-emerald/10 border border-lumora-emerald/20'
                    : 'bg-card/30 border border-border/15'
                }`}
              >
                <span className="text-[10px] font-bold text-muted-foreground">
                  {t('day', { day: day.day })}
                </span>
                {isClaimed ? (
                  <Check className="h-4 w-4 text-lumora-emerald" />
                ) : day.isMega ? (
                  <Star className="h-4 w-4 text-lumora-gold" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-lumora-gold/50" />
                )}
                <span className="text-[9px] text-muted-foreground font-medium">
                  {day.lumens}✨
                </span>
              </div>
            );
          })}
        </div>

        {/* Current reward preview */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">
              {t('day', { day: data.cycleDay })}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-semibold text-lumora-gold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {data.currentReward.lumens}
            </span>
            {data.currentReward.energy > 0 && (
              <span className="text-xs font-semibold text-lumora-blue flex items-center gap-1">
                <Zap className="h-3 w-3" />
                +{data.currentReward.energy}
              </span>
            )}
          </div>
        </div>

        {/* Claim button */}
        {data.canClaim && !data.claimed ? (
          <Button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full rounded-xl btn-lumora-emerald font-semibold gap-2"
          >
            <Gift className="h-4 w-4" />
            {isClaiming ? '...' : t('claim')}
          </Button>
        ) : data.claimed ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Check className="h-4 w-4 text-lumora-emerald" />
            <span className="text-sm font-semibold text-lumora-emerald">{t('claimed')}</span>
          </div>
        ) : (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground">
              Disponible en {data.hoursUntilNext}h
            </span>
          </div>
        )}
      </div>

      {/* Claim result popup */}
      <AnimatePresence>
        {showClaim && claimResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowClaim(false)}
          >
            <motion.div
              className="bg-card border border-lumora-gold/30 rounded-2xl p-6 mx-4 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="w-16 h-16 mx-auto rounded-full bg-lumora-gold/20 flex items-center justify-center border-2 border-lumora-gold/40 mb-4"
              >
                {claimResult.reward?.isMega ? (
                  <Star className="h-8 w-8 text-lumora-gold" />
                ) : (
                  <Gift className="h-8 w-8 text-lumora-gold" />
                )}
              </motion.div>
              <h3 className="font-fantasy font-bold text-lg text-lumora-gold mb-2">
                {claimResult.reward?.isMega ? '¡Mega Bendición!' : '¡Bendición Recibida!'}
              </h3>
              {claimResult.streakBroken && (
                <p className="text-xs text-lumora-fire mb-2">Racha reiniciada</p>
              )}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-lumora-gold" />
                  <span className="text-lg font-bold text-lumora-gold">
                    +{claimResult.reward?.lumens} Lumens
                  </span>
                </div>
                {claimResult.reward?.energy > 0 && (
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4 text-lumora-blue" />
                    <span className="text-sm font-semibold text-lumora-blue">
                      +{claimResult.reward.energy} Energía
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowClaim(false)}
                className="rounded-xl btn-lumora"
              >
                {t('claimed')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
