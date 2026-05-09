'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, X, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/store';
import { toast } from 'sonner';
import { audioService } from '@/lib/audioService';

interface EnergyRefillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EnergyRefillDialog({ isOpen, onClose, onSuccess }: EnergyRefillDialogProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const lumens = useGameStore((state) => state.lumens);
  const refillCost = 250;
  const canAfford = lumens >= refillCost;

  const handlePurchase = async () => {
    if (!canAfford || isPurchasing) return;
    
    setIsPurchasing(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: 'shop_energy_refill' }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        audioService.playWin();
        toast.success('¡Energía restaurada al máximo!');
        
        // Sync stats globally
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
      setIsPurchasing(false);
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
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-xs bg-card/90 border border-lumora-blue/30 rounded-3xl p-6 shadow-2xl overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-lumora-blue/20 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-2xl bg-lumora-blue/10 border border-lumora-blue/20">
                <Zap className="h-10 w-10 text-lumora-blue animate-pulse" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-fantasy text-2xl text-white uppercase tracking-tight">¡Sin Energía!</h3>
                <p className="text-sm text-muted-foreground">Tu espíritu necesita descansar... o una recarga mágica.</p>
              </div>

              <div className="w-full py-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-background/50 border border-border/20">
                  <span className="text-xs text-muted-foreground font-semibold">COSTE RECARGA</span>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-lumora-gold" />
                    <span className="font-bold text-lumora-gold">{refillCost}</span>
                  </div>
                </div>

                {!canAfford && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-[10px] text-left">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>No tienes suficientes Lumens. Espera a que se regenere o abre cofres.</span>
                  </div>
                )}
              </div>

              <div className="w-full flex flex-col gap-2">
                <Button
                  onClick={handlePurchase}
                  disabled={!canAfford || isPurchasing}
                  className="w-full h-12 rounded-xl bg-lumora-blue text-white font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isPurchasing ? 'Recargando...' : 'RECARGAR AHORA'}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full text-xs text-muted-foreground hover:text-white"
                >
                  Luego, gracias
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
