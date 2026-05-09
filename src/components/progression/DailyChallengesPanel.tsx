'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Sparkles, Check, Zap, Star, Clock, RotateCcw, Swords, Handshake, Combine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { audioService } from '@/lib/audioService';
import { WinScreen } from '@/components/game/WinScreen';

interface ChallengeData {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descEn: string;
  challengeType: string;
  requirement: number;
  reward: {
    lumens?: number;
    energy?: number;
    experience?: number;
  };
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface DailyResponse {
  challenges: ChallengeData[];
  completedCount: number;
  claimedCount: number;
  totalChallenges: number;
  allClaimed: boolean;
}

const CHALLENGE_TYPE_CONFIG: Record<string, { icon: any; color: string; emoji: string }> = {
  spin_combo: { icon: RotateCcw, color: 'text-lumora-purple', emoji: '🎰' },
  collect_spirit: { icon: Sparkles, color: 'text-lumora-gold', emoji: '✨' },
  world_contribution: { icon: Swords, color: 'text-lumora-fire', emoji: '🌍' },
  merge_spirits: { icon: Combine, color: 'text-lumora-emerald', emoji: '🔮' },
  spins: { icon: RotateCcw, color: 'text-lumora-purple', emoji: '🎰' },
  spirits: { icon: Sparkles, color: 'text-lumora-gold', emoji: '✨' },
  lumens: { icon: Star, color: 'text-lumora-gold', emoji: '💰' },
  merges: { icon: Combine, color: 'text-lumora-emerald', emoji: '🔮' },
  friends: { icon: Handshake, color: 'text-lumora-blue', emoji: '🤝' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

export function DailyChallengesPanel() {
  const t = useTranslations('dailyChallenges');
  const locale = useLocale();
  const [data, setData] = useState<DailyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [showReward, setShowReward] = useState<any | null>(null);
  const timeLeft = useCountdownToMidnight();

  const fetchChallenges = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/daily');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Failed to fetch daily challenges:', err);
      setError('Error al cargar desafíos');
      toast.error('Error al cargar desafíos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleClaim = async (challengeId: string) => {
    setClaimingId(challengeId);
    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });
      if (res.ok) {
        audioService.playClaimReward();
        setClaimedIds((prev) => new Set(prev).add(challengeId));
        const data = await res.json();
        if (data.reward) {
          const rewards: any[] = [];
          if (data.reward.lumens) rewards.push({ type: 'lumens', amount: data.reward.lumens });
          if (data.reward.energy) rewards.push({ type: 'energy', amount: data.reward.energy });
          if (data.reward.experience) rewards.push({ type: 'experience', amount: data.reward.experience });
          setShowReward({ rewards, title: "¡Desafío Completado!" });
        }
        fetchChallenges();
        useGameStore.getState().triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to claim daily challenge:', err);
      toast.error('Error al reclamar desafío');
    } finally {
      setClaimingId(null);
    }
  };

  const getName = (ch: ChallengeData) =>
    locale === 'en' && ch.nameEn ? ch.nameEn : ch.name;

  const getDescription = (ch: ChallengeData) =>
    locale === 'en' && ch.descEn ? ch.descEn : ch.description;

