'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Sparkles, Check, Zap, Star, Trophy, Users, Swords, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';

interface AchievementData {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descEn: string;
  category: string;
  requirement: number;
  reward: {
    lumens?: number;
    energy?: number;
    experience?: number;
  };
  iconUrl: string | null;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  claimed: boolean;
  claimedAt: string | null;
}

interface CategoryData {
  key: string;
  items: AchievementData[];
  completed: number;
  total: number;
}

interface AchievementsResponse {
  achievements: AchievementData[];
  categories: CategoryData[];
  totalCompleted: number;
  totalAchievements: number;
}

const CATEGORY_CONFIG: Record<string, { emoji: string; icon: any; color: string; glowColor: string }> = {
  collection: { emoji: '🏆', icon: Trophy, color: 'text-lumora-gold', glowColor: 'border-lumora-gold/30' },
  social: { emoji: '🤝', icon: Users, color: 'text-lumora-blue', glowColor: 'border-lumora-blue/30' },
  combat: { emoji: '⚔️', icon: Swords, color: 'text-lumora-fire', glowColor: 'border-lumora-fire/30' },
  exploration: { emoji: '🧭', icon: Compass, color: 'text-lumora-emerald', glowColor: 'border-lumora-emerald/30' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function AchievementsPanel() {
  const t = useTranslations('achievements');
  const locale = useLocale();
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const fetchAchievements = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/achievements');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
      setError('Error al cargar logros');
      toast.error('Error al cargar logros');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleClaim = async (achievementId: string) => {
    setClaimingId(achievementId);
    try {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', achievementId }),
      });
      if (res.ok) {
        audioService.playClaimReward();
        setClaimedIds((prev) => new Set(prev).add(achievementId));
        fetchAchievements();
        useGameStore.getState().triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to claim achievement:', err);
      toast.error('Error al reclamar logro');
    } finally {
      setClaimingId(null);
    }
  };

  const getName = (ach: AchievementData) =>
    locale === 'en' && ach.nameEn ? ach.nameEn : ach.name;

  const getDescription = (ach: AchievementData) =>
    locale === 'en' && ach.descEn ? ach.descEn : ach.description;

  const isClaimed = (ach: AchievementData) =>
    ach.claimed || claimedIds.has(ach.id);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 mb-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-xl" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-12">
        <Trophy className="h-12 w-12 text-lumora-gold/20 mb-4" />
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" onClick={() => { setIsLoading(true); fetchAchievements(); }} className="rounded-xl">
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data || data.achievements.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <Trophy className="h-12 w-12 text-lumora-gold/20 mb-4" />
        <p className="text-sm text-muted-foreground">{t('noAchievements')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Overall progress */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lumora-gold" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('progress')}
          </span>
        </div>
        <span className="text-xs font-bold text-lumora-gold">
          {data.totalCompleted}/{data.totalAchievements}
        </span>
      </div>
      <Progress
        value={(data.totalCompleted / data.totalAchievements) * 100}
        className="h-2 mb-2"
      />

      {/* Category Tabs */}
      <Tabs defaultValue={data.categories[0]?.key || 'collection'} className="w-full">
        <TabsList className="w-full glass-card-subtle rounded-xl h-auto p-1 gap-0.5">
          {data.categories.map((cat) => {
            const config = CATEGORY_CONFIG[cat.key] || CATEGORY_CONFIG.collection;
            const Icon = config.icon;
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="flex-1 rounded-lg text-xs gap-1 data-[state=active]:bg-lumora-purple/15 data-[state=active]:text-lumora-purple"
              >
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className="hidden sm:inline">{t(cat.key as any)}</span>
                <span className="sm:hidden">{config.emoji}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {data.categories.map((cat) => {
          const config = CATEGORY_CONFIG[cat.key] || CATEGORY_CONFIG.collection;
          return (
            <TabsContent key={cat.key} value={cat.key} className="mt-3">
              {/* Category progress */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.emoji}</span>
                  <span className={`text-sm font-fantasy font-title font-bold ${config.color}`}>
                    {t(cat.key as any)}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${config.color} border-current/20`}
                >
                  {t('categoryProgress', { claimed: cat.completed, total: cat.total })}
                </Badge>
              </div>

              {/* Achievement cards */}
              <motion.div
                className="flex flex-col gap-2.5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {cat.items.map((ach) => {
                  const claimed = isClaimed(ach);
                  const progressPercent = Math.min((ach.progress / ach.requirement) * 100, 100);
                  const canClaim = ach.completed && !claimed;
                  const reward = ach.reward || {};

                  return (
                    <motion.div
                      key={ach.id}
                      variants={itemVariants}
                      className={`relative rounded-xl p-3.5 border transition-all ${
                        claimed
                          ? 'bg-gradient-to-br from-lumora-gold/5 to-lumora-gold/10 border-lumora-gold/30 glow-gold'
                          : ach.completed
                          ? 'bg-card/60 border-lumora-gold/40 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                          : 'glass-card-subtle'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                            claimed
                              ? 'bg-lumora-gold/20 border border-lumora-gold/30'
                              : ach.completed
                              ? 'bg-lumora-gold/10 border border-lumora-gold/20'
                              : 'bg-muted/30 border border-border/20'
                          }`}
                        >
                          {ach.iconUrl || config.emoji}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h4
                              className={`text-sm font-semibold leading-tight ${
                                claimed ? 'text-lumora-gold' : ''
                              }`}
                            >
                              {getName(ach)}
                            </h4>
                            {claimed && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Check className="h-3.5 w-3.5 text-lumora-gold" />
                                <span className="text-[10px] font-semibold text-lumora-gold">
                                  {t('claimed')}
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                            {getDescription(ach)}
                          </p>

                          {/* Progress bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <Progress
                              value={progressPercent}
                              className={`h-1.5 flex-1 ${
                                ach.completed
                                  ? '[&>[data-slot=progress-indicator]]:bg-lumora-gold'
                                  : ''
                              }`}
                            />
                            <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                              {Math.min(ach.progress, ach.requirement)}/{ach.requirement}
                            </span>
                          </div>

                          {/* Reward & action row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {reward.lumens && (
                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-lumora-gold">
                                  <Sparkles className="h-3 w-3" />
                                  {reward.lumens}
                                </span>
                              )}
                              {reward.energy && (
                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-lumora-blue">
                                  <Zap className="h-3 w-3" />
                                  {reward.energy}
                                </span>
                              )}
                              {reward.experience && (
                                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-lumora-emerald">
                                  <Star className="h-3 w-3" />
                                  {reward.experience} XP
                                </span>
                              )}
                            </div>

                            {canClaim && (
                              <Button
                                size="sm"
                                onClick={() => handleClaim(ach.id)}
                                disabled={claimingId === ach.id}
                                className="h-7 rounded-lg text-[11px] px-3 btn-lumora-emerald font-semibold gap-1"
                              >
                                <Sparkles className="h-3 w-3" />
                                {claimingId === ach.id ? '...' : t('claim')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
