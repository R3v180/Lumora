'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Zap, Box, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { audioService } from '@/lib/audioService';
import { useEffect } from 'react';

interface Reward {
  type: 'lumens' | 'energy' | 'spirit' | 'chest';
  amount: number | string;
  rarity?: string;
}

interface WinScreenProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  rewards: Reward[];
  type?: 'win' | 'level-up' | 'chest';
}

const RARITY_COLORS: Record<string, string> = {
  common: 'text-slate-400',
  rare: 'text-lumora-blue',
  epic: 'text-lumora-purple',
  legendary: 'text-lumora-gold',
};

export function WinScreen({ isOpen, onClose, title = "¡Victoria!", subtitle = "Has ganado recompensas oníricas", rewards, type = 'win' }: WinScreenProps) {
  
  useEffect(() => {
    if (isOpen) {
      audioService.playWin();
      // Optional: add haptic feedback here if available
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 15, stiffness: 150 }}
            className="relative w-full max-w-sm bg-card/90 border-2 border-lumora-gold/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(250,204,21,0.2)] overflow-hidden"
          >
            {/* Background Ray Glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.2)_0%,transparent_70%)]" />
            </div>

            <div className="relative z-10 text-center space-y-6">
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex p-4 rounded-full bg-lumora-gold/10 border-2 border-lumora-gold/20 mb-2"
              >
                {type === 'win' && <Trophy className="h-12 w-12 text-lumora-gold animate-pulse" />}
                {type === 'chest' && <Box className="h-12 w-12 text-lumora-purple animate-bounce" />}
              </motion.div>

              <div className="space-y-1">
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="font-fantasy text-4xl text-lumora-gold drop-shadow-sm uppercase tracking-tight"
                >
                  {title}
                </motion.h2>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-muted-foreground"
                >
                  {subtitle}
                </motion.p>
              </div>

              {/* Rewards Grid */}
              <div className="grid grid-cols-2 gap-3 py-2">
                {rewards.map((reward, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ x: idx % 2 === 0 ? -20 : 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + (idx * 0.1) }}
                    className="flex flex-col items-center p-3 rounded-2xl bg-background/50 border border-border/20 shadow-inner"
                  >
                    <div className="p-2 rounded-lg bg-card mb-2">
                      {reward.type === 'lumens' && <Sparkles className="h-5 w-5 text-lumora-gold" />}
                      {reward.type === 'energy' && <Zap className="h-5 w-5 text-lumora-blue" />}
                      {reward.type === 'chest' && <Box className="h-5 w-5 text-lumora-purple" />}
                    </div>
                    <span className="text-xs font-bold whitespace-nowrap">
                      +{reward.amount} {reward.type === 'lumens' ? 'Lumens' : reward.type === 'energy' ? '⚡' : ''}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-4"
              >
                <Button
                  onClick={onClose}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-lumora-gold to-orange-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all group"
                >
                  RECLAMAR RECOMPENSA
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
