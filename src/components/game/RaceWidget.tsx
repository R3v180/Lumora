'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Timer, Trophy, Zap } from 'lucide-react';

interface RaceRankEntry {
  rank: number;
  displayName: string;
  level: number;
  score: number;
  isYou: boolean;
}

export function RaceWidget() {
  const t = useTranslations('race');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [myScore, setMyScore] = useState(0);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [ranking, setRanking] = useState<RaceRankEntry[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchRace = useCallback(async () => {
    try {
      const res = await fetch('/api/race');
      if (res.ok) {
        const data = await res.json();
        if (data.race && data.race.status === 'active' && data.race.timeLeftMs > 0) {
          setIsActive(true);
          setTimeLeft(data.race.timeLeftMs);
          setMyScore(data.myScore);
          setMyPosition(data.myPosition);
          setRanking(data.ranking);
        } else {
          setIsActive(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch race:', err);
    }
  }, []);

  useEffect(() => {
    fetchRace();
    const interval = setInterval(fetchRace, 5000);
    return () => clearInterval(interval);
  }, [fetchRace]);

  // Countdown timer
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          setIsActive(false);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  if (!isActive) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mb-4"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-2xl border border-lumora-pink/30 bg-gradient-to-r from-lumora-pink/10 to-lumora-purple/10 backdrop-blur-sm p-3 transition-all hover:border-lumora-pink/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-lumora-pink" />
            <span className="text-xs font-bold text-lumora-pink">{t('active')}</span>
          </div>
          <div className="flex items-center gap-3">
            {myPosition && (
              <span className="text-[10px] font-bold text-lumora-gold">
                #{myPosition} · {myScore.toLocaleString()} pts
              </span>
            )}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-lumora-pink/20">
              <Timer className="h-3 w-3 text-lumora-pink" />
              <span className="text-[10px] font-mono font-bold text-lumora-pink">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Expanded ranking */}
        {expanded && ranking.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-2 pt-2 border-t border-lumora-pink/20 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {ranking.slice(0, 5).map((r) => (
              <div
                key={r.rank}
                className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                  r.isYou ? 'bg-lumora-gold/10 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {r.rank <= 3 ? (
                    <Trophy className={`h-3 w-3 ${r.rank === 1 ? 'text-lumora-gold' : r.rank === 2 ? 'text-gray-300' : 'text-amber-600'}`} />
                  ) : (
                    <span className="text-[10px] text-muted-foreground w-3">#{r.rank}</span>
                  )}
                  <span>{r.displayName} {r.isYou ? '⭐' : ''}</span>
                </div>
                <span className="text-[10px] text-lumora-gold">{r.score.toLocaleString()} pts</span>
              </div>
            ))}
          </motion.div>
        )}
      </button>
    </motion.div>
  );
}
