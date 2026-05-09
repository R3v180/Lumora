'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Clock, Sparkles, Zap, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { usePlayer } from '@/hooks/usePlayer';
import { audioService } from '@/lib/audioService';

interface Chest {
  id: string;
  type: string;
  rarity: string;
  unlocksAt: string;
  isOpened: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-muted to-muted-foreground',
  rare: 'from-lumora-blue/50 to-lumora-blue',
  epic: 'from-lumora-purple/50 to-lumora-purple',
  legendary: 'from-lumora-gold/50 to-lumora-gold',
};

const RARITY_BORDERS: Record<string, string> = {
  common: 'border-muted-foreground/30',
  rare: 'border-lumora-blue/50',
  epic: 'border-lumora-purple/50',
  legendary: 'border-lumora-gold/50',
};

export function ChestPanel() {
  const [chests, setChests] = useState<Chest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { player } = usePlayer();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(int);
  }, []);

  const fetchChests = useCallback(async () => {
    try {
      const res = await fetch('/api/chest');
      if (res.ok) {
        const data = await res.json();
        setChests(data.chests || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChests();
  }, [fetchChests]);

  const handleOpen = async (chest: Chest, useLumens: boolean) => {
    const unlocksAt = new Date(chest.unlocksAt).getTime();
    const isLocked = now < unlocksAt;

    let cost = 0;
    if (isLocked) {
      const hoursRemaining = Math.ceil((unlocksAt - now) / (1000 * 60 * 60));
      cost = hoursRemaining * 100;
      if (!useLumens) {
        toast.info(`Faltan ${hoursRemaining}h para abrir este cofre.`);
        return;
      }
      if (player && player.lumens < cost) {
        toast.error('Lumens insuficientes para abrir temprano.');
        return;
      }
    }

    setOpeningId(chest.id);
    try {
      const res = await fetch('/api/chest/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chestId: chest.id, useLumens })
      });
      const data = await res.json();
      
      if (res.ok) {
        audioService.playWin();
        toast.success(`Cofre abierto: +${data.rewards.lumens} ✨, +${data.rewards.energy} ⚡`);
        useGameStore.getState().syncPlayerStats({
          lumens: data.newLumens,
          energy: data.newEnergy,
          maxEnergy: useGameStore.getState().maxEnergy
        });
        useGameStore.getState().triggerRefresh();
        fetchChests();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setOpeningId(null);
    }
  };

  if (isLoading) return null;
  if (chests.length === 0) return null;

  return (
    <div className="w-full space-y-3 mb-6">
      <h3 className="font-fantasy font-bold text-lg text-lumora-gold flex items-center gap-2">
        <Box className="h-5 w-5" /> Tus Cofres
      </h3>
      <div className="flex flex-wrap gap-3">
        <AnimatePresence>
          {chests.map((chest) => {
            const unlocksAt = new Date(chest.unlocksAt).getTime();
            const isLocked = now < unlocksAt;
            const hoursRemaining = Math.ceil((unlocksAt - now) / (1000 * 60 * 60));
            const cost = hoursRemaining * 100;

            return (
              <motion.div
                key={chest.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={`relative w-28 p-3 rounded-xl border bg-card/60 flex flex-col items-center gap-2 ${RARITY_BORDERS[chest.rarity]}`}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${RARITY_COLORS[chest.rarity]} flex items-center justify-center relative overflow-hidden`}>
                  <Box className="h-6 w-6 text-white drop-shadow-md relative z-10" />
                  {isLocked && <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center backdrop-blur-[1px]"><Key className="h-4 w-4 text-white/80" /></div>}
                </div>
                
                <div className="text-center w-full">
                  {isLocked ? (
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {hoursRemaining}h
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpen(chest, true)}
                        disabled={openingId === chest.id}
                        className="h-6 text-[10px] w-full px-1 py-0 gap-1 rounded border-lumora-gold/30 text-lumora-gold hover:bg-lumora-gold/10"
                      >
                        Abrir {cost}✨
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpen(chest, false)}
                      disabled={openingId === chest.id}
                      className="h-6 text-[10px] w-full px-1 py-0 gap-1 rounded bg-lumora-emerald text-white hover:bg-lumora-emerald/80"
                    >
                      ¡Abrir!
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