  const isClaimed = (ch: ChallengeData) =>
    ch.claimed || claimedIds.has(ch.id);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-4 w-16 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-lumora-purple" />
            <span className="text-sm font-fantasy font-bold text-lumora-purple">{t('title')}</span>
          </div>
        </div>
        <div className="flex flex-col items-center py-6">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" onClick={() => { setIsLoading(true); fetchChallenges(); }} className="rounded-xl">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.challenges.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-lumora-purple" />
            <span className="text-sm font-fantasy font-bold text-lumora-purple">{t('title')}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center py-6">{t('noChallenges')}</p>
      </div>
    );
  }

  return (
    <div className="glass-card backdrop-blur-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-lumora-purple" />
          <span className="text-sm font-fantasy font-bold text-lumora-purple">{t('title')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-lumora-gold" />
          <span className="text-[10px] font-semibold text-lumora-gold">
            {t('resetsIn')} {timeLeft}
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <Progress
          value={(data.claimedCount / data.totalChallenges) * 100}
          className="h-1.5 flex-1 [&>[data-slot=progress-indicator]]:bg-lumora-gold"
        />
        <span className="text-[10px] font-semibold text-muted-foreground">
          {data.claimedCount}/{data.totalChallenges}
        </span>
      </div>

      {/* Challenge cards */}
      <motion.div
        className="flex flex-col gap-2.5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {data.challenges.map((ch) => {
          const claimed = isClaimed(ch);
          const config = CHALLENGE_TYPE_CONFIG[ch.challengeType] || CHALLENGE_TYPE_CONFIG.spin_combo;
          const Icon = config.icon;
          const progressPercent = Math.min((ch.progress / ch.requirement) * 100, 100);
          const canClaim = ch.completed && !claimed;
          const reward = ch.reward || {};

          return (
            <motion.div
              key={ch.id}
              variants={itemVariants}
              className={`relative rounded-xl p-3 border transition-all ${
                claimed
                  ? 'bg-lumora-gold/5 border-lumora-gold/20'
                  : ch.completed
                  ? 'bg-card/60 border-lumora-gold/30 shadow-[0_0_10px_rgba(255,215,0,0.1)]'
                  : 'bg-card/40 border-border/15'
              }`}
            >
              <div className="flex gap-2.5">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                    claimed
                      ? 'bg-lumora-gold/15 border border-lumora-gold/25'
                      : 'bg-muted/25 border border-border/15'
                  }`}
                >
                  {claimed ? (
                    <Check className="h-4 w-4 text-lumora-gold" />
                  ) : (
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h4
                      className={`text-xs font-semibold leading-tight ${
                        claimed ? 'text-lumora-gold/70 line-through' : ''
                      }`}
                    >
                      {getName(ch)}
                    </h4>
                    {claimed && (
                      <Badge
                        variant="outline"
                        className="text-[9px] text-lumora-gold border-lumora-gold/25 flex-shrink-0 py-0"
                      >
                        {t('claimed')}
                      </Badge>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
                    {getDescription(ch)}
                  </p>

                  {/* Progress */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <Progress
                      value={progressPercent}
                      className={`h-1 flex-1 ${
                        ch.completed ? '[&>[data-slot=progress-indicator]]:bg-lumora-gold' : ''
                      }`}
                    />
                    <span className="text-[9px] font-semibold text-muted-foreground whitespace-nowrap">
                      {Math.min(ch.progress, ch.requirement)}/{ch.requirement}
                    </span>
                  </div>

                  {/* Reward & action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {reward.lumens && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-lumora-gold">
                          <Sparkles className="h-2.5 w-2.5" />
                          {reward.lumens}
                        </span>
                      )}
                      {reward.energy && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-lumora-blue">
                          <Zap className="h-2.5 w-2.5" />
                          {reward.energy}
                        </span>
                      )}
                      {reward.experience && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-lumora-emerald">
                          <Star className="h-2.5 w-2.5" />
                          {reward.experience} XP
                        </span>
                      )}
                    </div>

                    {canClaim && (
                      <Button
                        size="sm"
                        onClick={() => handleClaim(ch.id)}
                        disabled={claimingId === ch.id}
                        className="h-6 rounded-lg text-[10px] px-2.5 bg-gradient-to-r from-lumora-gold to-lumora-emerald text-white font-semibold gap-1"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {claimingId === ch.id ? '...' : t('claim')}
                      </Button>
                    )}
                    {!ch.completed && !claimed && (
                      <span className="text-[9px] font-medium text-muted-foreground/70">
                        {t('inProgress')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
            </motion.div>

      {/* Reward Popup */}
      {showReward && (
        <WinScreen 
          isOpen={!!showReward}
          onClose={() => setShowReward(null)}
          title={showReward.title}
          subtitle="Tus esfuerzos en Lumora han sido recompensados"
          rewards={showReward.rewards}
        />
      )}
    </div>
  );
}
