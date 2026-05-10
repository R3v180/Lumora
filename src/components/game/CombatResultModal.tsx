'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Skull, Sparkles, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { audioService } from '@/lib/audioService';
import confetti from 'canvas-confetti';

interface Reward {
  type: 'lumens' | 'chest' | 'spirit' | 'exp';
  amount: number | string;
  name?: string;
  rarity?: string;
}

interface CombatResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'victory' | 'defeat';
  title: string;
  subtitle?: string;
  rewards?: Reward[];
  stats?: { label: string; value: string | number }[];
  bossImage?: string;
}

export function CombatResultModal({
  isOpen,
  onClose,
  type,
  title,
  subtitle,
  rewards = [],
  stats = [],
  bossImage
}: CombatResultModalProps) {
  
  useEffect(() => {
    if (isOpen) {
      if (type === 'victory') {
        audioService.playWin();
        // Fire confetti
        const duration = 3 * 1000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FFA500', '#FFFFFF']
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#FFA500', '#FFFFFF']
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      } else {
        audioService.playError();
      }
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border-2 shadow-2xl bg-card ${
            type === 'victory' ? 'border-lumora-gold/50 shadow-lumora-gold/20' : 'border-destructive/30'
          }`}
        >
          {/* Header Glow */}
          <div className={`absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none ${
            type === 'victory' ? 'bg-lumora-gold' : 'bg-destructive'
          }`} style={{ filter: 'blur(60px)' }} />

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="relative p-6 flex flex-col items-center text-center">
            {/* Icon/Badge */}
            <motion.div
              initial={{ rotate: -10, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.6 }}
              className={`mb-6 p-5 rounded-2xl ${
                type === 'victory' ? 'bg-lumora-gold/20 text-lumora-gold' : 'bg-destructive/20 text-destructive'
              }`}
            >
              {type === 'victory' ? <Trophy className="h-12 w-12" /> : <Skull className="h-12 w-12" />}
            </motion.div>

            {/* Titles */}
            <h2 className={`text-4xl font-fantasy font-black mb-2 tracking-wider ${
              type === 'victory' ? 'text-lumora-gold drop-shadow-sm' : 'text-destructive'
            }`}>
              {title}
            </h2>
            {subtitle && <p className="text-muted-foreground text-sm mb-8">{subtitle}</p>}

            {/* Boss Image (if applicable) */}
            {bossImage && (
              <div className="relative w-48 h-48 mb-8">
                <img 
                  src={bossImage} 
                  alt="Boss" 
                  className={`w-full h-full object-contain ${type === 'victory' ? 'grayscale opacity-50' : ''}`} 
                />
                {type === 'victory' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/60 px-4 py-1 rounded-full border border-white/10 text-white font-black text-xs uppercase tracking-widest">
                      Derrotado
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rewards Section */}
            {rewards.length > 0 && (
              <div className="w-full space-y-3 mb-8">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Botín Obtenido</p>
                <div className="grid grid-cols-2 gap-3">
                  {rewards.map((reward, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
                    >
                      <div className={`p-2 rounded-lg bg-background/50 ${
                        reward.type === 'chest' ? 'text-lumora-pink' : 
                        reward.type === 'exp' ? 'text-lumora-blue' : 
                        'text-lumora-gold'
                      }`}>
                        {reward.type === 'lumens' && <Sparkles className="h-4 w-4" />}
                        {reward.type === 'exp' && <TrendingUp className="h-4 w-4" />}
                        {reward.type === 'chest' && <Trophy className="h-4 w-4" />}
                        {reward.type === 'spirit' && <Sparkles className="h-4 w-4" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-muted-foreground leading-none mb-1 uppercase font-black tracking-tighter">
                          {reward.type === 'exp' ? 'EXPERIENCIA' : reward.type === 'chest' ? `COFRE ${reward.rarity}` : reward.type}
                        </p>
                        <p className="font-bold text-white text-sm">
                          {reward.type === 'chest' ? '¡NUEVO!' : `+${reward.amount}`}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Section */}
            {stats.length > 0 && (
              <div className="w-full bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
                <div className="flex justify-around">
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[9px] text-muted-foreground uppercase font-black">{stat.label}</p>
                      <p className="text-lg font-bold text-lumora-blue">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={onClose}
              className={`w-full py-6 rounded-2xl font-black text-lg transition-all ${
                type === 'victory' 
                  ? 'bg-gradient-to-r from-lumora-gold to-lumora-orange text-black hover:scale-[1.02] shadow-lg shadow-lumora-gold/20' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {type === 'victory' ? '¡RECLAMAR RECOMPENSAS!' : 'CERRAR'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
