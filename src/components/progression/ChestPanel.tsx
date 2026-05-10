'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Clock, Sparkles, Zap, Key, Lock, Unlock, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { usePlayer } from '@/hooks/usePlayer';
import { audioService } from '@/lib/audioService';
import { WinScreen } from '@/components/game/WinScreen';

interface Chest {
  id: string;
  type: string;
  rarity: string;
  status: 'locked' | 'unlocking' | 'ready' | 'opened';
  durationMs: number;
  startedUnlockAt: string | null;
  unlocksAt: string;
  isOpened: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-lumora-blue to-blue-700',
  epic: 'from-lumora-purple to-purple-800',
  legendary: 'from-lumora-gold to-orange-600',
};

const RARITY_SHADOWS: Record<string, string> = {
  common: 'shadow-slate-500/20',
  rare: 'shadow-lumora-blue/30',
  epic: 'shadow-lumora-purple/40',
  legendary: 'shadow-lumora-gold/50',
};

export function ChestPanel() {
  const [chests, setChests] = useState<Chest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [showWinScreen, setShowWinScreen] = useState(false);
  const [lastRewards, setLastRewards] = useState<any>(null);
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

  const handleStartUnlock = async (chestId: string) => {
    try {
      const res = await fetch('/api/chest/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chestId })
      });
      if (res.ok) {
        toast.success('¡Desbloqueo iniciado!');
        audioService.playClick();
        fetchChests();
      }
    } catch {
      toast.error('Error al iniciar desbloqueo');
    }
  };

  const handleOpen = async (chest: Chest, useLumens: boolean) => {
    setOpeningId(chest.id);
    try {
      const res = await fetch('/api/chest/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chestId: chest.id, useLumens })
      });
      const data = await res.json();
      
      if (res.ok) {
        setLastRewards([
          { type: 'lumens', amount: data.rewards.lumens },
          { type: 'energy', amount: data.rewards.energy }
        ]);
        setShowWinScreen(true);
        
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
    <div className="w-full space-y-4 mb-8">
      <WinScreen 
        isOpen={showWinScreen}
        onClose={() => setShowWinScreen(false)}
        type="chest"
        title="¡Cofre Abierto!"
        rewards={lastRewards || []}
      />
      <div className="flex items-center justify-between">
        <h3 className="font-fantasy font-bold text-xl text-lumora-gold flex items-center gap-3">
          <Box className="h-6 w-6" /> Tus Cofres
        </h3>
        <Badge variant="outline" className="text-[10px] uppercase tracking-tighter opacity-70">
          Espacios: {chests.length}/4
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {chests.map((chest) => {
            const unlocksAt = new Date(chest.unlocksAt).getTime();
            const startedAt = chest.startedUnlockAt ? new Date(chest.startedUnlockAt).getTime() : 0;
            const totalMs = chest.durationMs;
            const elapsed = chest.status === 'unlocking' ? Math.max(0, now - startedAt) : 0;
            const progress = Math.min(100, (elapsed / totalMs) * 100);
            
            const isReady = chest.status === 'ready' || (chest.status === 'unlocking' && now >= unlocksAt);
            const remainingMs = Math.max(0, unlocksAt - now);
            
            // Format time
            const h = Math.floor(remainingMs / (1000 * 60 * 60));
            const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;

            // Dynamic cost (max 500 lumens)
            const currentCost = isReady ? 0 : Math.ceil((remainingMs / totalMs) * 500);

            return (
              <motion.div
                key={chest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`relative group p-4 rounded-2xl border-2 bg-card/40 backdrop-blur-md flex flex-col items-center gap-3 transition-all hover:bg-card/60 shadow-lg cursor-pointer ${RARITY_SHADOWS[chest.rarity]} ${isReady ? 'border-lumora-emerald/50 animate-pulse-subtle' : 'border-border/20'}`}
                onClick={() => {
                  if (chest.status === 'locked') handleStartUnlock(chest.id);
                  else if (isReady) handleOpen(chest, false);
                  else if (chest.status === 'unlocking') handleOpen(chest, true);
                }}
              >
                {/* Rarity Tag */}
                <div className="absolute -top-2 px-2 py-0.5 rounded-full bg-background border border-border/50 text-[8px] font-bold uppercase tracking-widest">
                  {chest.rarity}
                </div>

                {/* Chest Icon */}
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500`}>
                  {/* Outer Glow based on rarity */}
                  <div className={`absolute inset-2 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${RARITY_COLORS[chest.rarity]}`} />
                  
                  <img 
                    src={`/assets/chests/chest_${chest.rarity}.png`} 
                    alt={chest.rarity} 
                    className={`w-20 h-20 object-contain relative z-10 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] ${chest.status === 'locked' ? 'grayscale opacity-60' : ''}`} 
                  />
                  
                  {chest.status === 'locked' && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="bg-black/40 backdrop-blur-[2px] p-2 rounded-full border border-white/20">
                        <Lock className="h-5 w-5 text-white shadow-lg" />
                      </div>
                    </div>
                  )}

                  {isReady && (
                    <motion.div 
                      animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 z-0 rounded-full blur-3xl bg-gradient-to-br ${RARITY_COLORS[chest.rarity]}`}
                    />
                  )}
                </div>

                {/* Footer Action Area */}
                <div className="w-full mt-auto pt-3 border-t border-white/5">
                  {chest.status === 'locked' && (
                    <div className="flex flex-col items-center gap-1.5 group-hover:scale-105 transition-transform">
                      <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Esperando</span>
                      <Unlock className="h-4 w-4 text-lumora-blue" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-lumora-blue">Desbloquear</span>
                    </div>
                  )}

                  {chest.status === 'unlocking' && !isReady && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[8px] text-muted-foreground font-mono">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeStr}</span>
                          <span>{Math.floor(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1 bg-white/5" />
                      </div>
                      <div className="flex flex-col items-center gap-1 group-hover:scale-105 transition-transform">
                        <Zap className="h-4 w-4 text-lumora-gold fill-current" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-lumora-gold">Abrir: {currentCost}</span>
                      </div>
                    </div>
                  )}

                  {isReady && (
                    <div className="flex flex-col items-center gap-1.5 py-1 animate-pulse group-hover:scale-105 transition-transform">
                      <Sparkles className="h-4 w-4 text-lumora-emerald" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-lumora-emerald italic">¡RECLAMAR!</span>
                    </div>
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
