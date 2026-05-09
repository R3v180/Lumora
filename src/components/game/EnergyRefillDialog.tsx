'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, X, AlertCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/store';
import { toast } from 'sonner';
import { audioService } from '@/lib/audioService';

interface EnergyRefillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REFILL_OPTIONS = [
  { id: 'shop_energy_small', name: 'Poción', amount: 25, price: 75, iconSize: 16 },
  { id: 'shop_energy_medium', name: 'Elixir', amount: 60, price: 150, iconSize: 22 },
  { id: 'shop_energy_refill', name: 'Esencia', amount: 'FULL', price: 250, iconSize: 28 },
];

export function EnergyRefillDialog({ isOpen, onClose, onSuccess }: EnergyRefillDialogProps) {
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const lumens = useGameStore((state) => state.lumens);

  const handlePurchase = async (itemId: string, price: number) => {
    if (lumens < price || isPurchasing) return;
    
    setIsPurchasing(itemId);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        audioService.playWin();
        toast.success('¡Energía restaurada!');
        
        useGameStore.getState().syncPlayerStats({
          lumens: data.newLumens,
          energy: data.newEnergy,
          maxEnergy: useGameStore.getState().maxEnergy
        });
        
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Error al recargar');
      }
    } catch (error) {
      toast.error('Error de red');
    } finally {
      setIsPurchasing(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-card/90 border border-white/10 rounded-[2.5rem] p-7 shadow-2xl overflow-hidden"
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-lumora-blue/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-lumora-purple/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col items-center gap-6">
              <button 
                onClick={onClose}
                className="absolute -top-2 -right-2 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>

              <div className="flex flex-col items-center text-center gap-2">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-lumora-blue/20 to-lumora-purple/20 border border-white/10 shadow-inner mb-2">
                  <Zap className="h-8 w-8 text-lumora-blue animate-pulse" />
                </div>
                <h3 className="font-fantasy text-3xl text-white uppercase tracking-tight italic font-black">¡Sin Energía!</h3>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest px-4">Recarga tu reserva para continuar la aventura</p>
              </div>

              {/* Options Grid */}
              <div className="w-full grid grid-cols-1 gap-3">
                {REFILL_OPTIONS.map((opt) => {
                  const canAfford = lumens >= opt.price;
                  const loading = isPurchasing === opt.id;

                  return (
                    <motion.button
                      key={opt.id}
                      onClick={() => handlePurchase(opt.id, opt.price)}
                      disabled={!canAfford || !!isPurchasing}
                      whileHover={canAfford ? { scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                      whileTap={canAfford ? { scale: 0.98 } : {}}
                      className={`
                        relative group flex items-center justify-between p-4 rounded-3xl border transition-all duration-300
                        ${canAfford 
                          ? 'bg-white/5 border-white/10 hover:border-lumora-blue/50' 
                          : 'bg-black/20 border-white/5 opacity-60 grayscale cursor-not-allowed'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                          <Zap 
                            className="text-lumora-blue" 
                            style={{ width: opt.iconSize, height: opt.iconSize, filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.5))' }} 
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">{opt.name}</p>
                          <p className="text-xl font-black text-white leading-none">
                            {opt.amount === 'FULL' ? 'MAX' : `+${opt.amount}`} <span className="text-[10px] text-lumora-blue font-bold tracking-normal">⚡</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5">
                          <Sparkles className="h-3 w-3 text-lumora-gold" />
                          <span className={`text-sm font-black ${canAfford ? 'text-lumora-gold' : 'text-muted-foreground'}`}>
                            {opt.price}
                          </span>
                        </div>
                        {loading && (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                            <ShoppingBag className="h-3 w-3 text-lumora-blue" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {!REFILL_OPTIONS.some(o => lumens >= o.price) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/5 text-destructive border border-destructive/10 text-[10px] text-left">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-bold uppercase tracking-tight">No tienes suficientes Lumens. Espera un momento o abre cofres.</span>
                </motion.div>
              )}

              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors"
              >
                Cerrar Ventana
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
