'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Zap, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlotHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SlotHelpDialog({ isOpen, onClose }: SlotHelpDialogProps) {
  if (!isOpen) return null;

  const PAYTABLE = [
    { element: 'fire', name: 'Fuego', payout: '150 - 500', emoji: '🔥' },
    { element: 'water', name: 'Agua', payout: '120 - 450', emoji: '💧' },
    { element: 'nature', name: 'Naturaleza', payout: '100 - 400', emoji: '🌿' },
    { element: 'dream', name: 'Sueño', payout: '200 - 800', emoji: '🌙' },
    { element: 'star', name: 'Estrella', payout: '300 - 1500', emoji: '⭐' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-lumora-blue" />
                <h2 className="text-xl font-fantasy font-bold text-white">Guía del Altar</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Multiplier Info */}
              <section className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-lumora-pink" />
                  <h3 className="text-sm font-bold text-lumora-pink uppercase tracking-wider">Multiplicadores (Bet)</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ajusta tu apuesta para multiplicar tus ganancias. Un multiplicador x10 gasta 10 veces más energía pero devuelve 10 veces más Lumens y Experiencia. ¡Ideal para subir de nivel rápido!
                </p>
              </section>

              {/* Overfill Info */}
              <section className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-lumora-gold" />
                  <h3 className="text-sm font-bold text-lumora-gold uppercase tracking-wider">Energía Overfill</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cuando compras energía o recibes premios, puedes superar tu límite máximo (Barra Dorada). Mientras estés en Overfill, no regenerarás energía gratis por tiempo. ¡Quémala para volver al ciclo natural!
                </p>
              </section>

              {/* Paytable */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-lumora-gold" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tabla de Pagos (Base)</h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {PAYTABLE.map((item) => (
                    <div key={item.element} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.emoji}</span>
                        <span className="text-xs font-bold text-white">{item.name}</span>
                      </div>
                      <span className="text-xs text-lumora-gold font-black">{item.payout} <span className="text-[10px] text-muted-foreground">Lumens</span></span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
                  *Los valores varían según el multiplicador de colección de tu Santuario.
                </p>
              </section>

              {/* Combos */}
              <section className="bg-lumora-purple/10 rounded-2xl p-4 border border-lumora-purple/20">
                <h3 className="text-sm font-bold text-lumora-purple uppercase tracking-wider mb-2">Combos Elementales</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white font-bold">🔥 + 💧 VAPOR</span>
                    <span className="text-lumora-purple">x1.5 Lumens</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white font-bold">💧 + ⭐ TORMENTA</span>
                    <span className="text-lumora-purple">Giro Gratis</span>
                  </div>
                </div>
              </section>

            </div>

            <Button onClick={onClose} className="w-full mt-6 py-6 rounded-2xl bg-lumora-blue text-white font-bold">
              ¡ENTENDIDO!
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
