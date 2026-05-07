'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Leaf, HandCoins, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';

// === TYPES ===

interface PodReward {
  type: 'lumens' | 'energy' | 'spirit' | 'extraPick' | 'collectAll';
  amount?: number;
  spiritElement?: string;
  spiritRarity?: string;
  spiritTypeId?: string;
  spiritName?: string;
  spiritNameEn?: string;
}

interface BonusGameProps {
  bonusCount: number;
  onComplete: (results: {
    totalLumens: number;
    totalEnergy: number;
    spiritsWon: any[];
    player: { lumens: number; energy: number; maxEnergy: number; level: number; experience: number };
  }) => void;
}

// === FLOATING PARTICLES BACKGROUND ===

function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-lumora-gold/30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -60, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// === REWARD DISPLAY ===

function RewardDisplay({ reward, t }: { reward: PodReward; t: (key: string, params?: Record<string, any>) => string }) {
  if (reward.type === 'lumens') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Sparkles className="h-6 w-6 text-lumora-gold" />
        <span className="text-sm font-bold text-lumora-gold">
          {t('lumensWon', { amount: reward.amount })}
        </span>
      </div>
    );
  }
  if (reward.type === 'energy') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Zap className="h-6 w-6 text-lumora-blue" />
        <span className="text-sm font-bold text-lumora-blue">
          {t('energyWon', { amount: reward.amount })}
        </span>
      </div>
    );
  }
  if (reward.type === 'spirit') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Leaf className="h-6 w-6 text-lumora-emerald" />
        <span className="text-sm font-bold text-lumora-emerald">
          {t('spiritWon')}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {reward.spiritName}
        </span>
      </div>
    );
  }
  if (reward.type === 'extraPick') {
    return (
      <div className="flex flex-col items-center gap-1">
        <HandCoins className="h-6 w-6 text-lumora-pink" />
        <span className="text-sm font-bold text-lumora-pink">
          {t('extraPick')}
        </span>
      </div>
    );
  }
  if (reward.type === 'collectAll') {
    return (
      <div className="flex flex-col items-center gap-1">
        <PartyPopper className="h-6 w-6 text-lumora-gold" />
        <span className="text-sm font-bold text-lumora-gold">
          {t('collectAll')}
        </span>
      </div>
    );
  }
  return null;
}

// === POD EMOJI ===

function getPodEmoji(reward: PodReward): string {
  switch (reward.type) {
    case 'lumens': return '✨';
    case 'energy': return '⚡';
    case 'spirit': return '🌿';
    case 'extraPick': return '🎯';
    case 'collectAll': return '🌟';
    default: return '🌱';
  }
}

// === MAIN COMPONENT ===

