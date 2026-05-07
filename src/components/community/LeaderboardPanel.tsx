'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Trophy, Sparkles, Shield, Users, Flame, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  level: number;
  sanctuaryLevel: number;
  lumens: number;
  spiritCount: number;
  avatar: string | null;
  isMe: boolean;
}

type Category = 'lumens' | 'level' | 'spirits' | 'sanctuary';

const CATEGORIES: { key: Category; icon: any; color: string }[] = [
  { key: 'lumens', icon: Sparkles, color: 'text-lumora-gold' },
  { key: 'level', icon: Flame, color: 'text-lumora-fire' },
  { key: 'spirits', icon: Users, color: 'text-lumora-emerald' },
  { key: 'sanctuary', icon: Shield, color: 'text-lumora-purple' },
];

export function LeaderboardPanel() {
  const t = useTranslations('community');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [category, setCategory] = useState<Category>('lumens');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?category=${category}&page=${page}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setTotalPages(data.pagination.totalPages);
        setMyRank(data.myRank);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Reset page when category changes
  useEffect(() => {
    setPage(1);
  }, [category]);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', bg: 'bg-lumora-gold/10 border-lumora-gold/30' };
    if (rank === 2) return { emoji: '🥈', bg: 'bg-gray-400/10 border-gray-400/30' };
    if (rank === 3) return { emoji: '🥉', bg: 'bg-amber-700/10 border-amber-700/30' };
    return { emoji: null, bg: 'bg-card/40 border-border/20' };
  };

  const getCategoryValue = (entry: LeaderboardEntry) => {
    switch (category) {
      case 'lumens':
        return `${entry.lumens.toLocaleString()} ✨`;
      case 'level':
        return `Nv. ${entry.level}`;
      case 'spirits':
        return `${entry.spiritCount} 👻`;
      case 'sanctuary':
        return `Nv. ${entry.sanctuaryLevel} 🏝️`;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? `${cat.color} bg-card/60 border border-current/20`
                  : 'text-muted-foreground bg-card/30 border border-border/20 hover:bg-card/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`rank${cat.key.charAt(0).toUpperCase() + cat.key.slice(1)}`)}
            </button>
          );
        })}
      </div>

      {/* My rank */}
      {myRank && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-lumora-purple/10 to-lumora-blue/10 border border-lumora-purple/20">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-lumora-gold" />
            <span className="text-sm font-semibold">{t('yourRank')}</span>
          </div>
          <Badge className="bg-lumora-gold/20 text-lumora-gold border-lumora-gold/30">
            #{myRank}
          </Badge>
        </div>
      )}

      {/* Leaderboard list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="h-5 w-5 text-lumora-gold" />
          </motion.div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('noRankings')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry) => {
            const rankDisplay = getRankDisplay(entry.rank);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: entry.rank * 0.02 }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                  rankDisplay.bg
                } ${entry.isMe ? 'ring-1 ring-lumora-blue/40' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-7 text-center">
                    {rankDisplay.emoji ? (
                      <span className="text-sm">{rankDisplay.emoji}</span>
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </div>
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 border border-border/30">
                      <AvatarImage src={entry.avatar || undefined} />
                      <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-[10px]">
                        {entry.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`text-sm ${entry.isMe ? 'font-bold text-lumora-blue' : 'font-semibold'}`}>
                        {entry.displayName}
                        {entry.isMe && (
                          <span className="text-[10px] ml-1 text-lumora-blue/70">
                            ({t('you')})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Value */}
                <span className="text-xs font-semibold">
                  {getCategoryValue(entry)}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-card/60 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-card/60 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
