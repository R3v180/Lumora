'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Shield, Flame, Trophy, Clock, Search,
  ChevronRight, Sparkles, AlertTriangle, X, Skull,
  Crown, Zap, Users, Star, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// ===== Types =====
interface WarGuildInfo {
  id: string;
  name: string;
  emblem: string | null;
  level: number;
  score?: number;
  participantCount?: number;
}

interface ActiveWarData {
  id: string;
  attackerGuild: WarGuildInfo;
  defenderGuild: WarGuildInfo;
  isAttacker: boolean;
  timeRemaining: number;
  startedAt: string;
  endsAt: string;
}

interface UpcomingWarData {
  id: string;
  attackerGuild: WarGuildInfo;
  defenderGuild: WarGuildInfo;
  startsAt: string;
  endsAt: string;
  timeUntilStart: number;
}

interface RecentWarData {
  id: string;
  attackerGuild: WarGuildInfo;
  defenderGuild: WarGuildInfo;
  attackerScore: number;
  defenderScore: number;
  winnerId: string | null;
  result: 'victory' | 'defeat' | 'draw';
  endedAt: string;
}

interface Contributor {
  rank: number;
  playerId: string;
  displayName: string;
  level: number;
  contribution: number;
  side: 'attacker' | 'defender';
}

interface TargetGuild {
  id: string;
  name: string;
  description: string | null;
  emblem: string | null;
  level: number;
  memberCount: number;
  maxMembers: number;
}

interface PlayerSpiritInfo {
  id: string;
  spiritType: {
    id: string;
    name: string;
    nameEn: string;
    element: string;
    rarity: string;
  };
  level: number;
}

