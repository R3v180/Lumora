'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Coins, Sparkles, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { audioService } from '@/lib/audioService';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldLPH: number;
  newLPH: number;
}

export function OptimizationModal({ isOpen, onClose, oldLPH, newLPH }: OptimizationModalProps) {
  
  useEffect(() => {
    if (isOpen) {
      audioService.playWin();
    }
  }, [isOpen]);

  const gain = newLPH - oldLPH;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with extreme blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm bg-[#0f0f12] border-2 border-lumora-gold/30 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(250,204,21,0.15)] overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.1)_0%,transparent_70%)]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Magic Icon */}
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                className="mb-6 p-5 rounded-3xl bg-gradient-to-br from-lumora-gold/20 to-yellow-600/10 border border-lumora-gold/30 relative"
              >
                <div className="absolute inset-0 bg-lumora-gold blur-xl opacity-20 animate-pulse" />
                <Wand2 className="h-12 w-12 text-lumora-gold relative z-10" />
              </motion.div>

              {/* Titles */}
              <div className="space-y-1 mb-8">
                <motion.h2 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-black text-white uppercase italic tracking-tighter"
                >
                  Isla Optimizada
                </motion.h2>
                <motion.p 
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]"
                >
                  Configuración de Máxima Eficiencia
                </motion.p>
              </div>

              {/* Production Stats Comparison */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full bg-white/5 rounded-3xl p-6 border border-white/10 mb-8 flex flex-col gap-4"
              >
                <div className="flex justify-between items-center px-2">
                  <div className="flex flex-col items-start">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Anterior</span>
                    <span className="text-lg font-bold text-white/60">{oldLPH} L/H</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/20" />
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-lumora-gold uppercase tracking-widest">Nuevo</span>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-black text-lumora-gold italic">{newLPH}</span>
                      <span className="text-xs font-black text-lumora-gold/50">L/H</span>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-white/5" />

                <div className="flex items-center justify-center gap-2 text-lumora-emerald">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-black uppercase tracking-tighter">Incremento de +{gain} Lumens/Hora</span>
                </div>
              </motion.div>

              {/* Action Button */}
              <Button
                onClick={onClose}
                className="w-full h-14 rounded-2xl bg-gradient-to-br from-lumora-gold to-yellow-600 text-black font-black text-lg shadow-xl shadow-lumora-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ¡EXCELENTE!
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