export function BonusGame({ bonusCount, onComplete }: BonusGameProps) {
  const t = useTranslations('bonus');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalPicksAllowed, setTotalPicksAllowed] = useState(3);
  const [remainingPicks, setRemainingPicks] = useState(3);
  const [revealedPods, setRevealedPods] = useState<Map<number, PodReward>>(new Map());
  const [collectAllRevealed, setCollectAllRevealed] = useState<Set<number>>(new Set());
  const [isPicking, setIsPicking] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    totalLumens: number;
    totalEnergy: number;
    spiritsWon: any[];
    player: any;
  } | null>(null);
  const [currentBurst, setCurrentBurst] = useState<{ index: number; reward: PodReward } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track all accumulated rewards for summary
  const accumulatedLumens = useRef(0);
  const accumulatedEnergy = useRef(0);
  const accumulatedSpirits = useRef<any[]>([]);

  // Ref for finish function to avoid circular dependency
  const finishSessionRef = useRef<() => void>(() => {});

  // Start bonus session
  useEffect(() => {
    const startSession = async () => {
      try {
        const res = await fetch('/api/bonus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', bonusCount }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Error al iniciar bonus');
          setLoading(false);
          return;
        }

        setSessionId(data.sessionId);
        setTotalPicksAllowed(data.totalPicksAllowed);
        setRemainingPicks(data.remainingPicks);
        setLoading(false);
      } catch {
        setError('Error de conexión');
        setLoading(false);
      }
    };

    startSession();
  }, [bonusCount]);

  // Finish session
  const finishSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Even if finish fails, show summary from accumulated data
        setSummaryData({
          totalLumens: accumulatedLumens.current,
          totalEnergy: accumulatedEnergy.current,
          spiritsWon: accumulatedSpirits.current,
          player: data.player,
        });
        setShowSummary(true);
        return;
      }

      setSummaryData({
        totalLumens: data.totalLumens,
        totalEnergy: data.totalEnergy,
        spiritsWon: data.spiritsWon,
        player: data.player,
      });
      setShowSummary(true);
    } catch {
      // Show summary from accumulated data
      setSummaryData({
        totalLumens: accumulatedLumens.current,
        totalEnergy: accumulatedEnergy.current,
        spiritsWon: accumulatedSpirits.current,
        player: undefined,
      });
      setShowSummary(true);
    }
  }, [sessionId]);

  // Keep ref updated
  finishSessionRef.current = finishSession;

  // Handle pod pick
  const handlePick = useCallback(async (podIndex: number) => {
    if (!sessionId || isPicking || revealedPods.has(podIndex) || remainingPicks <= 0) return;

    setIsPicking(true);
    setError(null);

    try {
      const res = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pick', sessionId, podIndex }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al elegir pod');
        setIsPicking(false);
        return;
      }

      const reward: PodReward = data.reward;
      const newRemaining = data.remainingPicks;

      // Show burst animation
      setCurrentBurst({ index: podIndex, reward });

      // Add to revealed
      setRevealedPods(prev => {
        const next = new Map(prev);
        next.set(podIndex, reward);
        return next;
      });

      // Handle collectAll - reveal all other pods too
      if (reward.collectedAll && reward.collectedIndices) {
        setTimeout(() => {
          setCollectAllRevealed(new Set(reward.collectedIndices));
          setRevealedPods(prev => {
            const next = new Map(prev);
            for (const idx of reward.collectedIndices!) {
              if (!next.has(idx)) {
                const collectedReward: PodReward = { type: 'lumens', amount: 0 };
                next.set(idx, collectedReward);
              }
            }
            return next;
          });
        }, 800);
      }

      // Track accumulated rewards
      if (reward.type === 'lumens' && reward.amount) accumulatedLumens.current += reward.amount;
      if (reward.type === 'energy' && reward.amount) accumulatedEnergy.current += reward.amount;
      if (reward.type === 'spirit') accumulatedSpirits.current.push(reward);
      if (reward.collectedAll) {
        accumulatedLumens.current += reward.totalLumens || 0;
        accumulatedEnergy.current += reward.totalEnergy || 0;
        if (reward.spiritsWon) accumulatedSpirits.current.push(...reward.spiritsWon);
      }

      setRemainingPicks(newRemaining);

      // Clear burst animation after delay
      setTimeout(() => {
        setCurrentBurst(null);
        setIsPicking(false);
      }, 1000);

      // Auto-finish if no picks remaining
      if (newRemaining <= 0) {
        setTimeout(() => finishSessionRef.current(), 2000);
      }
    } catch {
      setError('Error de conexión');
      setIsPicking(false);
    }
  }, [sessionId, isPicking, revealedPods, remainingPicks]);

  const handleClose = () => {
    if (summaryData) {
      onComplete(summaryData);
    }
  };

  // Render a seed pod
  const renderPod = (index: number) => {
    const isRevealed = revealedPods.has(index);
    const isCollectAllRevealed = collectAllRevealed.has(index);
    const reward = revealedPods.get(index);
    const isBursting = currentBurst?.index === index;
    const isDisabled = isPicking || isRevealed || remainingPicks <= 0;

    return (
      <motion.button
        key={index}
        onClick={() => handlePick(index)}
        disabled={isDisabled}
        className={`
          relative aspect-square w-full rounded-2xl border-2
          flex flex-col items-center justify-center
          transition-all duration-300
          ${isRevealed
            ? reward?.type === 'collectAll' || reward?.type === 'extraPick'
              ? 'border-lumora-pink/50 bg-lumora-pink/10'
              : reward?.type === 'spirit'
              ? 'border-lumora-emerald/50 bg-lumora-emerald/10'
              : reward?.type === 'lumens'
              ? 'border-lumora-gold/50 bg-lumora-gold/10'
              : reward?.type === 'energy'
              ? 'border-lumora-blue/50 bg-lumora-blue/10'
              : 'border-border/20 bg-card/40'
            : 'border-lumora-emerald/30 bg-gradient-to-b from-lumora-emerald/20 to-card/40 hover:from-lumora-emerald/30 hover:to-card/60 cursor-pointer'
          }
          ${!isRevealed && !isDisabled ? 'hover:scale-105 active:scale-95' : ''}
        `}
        whileHover={!isRevealed && !isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isRevealed && !isDisabled ? { scale: 0.95 } : {}}
        animate={isBursting ? {
          scale: [1, 1.3, 1],
          rotate: [0, 5, -5, 0],
        } : {}}
        transition={{ duration: 0.4 }}
      >
        {isRevealed ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-0.5"
          >
            {reward && getPodEmoji(reward)}
            {reward && (
              <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">
                {reward.type === 'lumens' && `+${reward.amount}`}
                {reward.type === 'energy' && `+${reward.amount}`}
                {reward.type === 'spirit' && '🌿'}
                {reward.type === 'extraPick' && '+1'}
                {reward.type === 'collectAll' && '🌟'}
              </span>
            )}
          </motion.div>
        ) : isCollectAllRevealed ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <span className="text-lg">🌟</span>
          </motion.div>
        ) : (
          // Unrevealed pod
          <div className="flex flex-col items-center gap-0.5">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2 + index * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-xl sm:text-2xl"
            >
              🌱
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{
                boxShadow: [
                  '0 0 5px rgba(46, 204, 113, 0.2)',
                  '0 0 15px rgba(46, 204, 113, 0.4)',
                  '0 0 5px rgba(46, 204, 113, 0.2)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.2,
              }}
            />
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md mx-4 rounded-3xl border border-lumora-emerald/30 bg-gradient-to-b from-card/95 to-background/95 backdrop-blur-xl p-6 shadow-2xl"
        style={{ boxShadow: '0 0 40px rgba(46, 204, 113, 0.15), 0 0 80px rgba(46, 204, 113, 0.05)' }}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-lumora-gold via-lumora-emerald to-lumora-gold bg-clip-text text-transparent font-fantasy font-title">
              {t('title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
          </motion.div>

          {/* Picks remaining */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 flex items-center justify-center gap-2"
          >
            <span className="text-sm font-semibold text-lumora-emerald">
              {t('picksRemaining', { count: remainingPicks })}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPicksAllowed }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < remainingPicks
                      ? 'bg-lumora-emerald shadow-[0_0_6px_rgba(46,204,113,0.5)]'
                      : 'bg-muted/30'
                  }`}
                  animate={i < remainingPicks ? {
                    scale: [1, 1.2, 1],
                  } : {}}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-3xl"
            >
              🌱
            </motion.div>
            <p className="text-sm text-muted-foreground mt-3">Cargando jardín...</p>
          </div>
        ) : (
          <>
            {/* 3×3 Pod Grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {Array.from({ length: 9 }).map((_, i) => renderPod(i))}
            </div>

            {/* Current reward burst display */}
            <AnimatePresence>
              {currentBurst && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.8 }}
                  className="text-center mb-3"
                >
                  <div className="inline-block px-4 py-2 rounded-xl bg-card/80 border border-lumora-gold/30 backdrop-blur-sm">
                    <RewardDisplay reward={currentBurst.reward} t={t} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Summary Overlay */}
        <AnimatePresence>
          {showSummary && summaryData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-3xl bg-gradient-to-b from-card/98 to-background/98 backdrop-blur-xl flex flex-col items-center justify-center p-6"
            >
              {/* Golden burst particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-lumora-gold/60"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    animate={{
                      x: [0, (Math.random() - 0.5) * 200],
                      y: [0, (Math.random() - 0.5) * 200],
                      opacity: [1, 0],
                      scale: [1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.1,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-center"
              >
                <Sparkles className="h-8 w-8 text-lumora-gold mx-auto mb-2" />
                <h3 className="text-xl font-bold text-lumora-gold font-fantasy font-title mb-4">
                  {t('totalWin')}
                </h3>

                <div className="space-y-2 mb-6">
                  {summaryData.totalLumens > 0 && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-lumora-gold/10 border border-lumora-gold/20"
                    >
                      <Sparkles className="h-4 w-4 text-lumora-gold" />
                      <span className="font-bold text-lumora-gold">
                        +{summaryData.totalLumens} Lumens
                      </span>
                    </motion.div>
                  )}

                  {summaryData.totalEnergy > 0 && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-lumora-blue/10 border border-lumora-blue/20"
                    >
                      <Zap className="h-4 w-4 text-lumora-blue" />
                      <span className="font-bold text-lumora-blue">
                        +{summaryData.totalEnergy} {t('energyWon', { amount: '' }).replace('¡+ Energía!', 'Energía')}
                      </span>
                    </motion.div>
                  )}

                  {summaryData.spiritsWon.length > 0 && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-lumora-emerald/10 border border-lumora-emerald/20"
                    >
                      <Leaf className="h-4 w-4 text-lumora-emerald" />
                      <span className="font-bold text-lumora-emerald">
                        {summaryData.spiritsWon.length} {t('spiritWon')}
                      </span>
                    </motion.div>
                  )}
                </div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <Button
                    onClick={handleClose}
                    className="w-full rounded-xl btn-lumora-emerald font-bold hover:opacity-90 transition-opacity h-12 text-base"
                  >
                    {t('close')}
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