// ===== Component =====
export function GuildWarsPanel() {
  const t = useTranslations('guildWar');
  const tComm = useTranslations('community');

  const [activeWar, setActiveWar] = useState<ActiveWarData | null>(null);
  const [upcomingWars, setUpcomingWars] = useState<UpcomingWarData[]>([]);
  const [recentWars, setRecentWars] = useState<RecentWarData[]>([]);
  const [topContributors, setTopContributors] = useState<Contributor[]>([]);
  const [playerContribution, setPlayerContribution] = useState(0);
  const [role, setRole] = useState<string>('member');
  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState<RecentWarData | null>(null);

  // Declare war state
  const [showDeclareDialog, setShowDeclareDialog] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [targetGuilds, setTargetGuilds] = useState<TargetGuild[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isDeclaring, setIsDeclaring] = useState(false);

  // Contribute state
  const [showContributeDialog, setShowContributeDialog] = useState(false);
  const [playerSpirits, setPlayerSpirits] = useState<PlayerSpiritInfo[]>([]);
  const [selectedSpirit, setSelectedSpirit] = useState<string | null>(null);
  const [isContributing, setIsContributing] = useState(false);

  // Surrender state
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWarData = useCallback(async () => {
    try {
      const res = await fetch('/api/guild-wars');
      if (res.ok) {
        const data = await res.json();
        setActiveWar(data.activeWar);
        setUpcomingWars(data.upcomingWars || []);
        setRecentWars(data.recentWars || []);
        setTopContributors(data.topContributors || []);
        setPlayerContribution(data.playerContribution || 0);
        setRole(data.role || 'member');

        if (data.activeWar) {
          setTimeRemaining(data.activeWar.timeRemaining);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarData();
  }, [fetchWarData]);

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (activeWar && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1000) {
            if (timerRef.current) clearInterval(timerRef.current);
            fetchWarData(); // Refresh when time runs out
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeWar, timeRemaining > 0, fetchWarData]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const GUILD_EMOJIS = ['🏰', '⚔️', '🌟', '🛡️', '🔮', '🌙', '🐉', '💎', '🏆', '🔥'];

  // Search target guilds
  const handleSearchTargets = async () => {
    if (!targetSearch.trim()) return;
    try {
      const res = await fetch(`/api/guild?search=${encodeURIComponent(targetSearch.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTargetGuilds(data.guilds || []);
      }
    } catch {
      // silently fail
    }
  };

  // Declare war
  const handleDeclareWar = async () => {
    if (!selectedTarget || isDeclaring) return;
    setIsDeclaring(true);
    try {
      const res = await fetch('/api/guild-wars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'declare',
          targetGuildId: selectedTarget,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowDeclareDialog(false);
        setSelectedTarget(null);
        setTargetSearch('');
        setTargetGuilds([]);
        fetchWarData();
      } else {
        alert(data.error || 'Error al declarar guerra');
      }
    } catch {
      // silently fail
    } finally {
      setIsDeclaring(false);
    }
  };

  // Fetch player spirits for contribution
  const fetchPlayerSpirits = async () => {
    try {
      const res = await fetch('/api/player?include=spirits');
      if (res.ok) {
        const data = await res.json();
        // Get unplaced spirits only
        const spirits = (data.spirits || []).filter(
          (s: PlayerSpiritInfo & { isPlaced?: boolean }) => !s.isPlaced
        );
        setPlayerSpirits(spirits);
      }
    } catch {
      // silently fail
    }
  };

  // Contribute spirit
  const handleContribute = async () => {
    if (!selectedSpirit || isContributing) return;
    setIsContributing(true);
    try {
      const res = await fetch('/api/guild-wars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'contribute',
          spiritId: selectedSpirit,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowContributeDialog(false);
        setSelectedSpirit(null);
        fetchWarData();
      } else {
        alert(data.error || 'Error al contribuir');
      }
    } catch {
      // silently fail
    } finally {
      setIsContributing(false);
    }
  };

  // Surrender
  const handleSurrender = async () => {
    try {
      const res = await fetch('/api/guild-wars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'surrender' }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowSurrenderConfirm(false);
        fetchWarData();
      } else {
        alert(data.error || 'Error al rendirse');
      }
    } catch {
      // silently fail
    }
  };

  const isOwnerOrOfficer = role === 'owner' || role === 'officer';

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Flame className="h-5 w-5 text-orange-500" />
        </motion.div>
      </div>
    );
  }

  // ===== ACTIVE WAR STATE =====
  if (activeWar) {
    const maxScore = Math.max(activeWar.attackerGuild.score || 0, activeWar.defenderGuild.score || 0, 1);
    const attackerPct = ((activeWar.attackerGuild.score || 0) / maxScore) * 100;
    const defenderPct = ((activeWar.defenderGuild.score || 0) / maxScore) * 100;
    const attackerContributors = topContributors.filter(c => c.side === 'attacker').slice(0, 5);
    const defenderContributors = topContributors.filter(c => c.side === 'defender').slice(0, 5);

    return (
      <div className="flex flex-col gap-4">
        {/* War Banner */}
        <motion.div
          className="relative rounded-2xl border-2 border-orange-500/40 bg-gradient-to-br from-red-950/40 via-orange-950/30 to-amber-950/20 p-4 overflow-hidden"
          animate={{
            boxShadow: [
              '0 0 20px rgba(234,88,12,0.1)',
              '0 0 30px rgba(234,88,12,0.2)',
              '0 0 20px rgba(234,88,12,0.1)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Animated fire particles background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-orange-400/40 rounded-full"
                style={{ left: `${15 + i * 15}%` }}
                animate={{
                  y: [40, -10],
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
              />
            ))}
          </div>

          {/* Title */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Swords className="h-5 w-5 text-orange-400" />
            <h3 className="font-fantasy font-bold text-orange-300 text-lg">
              {t('activeWar')}
            </h3>
            <Swords className="h-5 w-5 text-orange-400" />
          </div>

          {/* Guild vs Guild */}
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Attacker */}
            <div className="flex-1 text-center">
              <div className="w-14 h-14 rounded-xl bg-red-950/50 border-2 border-red-500/30 flex items-center justify-center text-2xl mx-auto mb-1.5">
                {activeWar.attackerGuild.emblem || '⚔️'}
              </div>
              <p className="text-xs font-bold text-red-300 truncate">
                {activeWar.attackerGuild.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Nv. {activeWar.attackerGuild.level}
              </p>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-2xl font-fantasy font-black text-orange-500">VS</span>
              </motion.div>
            </div>

            {/* Defender */}
            <div className="flex-1 text-center">
              <div className="w-14 h-14 rounded-xl bg-blue-950/50 border-2 border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-1.5">
                {activeWar.defenderGuild.emblem || '🛡️'}
              </div>
              <p className="text-xs font-bold text-blue-300 truncate">
                {activeWar.defenderGuild.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Nv. {activeWar.defenderGuild.level}
              </p>
            </div>
          </div>

          {/* Score comparison */}
          <div className="space-y-2 mb-3">
            {/* Attacker score bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-red-400 w-12 text-right">
                {t('score')}
              </span>
              <div className="flex-1 h-4 bg-red-950/30 rounded-full overflow-hidden border border-red-500/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${attackerPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-bold text-red-300 min-w-[48px]">
                {(activeWar.attackerGuild.score || 0).toLocaleString()}
              </span>
            </div>

            {/* Defender score bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-400 w-12 text-right">
                {t('score')}
              </span>
              <div className="flex-1 h-4 bg-blue-950/30 rounded-full overflow-hidden border border-blue-500/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${defenderPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-bold text-blue-300 min-w-[48px]">
                {(activeWar.defenderGuild.score || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Time remaining */}
          <div className="flex items-center justify-center gap-2 text-orange-300 mb-3">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-mono font-bold">
              {t('timeRemaining')}: {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Your contribution */}
          <div className="rounded-xl bg-orange-950/20 border border-orange-500/20 p-3 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-orange-200 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {t('yourContribution')}
              </span>
              <span className="text-sm font-bold text-orange-300">
                {playerContribution.toLocaleString()} pts
              </span>
            </div>
            <div className="w-full h-1.5 bg-orange-950/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all"
                style={{ width: `${Math.min((playerContribution / Math.max(maxScore, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              fetchPlayerSpirits();
              setShowContributeDialog(true);
            }}
            className="flex-1 rounded-xl gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white hover:opacity-90 border-none"
          >
            <Flame className="h-4 w-4" />
            {t('contribute')}
          </Button>
          {role === 'owner' && (
            <Button
              onClick={() => setShowSurrenderConfirm(true)}
              variant="outline"
              className="rounded-xl gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Skull className="h-4 w-4" />
              {t('surrender')}
            </Button>
          )}
        </div>

        {/* Top Contributors */}
        {(attackerContributors.length > 0 || defenderContributors.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('topContributors')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Attacker contributors */}
              <div className="rounded-xl bg-red-950/20 border border-red-500/20 p-2.5">
                <p className="text-[10px] font-bold text-red-400 mb-2 text-center">
                  {activeWar.attackerGuild.name}
                </p>
                <div className="flex flex-col gap-1.5">
                  {attackerContributors.map((c) => (
                    <div key={c.playerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-500">#{c.rank}</span>
                        <span className="text-[11px] truncate max-w-[60px]">{c.displayName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-orange-300">
                        {c.contribution.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {attackerContributors.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center">—</p>
                  )}
                </div>
              </div>

              {/* Defender contributors */}
              <div className="rounded-xl bg-blue-950/20 border border-blue-500/20 p-2.5">
                <p className="text-[10px] font-bold text-blue-400 mb-2 text-center">
                  {activeWar.defenderGuild.name}
                </p>
                <div className="flex flex-col gap-1.5">
                  {defenderContributors.map((c) => (
                    <div key={c.playerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-500">#{c.rank}</span>
                        <span className="text-[11px] truncate max-w-[60px]">{c.displayName}</span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-300">
                        {c.contribution.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {defenderContributors.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center">—</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contribute Dialog */}
        <Dialog open={showContributeDialog} onOpenChange={setShowContributeDialog}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-fantasy flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                {t('contribute')}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2 max-h-72 overflow-y-auto">
              {playerSpirits.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No tienes espíritus disponibles para sacrificar
                  </p>
                </div>
              ) : (
                playerSpirits.map((spirit) => {
                  const rarityMultiplier: Record<string, number> = {
                    common: 10,
                    uncommon: 25,
                    rare: 50,
                    epic: 100,
                    legendary: 250,
                  };
                  const warPoints = (rarityMultiplier[spirit.spiritType.rarity] || 10) * spirit.level;
                  const rarityColor: Record<string, string> = {
                    common: 'text-gray-400',
                    uncommon: 'text-green-400',
                    rare: 'text-blue-400',
                    epic: 'text-purple-400',
                    legendary: 'text-amber-400',
                  };

                  return (
                    <button
                      key={spirit.id}
                      onClick={() => setSelectedSpirit(spirit.id === selectedSpirit ? null : spirit.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        selectedSpirit === spirit.id
                          ? 'border-orange-500/50 bg-orange-950/30'
                          : 'border-border/20 bg-card/40 hover:border-orange-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-lg">
                          {spirit.spiritType.element === 'fire' ? '🔥' :
                           spirit.spiritType.element === 'water' ? '💧' :
                           spirit.spiritType.element === 'nature' ? '🌿' :
                           spirit.spiritType.element === 'dream' ? '💭' : '⭐'}
                        </div>
                        <div className="text-left">
                          <p className={`text-xs font-semibold ${rarityColor[spirit.spiritType.rarity] || 'text-gray-400'}`}>
                            {spirit.spiritType.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Nv. {spirit.level} · {spirit.spiritType.rarity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-orange-400">
                        <Swords className="h-3 w-3" />
                        +{warPoints}
                      </div>
                    </button>
                  );
                })
              )}
              {playerSpirits.length > 0 && (
                <Button
                  onClick={handleContribute}
                  disabled={!selectedSpirit || isContributing}
                  className="rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white"
                >
                  {isContributing ? '...' : t('contribute')}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Surrender Confirm Dialog */}
        <Dialog open={showSurrenderConfirm} onOpenChange={setShowSurrenderConfirm}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-fantasy flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                {t('surrender')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                ¿Estás seguro? Tu gremio perderá la guerra y el enemigo ganará las recompensas.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSurrenderConfirm(false)}
                  className="flex-1 rounded-xl"
                >
                  {tComm('close') || 'Cancelar'}
                </Button>
                <Button
                  onClick={handleSurrender}
                  className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700"
                >
                  <Skull className="h-4 w-4 mr-1" />
                  {t('surrender')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== NO ACTIVE WAR STATE =====
  return (
    <div className="flex flex-col gap-4">
      {/* War title */}
      <div className="flex items-center justify-center gap-2">
        <Swords className="h-5 w-5 text-orange-500" />
        <h3 className="font-fantasy font-bold text-orange-300 text-lg">
          {t('title')}
        </h3>
        <Swords className="h-5 w-5 text-orange-500" />
      </div>

      {/* Declare War button (owner/officer only) */}
      {isOwnerOrOfficer && (
        <Dialog open={showDeclareDialog} onOpenChange={setShowDeclareDialog}>
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white hover:opacity-90 border-none">
              <Swords className="h-4 w-4" />
              {t('declareWar')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-fantasy flex items-center gap-2">
                <Swords className="h-5 w-5 text-orange-500" />
                {t('declareWar')}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <p className="text-xs text-muted-foreground">
                {t('warCost', { cost: 5000 })}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchTargets()}
                    placeholder={t('selectTarget')}
                    className="pl-9 bg-card/40 border-border/30 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleSearchTargets}
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-border/30"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Search results */}
              {targetGuilds.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {targetGuilds.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedTarget(g.id === selectedTarget ? null : g.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                        selectedTarget === g.id
                          ? 'border-orange-500/50 bg-orange-950/30'
                          : 'border-border/20 bg-card/40 hover:border-orange-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-950/30 flex items-center justify-center text-sm border border-red-500/20">
                          {g.emblem || '🏰'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{g.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Nv. {g.level} · {g.memberCount}/{g.maxMembers}
                          </p>
                        </div>
                      </div>
                      {selectedTarget === g.id && (
                        <Swords className="h-4 w-4 text-orange-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleDeclareWar}
                disabled={!selectedTarget || isDeclaring}
                className="rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white"
              >
                {isDeclaring ? '...' : t('declareWar')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upcoming Wars */}
      {upcomingWars.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('upcomingWar')}
            </p>
          </div>
          {upcomingWars.map((war) => {
            const hoursUntil = Math.floor(war.timeUntilStart / 3600000);
            const minutesUntil = Math.floor((war.timeUntilStart % 3600000) / 60000);

            return (
              <div
                key={war.id}
                className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-950/30 flex items-center justify-center text-sm border border-red-500/20">
                      {war.attackerGuild.emblem || '⚔️'}
                    </div>
                    <span className="text-xs font-bold text-orange-300">VS</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-950/30 flex items-center justify-center text-sm border border-blue-500/20">
                      {war.defenderGuild.emblem || '🛡️'}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {hoursUntil}h {minutesUntil}m
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{war.attackerGuild.name}</span>
                  <span>{war.defenderGuild.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Wars */}
      {recentWars.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('recentWars')}
            </p>
          </div>
          {recentWars.map((war) => {
            const isVictory = war.result === 'victory';
            const isDefeat = war.result === 'defeat';
            const isDraw = war.result === 'draw';

            return (
              <motion.button
                key={war.id}
                onClick={() => setShowResult(war)}
                className="w-full text-left rounded-xl border border-border/20 bg-card/40 p-3 hover:border-orange-500/20 transition-all"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isVictory
                        ? 'bg-amber-500/20 text-amber-400'
                        : isDefeat
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {isVictory ? t('victory') : isDefeat ? t('defeat') : t('draw')}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-red-400">{war.attackerGuild.name}</span>
                    <span className="text-[10px] font-bold">{war.attackerScore}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">-</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold">{war.defenderScore}</span>
                    <span className="text-[10px] text-blue-400">{war.defenderGuild.name}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* No wars at all */}
      {upcomingWars.length === 0 && recentWars.length === 0 && (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-orange-500/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('noWars')}</p>
          {isOwnerOrOfficer && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t('declareWar')} {t('warCost', { cost: 5000 })}
            </p>
          )}
        </div>
      )}

      {/* War Result Dialog */}
      <Dialog open={!!showResult} onOpenChange={() => setShowResult(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          {showResult && (
            <>
              <DialogHeader>
                <DialogTitle className="font-fantasy text-center">
                  {showResult.result === 'victory' ? (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                      className="flex items-center justify-center gap-2 text-amber-400"
                    >
                      <Trophy className="h-6 w-6" />
                      {t('victory')}
                      <Trophy className="h-6 w-6" />
                    </motion.div>
                  ) : showResult.result === 'defeat' ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-purple-400"
                    >
                      <Skull className="h-6 w-6" />
                      {t('defeat')}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-gray-400"
                    >
                      {t('draw')}
                    </motion.div>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                {/* Score breakdown */}
                <div className="rounded-xl bg-card/40 border border-border/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-center flex-1">
                      <div className="w-10 h-10 rounded-lg bg-red-950/30 flex items-center justify-center text-lg border border-red-500/20 mx-auto mb-1">
                        {showResult.attackerGuild.emblem || '⚔️'}
                      </div>
                      <p className="text-[10px] font-bold text-red-400">{showResult.attackerGuild.name}</p>
                      <p className="text-lg font-black text-red-300">{showResult.attackerScore.toLocaleString()}</p>
                    </div>
                    <div className="text-lg font-fantasy font-bold text-muted-foreground">VS</div>
                    <div className="text-center flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-950/30 flex items-center justify-center text-lg border border-blue-500/20 mx-auto mb-1">
                        {showResult.defenderGuild.emblem || '🛡️'}
                      </div>
                      <p className="text-[10px] font-bold text-blue-400">{showResult.defenderGuild.name}</p>
                      <p className="text-lg font-black text-blue-300">{showResult.defenderScore.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Winner */}
                  {showResult.winnerId && (
                    <div className="text-center mt-2">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Crown className="h-3 w-3 mr-1" />
                        {t('winner')}: {
                          showResult.winnerId === showResult.attackerGuild.id
                            ? showResult.attackerGuild.name
                            : showResult.defenderGuild.name
                        }
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Rewards info */}
                <div className="rounded-xl bg-orange-950/10 border border-orange-500/20 p-3">
                  <p className="text-xs font-bold text-orange-300 mb-2 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('rewards')}
                  </p>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <p>🏆 {t('winner')}: 2x Lumens + 1000 bonus + 500 XP</p>
                    <p>💀 {t('defeat')}: 50% Lumens devueltos + 100 XP</p>
                  </div>
                </div>

                <Button
                  onClick={() => setShowResult(null)}
                  className="rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white"
                >
                  {tComm('close') || 'Continuar'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
