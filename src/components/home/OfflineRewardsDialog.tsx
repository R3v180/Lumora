'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Gift, Coins } from 'lucide-react';
import { useGameStore } from '@/lib/store';
import { usePlayer } from '@/hooks/usePlayer';

interface LumoraGift {
  type: 'spirit' | 'lumens';
  spiritTypeId?: string;
  spiritName?: string;
  spiritNameEn?: string;
  spiritElement?: string;
  spiritRarity?: string;
  lumensAmount?: number;
}

interface OfflineRewardsData {
  hoursOffline: number;
  minutesOffline: number;
  lumensEarned: number;
  energyRecovered: number;
  lumoraGift: LumoraGift | null;
  canClaim: boolean;
  maxHours: number;
  totalLumensPerHour: number;
}

// Animated counter that counts up from 0 to target
function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(() => target === 0 ? 0 : 0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return <>{count.toLocaleString()}</>;
}

// Floating particle component for the background
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 2,
    opacity: Math.random() * 0.5 + 0.2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0
              ? 'rgba(255, 215, 0, 0.6)'
              : p.id % 3 === 1
                ? 'rgba(155, 89, 182, 0.6)'
                : 'rgba(255, 105, 180, 0.6)',
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.5],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Reward card component with staggered animation
function RewardCard({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  amount,
  index,
  isGift,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  amount: number;
  index: number;
  isGift?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: 0.5 + index * 0.3,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative rounded-2xl border p-4 ${
        isGift
          ? 'border-lumora-gold/30 bg-gradient-to-br from-lumora-gold/10 via-lumora-pink/5 to-transparent'
          : 'border-border/30 bg-card/80'
      } backdrop-blur-sm`}
    >
      {/* Glow effect behind icon */}
      <div
        className="absolute top-3 left-3 w-10 h-10 rounded-full blur-lg"
        style={{ background: iconBg }}
      />
      <div className="flex items-center gap-3 relative">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-lg font-bold text-foreground">
            <AnimatedCounter target={amount} duration={1200 + index * 200} />
          </p>
        </div>
      </div>
      {isGift && (
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="h-5 w-5 text-lumora-gold" />
        </motion.div>
      )}
    </motion.div>
  );
}

// Spirit gift card component
function SpiritGiftCard({
  gift,
  label,
  description,
  index,
}: {
  gift: LumoraGift;
  label: string;
  description: string;
  index: number;
}) {
  const elementEmoji =
    gift.spiritElement === 'fire' ? '🔥' :
    gift.spiritElement === 'water' ? '💧' :
    gift.spiritElement === 'dream' ? '🌙' :
    gift.spiritElement === 'nature' ? '🌿' : '⭐';

  return (
    <motion.div
      initial={{ opacity: 0, x: -40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: 0.5 + index * 0.3,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative rounded-2xl border border-lumora-gold/30 bg-gradient-to-br from-lumora-gold/10 via-lumora-pink/5 to-transparent backdrop-blur-sm p-4"
    >
      <div className="absolute top-3 left-3 w-10 h-10 rounded-full blur-lg bg-lumora-gold/30" />
      <div className="flex items-center gap-3 relative">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-lumora-gold/20 text-lumora-gold">
          <Gift className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-lumora-gold">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xl">{elementEmoji}</span>
            <span className="text-sm font-bold text-lumora-gold">
              {gift.spiritName || gift.spiritNameEn || 'Espíritu'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lumora-pink/20 text-lumora-pink border border-lumora-pink/30 uppercase font-bold">
              {gift.spiritRarity}
            </span>
          </div>
        </div>
      </div>
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles className="h-5 w-5 text-lumora-gold" />
      </motion.div>
    </motion.div>
  );
}

export function OfflineRewardsDialog() {
  const t = useTranslations('offlineRewards');
  const { refetch } = usePlayer();
  const { offlineRewardsClaimed, setOfflineRewardsClaimed, addLumens } = useGameStore();

  const [rewards, setRewards] = useState<OfflineRewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Fetch offline rewards on mount
  useEffect(() => {
    if (offlineRewardsClaimed) {
      setIsLoading(false);
      return;
    }

    const fetchRewards = async () => {
      try {
        const res = await fetch('/api/offline-rewards');
        if (res.ok) {
          const data: OfflineRewardsData = await res.json();
          if (data.canClaim) {
            setRewards(data);
            setShowDialog(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch offline rewards:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewards();
  }, [offlineRewardsClaimed]);

  const handleClaim = useCallback(async () => {
    if (isClaiming || !rewards) return;

    setIsClaiming(true);

    try {
      const res = await fetch('/api/offline-rewards', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();

        // Update local state
        const totalLumens = data.totalLumens || data.lumensEarned || 0;
        addLumens(totalLumens);

        // Mark as claimed
        setIsClaimed(true);
        setOfflineRewardsClaimed();

        // Refetch player data
        refetch();

        // Close dialog after a satisfying delay
        setTimeout(() => {
          setShowDialog(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to claim offline rewards:', err);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, rewards, addLumens, setOfflineRewardsClaimed, refetch]);

  if (isLoading || !showDialog || !rewards) {
    return null;
  }

  const hours = Math.floor(rewards.hoursOffline);
  const minutes = rewards.minutesOffline % 60;

  // Build reward cards list
  const rewardCards: { key: string; hasReward: boolean }[] = [
    { key: 'lumens', hasReward: rewards.lumensEarned > 0 },
    { key: 'energy', hasReward: rewards.energyRecovered > 0 },
    { key: 'gift', hasReward: rewards.lumoraGift !== null },
  ].filter(r => r.hasReward);

  return (
    <AnimatePresence>
      {showDialog && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Floating particles */}
          <FloatingParticles />

          {/* Main dialog content */}
          <motion.div
            className="relative z-10 w-full max-w-sm mx-4"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Ethereal glow behind the dialog */}
            <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-lumora-gold/10 via-lumora-purple/10 to-lumora-pink/10 blur-2xl" />

            <div className="relative rounded-3xl border border-border/20 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Top gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple" />

              {/* Header */}
              <motion.div
                className="pt-8 pb-4 px-6 text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {/* Floating sparkles around title */}
                <motion.div
                  className="absolute top-6 left-8"
                  animate={{ y: [-4, 4, -4], opacity: [0.4, 1, 0.4], rotate: [0, 180, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-4 w-4 text-lumora-gold" />
                </motion.div>
                <motion.div
                  className="absolute top-8 right-10"
                  animate={{ y: [4, -4, 4], opacity: [0.3, 0.8, 0.3], rotate: [360, 180, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-3 w-3 text-lumora-pink" />
                </motion.div>

                <h2 className="text-xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple bg-clip-text text-transparent">
                  {t('title')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('subtitle')}
                </p>

                {/* Offline time display */}
                <motion.div
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lumora-purple/10 border border-lumora-purple/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <span className="text-[10px] font-medium text-lumora-purple">
                    {t('offlineTime', { hours, minutes })}
                  </span>
                </motion.div>
              </motion.div>

              {/* Reward cards */}
              <div className="px-5 pb-4 space-y-3">
                {/* Idle Lumens */}
                {rewards.lumensEarned > 0 && (
                  <RewardCard
                    icon={<Coins className="h-6 w-6" />}
                    iconBg="rgba(255, 215, 0, 0.15)"
                    iconColor="text-lumora-gold"
                    label={t('idleLumens')}
                    description={t('idleLumensDesc', { amount: rewards.lumensEarned })}
                    amount={rewards.lumensEarned}
                    index={0}
                  />
                )}

                {/* Energy Restored */}
                {rewards.energyRecovered > 0 && (
                  <RewardCard
                    icon={<Zap className="h-6 w-6" />}
                    iconBg="rgba(93, 173, 226, 0.15)"
                    iconColor="text-lumora-blue"
                    label={t('energyRestored')}
                    description={t('energyRestoredDesc', { amount: rewards.energyRecovered })}
                    amount={rewards.energyRecovered}
                    index={1}
                  />
                )}

                {/* Lumora's Gift */}
                {rewards.lumoraGift && rewards.lumoraGift.type === 'spirit' && (
                  <SpiritGiftCard
                    gift={rewards.lumoraGift}
                    label={t('lumoraGift')}
                    description={t('lumoraGiftSpirit', { spirit: rewards.lumoraGift.spiritName || 'Espíritu' })}
                    index={2}
                  />
                )}
                {rewards.lumoraGift && rewards.lumoraGift.type === 'lumens' && (
                  <RewardCard
                    icon={<Gift className="h-6 w-6" />}
                    iconBg="rgba(255, 105, 180, 0.15)"
                    iconColor="text-lumora-pink"
                    label={t('lumoraGift')}
                    description={t('lumoraGiftLumens', { amount: rewards.lumoraGift.lumensAmount || 0 })}
                    amount={rewards.lumoraGift.lumensAmount || 0}
                    index={2}
                    isGift
                  />
                )}

                {/* Bonus threshold hint (only show if close to 4 hours but didn't reach it) */}
                {rewards.lumoraGift === null && rewards.hoursOffline >= 2 && rewards.hoursOffline < 4 && (
                  <motion.p
                    className="text-[10px] text-center text-muted-foreground/60 italic mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    {t('bonusThreshold')}
                  </motion.p>
                )}
              </div>

              {/* Claim button */}
              <div className="px-5 pb-6">
                <motion.button
                  onClick={handleClaim}
                  disabled={isClaiming || isClaimed}
                  className={`relative w-full group ${
                    isClaimed ? 'cursor-default' : 'cursor-pointer'
                  }`}
                  whileHover={!isClaimed ? { scale: 1.02 } : undefined}
                  whileTap={!isClaimed ? { scale: 0.98 } : undefined}
                >
                  {/* Glow effect */}
                  {!isClaimed && (
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple opacity-50 blur-lg group-hover:opacity-80 transition-opacity" />
                  )}

                  <div className={`relative flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-fantasy font-bold text-base transition-all ${
                    isClaimed
                      ? 'bg-lumora-emerald/20 text-lumora-emerald border border-lumora-emerald/30'
                      : 'bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple text-white shadow-2xl'
                  }`}>
                    {isClaimed ? (
                      <>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        >
                          ✨
                        </motion.span>
                        {t('claimed')}
                      </>
                    ) : isClaiming ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="h-5 w-5" />
                        </motion.div>
                        {t('claim')}...
                      </>
                    ) : (
                      <>
                        <Gift className="h-5 w-5" />
                        {t('claim')}
                      </>
                    )}
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
