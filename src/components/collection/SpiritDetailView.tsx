'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Zap, 
  TrendingUp, 
  ChevronRight,
  Shield,
  Star,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SymbolIcon } from '@/components/game/SymbolIcon';
import { ELEMENT_EMOJIS, ELEMENT_COLORS } from '@/game/engine/symbols';
import { Button } from '@/components/ui/button';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SpiritDetailViewProps {
  spirit: any;
  onClose: () => void;
  isPreview?: boolean;
  nextSpirit?: any;
}

export function SpiritDetailView({ spirit: spiritOrGroup, onClose, isPreview, nextSpirit }: SpiritDetailViewProps) {
  const router = useRouter();
  const isGroup = !!spiritOrGroup.instances;
  const group = isGroup ? spiritOrGroup : null;
  
  const [activeSpirit, setActiveSpirit] = useState(isGroup ? spiritOrGroup.representative : spiritOrGroup);
  const [showPreview, setShowPreview] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<any>(null);

  const raritySuccessRates: Record<string, number> = {
    common: 0.95,
    uncommon: 0.85,
    rare: 0.65,
    epic: 0.40,
    legendary: 0.20
  };

  const successRate = raritySuccessRates[activeSpirit.spiritType.rarity] || 0.5;

  const handleMerge = async () => {
    if (!isGroup || group.instances.length < 3) return;
    
    setIsMerging(true);
    try {
      const materialIds = group.instances
        .filter((i: any) => i.id !== activeSpirit.id)
        .sort((a: any, b: any) => a.level - b.level)
        .slice(0, 2)
        .map((i: any) => i.id);

      const res = await fetch('/api/spirits/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderId: activeSpirit.id, materialIds })
      });

      if (!res.ok) throw new Error('Error en la fusión');
      const data = await res.json();
      
      setMergeResult(data);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('La conexión con el altar ha fallado');
    } finally {
      setIsMerging(false);
    }
  };

  const spirit = activeSpirit;

  const rarityColors: Record<string, string> = {
    common: '#94a3b8',
    uncommon: '#10b981',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#eab308'
  };

  const color = rarityColors[spirit.spiritType.rarity] || '#fff';
  const POWER_MAP: Record<string, number> = {
    common: 10,
    uncommon: 25,
    rare: 60,
    epic: 150,
    legendary: 400
  };

  const basePower = POWER_MAP[spirit.spiritType.rarity] || 0;
  const levelBonus = (spirit.level - 1) * 0.1;
  const totalPower = Math.floor(basePower * (1 + levelBonus));
  const multiplierBonus = totalPower / 10000;

  const XP_BASE: Record<string, number> = {
    common: 50,
    uncommon: 100,
    rare: 250,
    epic: 600,
    legendary: 1500
  };

  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const currentRarity = spirit.spiritType.rarity;
  const currentIndex = rarityOrder.indexOf(currentRarity);

  const xpBaseForLevel = XP_BASE[currentRarity] || 50;
  const expNeeded = spirit.level * xpBaseForLevel;
  const expProgress = (spirit.experience / expNeeded) * 100;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-x-0 bottom-0 z-[60] bg-background/95 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] shadow-2xl p-6 pb-10 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
    >
      <AnimatePresence mode="wait">
        {mergeResult ? (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 gap-6"
          >
             <div className={`w-24 h-24 rounded-full flex items-center justify-center ${mergeResult.success ? 'bg-lumora-emerald/20 border-2 border-lumora-emerald shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-red-500/20 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`}>
                {mergeResult.success ? <Sparkles className="h-12 w-12 text-lumora-emerald animate-bounce" /> : <X className="h-12 w-12 text-red-500" />}
             </div>
             
             <div className="text-center space-y-2">
                <h2 className={`text-3xl font-black uppercase tracking-tighter ${mergeResult.success ? 'text-lumora-emerald' : 'text-red-500'}`}>
                  {mergeResult.success ? '¡Fusión Exitosa!' : '¡Fusión Fallida!'}
                </h2>
                <p className="text-sm text-muted-foreground px-10">
                  {mergeResult.success 
                    ? `Tu espíritu ha absorbido la esencia de los materiales y ahora es más fuerte. ${mergeResult.evolved ? '¡HA EVOLUCIONADO!' : ''}`
                    : 'La inestabilidad del altar ha consumido los materiales. El líder ha sobrevivido pero ha perdido parte de su experiencia.'}
                </p>
             </div>

             <div className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center gap-4">
                <div className="w-20 h-20">
                   <SymbolIcon symbol={{...mergeResult.spirit.spiritType, symbolType: 'spirit'} as any} />
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-lg font-bold text-white uppercase">{mergeResult.spirit.spiritType.name}</span>
                   <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-lumora-gold">NV. {mergeResult.spirit.level}</span>
                      <span className="text-xs text-muted-foreground">{mergeResult.spirit.experience} XP</span>
                   </div>
                </div>
             </div>

             <Button 
               onClick={() => {
                 setMergeResult(null);
                 onClose();
                 router.refresh();
               }}
               className="w-full py-6 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all"
             >
               Aceptar y Continuar
             </Button>
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xl">{ELEMENT_EMOJIS[spirit.spiritType.element as keyof typeof ELEMENT_EMOJIS]}</span>
                </div>
                <div>
                  <h3 className="text-xl font-fantasy font-bold text-white capitalize">
                    {spirit.spiritType.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-white/10" style={{ color }}>
                      {spirit.spiritType.rarity.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">NIVEL {spirit.level}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Main Display */}
            <div className="grid grid-cols-1 gap-4">
              {isPreview && nextSpirit ? (
                <div className="flex items-center justify-between p-4 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden">
                   <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-20 h-20">
                        <SymbolIcon symbol={{...spirit.spiritType, symbolType: 'spirit'} as any} />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{spirit.spiritType.name}</span>
                   </div>
                   <ChevronRight className="h-6 w-6 text-lumora-purple animate-pulse" />
                   <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-24 h-24">
                        <SymbolIcon symbol={{...nextSpirit, symbolType: 'spirit'} as any} />
                      </div>
                      <span className="text-[10px] font-bold text-lumora-gold uppercase">{nextSpirit.name}</span>
                   </div>
                </div>
              ) : (
                <div className="flex justify-center py-6 relative">
                  <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle, ${color}30 0%, transparent 70%)` }} />
                  <SymbolIcon 
                    symbol={{ ...spirit.spiritType, symbolType: 'spirit' } as any} 
                    size="xl" 
                  />
                </div>
              )}

              {/* Stats Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-widest">Experiencia</span>
                  <span>{spirit.experience} / {expNeeded} XP</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, expProgress)}%` }}
                  />
                </div>
              </div>

              {/* Secondary Grid */}
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center gap-2 text-lumora-blue">
                      <Zap className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Colección</span>
                    </div>
                    <span className="text-xl font-bold font-title">{totalPower}</span>
                 </div>
                 <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center gap-2 text-lumora-purple">
                      <Shield className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Defensa</span>
                    </div>
                    <span className="text-xl font-bold font-title">+{Math.floor(totalPower / 10)}%</span>
                 </div>
                 <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center gap-2 text-lumora-gold">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Multiplicador</span>
                    </div>
                    <span className="text-xl font-bold font-title">x{multiplierBonus.toFixed(4)}</span>
                 </div>
                 <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center gap-2 text-lumora-emerald">
                      <Star className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Producción</span>
                    </div>
                    <span className="text-xl font-bold font-title">{spirit.spiritType.lumensPerHour} L/h</span>
                 </div>
              </div>
            </div>

            {/* Fusion Section */}
            {!isPreview && isGroup && group.instances.length >= 3 && (
              <div className="mt-4">
                <div className="flex items-center justify-between px-2 mb-3">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tus Unidades ({group.count})</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
                   {group.instances.slice(0, 50).map((inst: any) => (
                      <button 
                        key={inst.id}
                        onClick={() => setActiveSpirit(inst)}
                        className={`flex-shrink-0 w-12 h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${inst.id === activeSpirit.id ? 'border-lumora-gold bg-lumora-gold/20' : 'border-white/10 bg-white/5'}`}
                      >
                         <span className="text-[10px] font-black">L{inst.level}</span>
                         <div className="w-full h-1 mt-1 bg-black/40 rounded-full overflow-hidden px-0.5">
                            <div className="h-full bg-lumora-blue" style={{ width: `${Math.min(100, (inst.experience / (inst.level * xpBaseForLevel)) * 100)}%` }} />
                         </div>
                      </button>
                   ))}
                </div>

                <div className="p-6 rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden group/fusion">
                  <AnimatePresence mode="wait">
                    {!showPreview ? (
                      <motion.div key="fusion-init">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="h-4 w-4 text-lumora-gold" />
                          <span className="text-xs font-black uppercase text-white">Altar de Evolución</span>
                        </div>
                        <button 
                          onClick={() => setShowPreview(true)}
                          className="w-full py-4 rounded-2xl bg-lumora-gold text-black font-black text-xs uppercase"
                        >
                          Previsualizar Fusión
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="fusion-preview" className="space-y-6">
                        <div className="flex items-center justify-between">
                           <button onClick={() => setShowPreview(false)} className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                             <X className="h-3 w-3" /> CANCELAR
                           </button>
                           <div className="text-right">
                              <div className="text-[10px] font-bold text-muted-foreground">PROBABILIDAD</div>
                              <div className={`text-xs font-black ${successRate > 0.7 ? 'text-lumora-emerald' : successRate > 0.4 ? 'text-lumora-gold' : 'text-red-500'}`}>
                                {(successRate * 100).toFixed(0)}% ÉXITO
                              </div>
                           </div>
                        </div>

                        {/* Projection Stats Table */}
                        <div className="bg-black/40 rounded-2xl border border-white/5 p-4 space-y-3">
                           <div className="flex items-center justify-between text-[10px] font-bold border-b border-white/5 pb-2">
                              <span className="text-muted-foreground">ATRIBUTO</span>
                              <div className="flex gap-8">
                                 <span className="text-muted-foreground">ACTUAL</span>
                                 <span className="text-lumora-gold">NUEVO</span>
                              </div>
                           </div>
                           
                           <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-lumora-blue">
                                 <Zap className="h-3 w-3" />
                                 <span>Poder</span>
                              </div>
                              <div className="flex gap-10 font-bold">
                                 <span className="opacity-50">{totalPower}</span>
                                 <span className="text-lumora-emerald">+{POWER_MAP[currentIndex < rarityOrder.length - 1 ? rarityOrder[currentIndex+1] : currentRarity] || '???'}</span>
                              </div>
                           </div>

                           <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-lumora-emerald">
                                 <Star className="h-3 w-3" />
                                 <span>Producción</span>
                              </div>
                              <div className="flex gap-10 font-bold">
                                 <span className="opacity-50">{spirit.spiritType.lumensPerHour}</span>
                                 <span className="text-lumora-emerald">+{Math.floor(spirit.spiritType.lumensPerHour * 2.5)}</span>
                              </div>
                           </div>

                           <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-lumora-purple">
                                 <Shield className="h-4 w-4" />
                                 <span>Defensa</span>
                              </div>
                              <div className="flex gap-10 font-bold">
                                 <span className="opacity-50">+{Math.floor(totalPower/10)}%</span>
                                 <span className="text-lumora-emerald">+{Math.floor((POWER_MAP[currentIndex < rarityOrder.length - 1 ? rarityOrder[currentIndex+1] : currentRarity] || 0) / 10)}%</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 py-8 relative">
                           {/* Current Spirit */}
                           <div className="flex flex-col items-center gap-3">
                              <div className="relative w-24 h-24 flex items-center justify-center rounded-[2.5rem] border-2 bg-black overflow-hidden" 
                                   style={{ borderColor: color + '40' }}>
                                 <div className="w-[125%] h-[125%] flex-shrink-0 flex items-center justify-center">
                                    <SymbolIcon symbol={{...spirit.spiritType, symbolType: 'spirit'} as any} />
                                 </div>
                                 <div className="absolute top-2 right-2 w-6 h-6 bg-black/80 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center z-20">
                                    <span className="text-[10px] font-black">L{activeSpirit.level}</span>
                                 </div>
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Actual</span>
                           </div>

                           <div className="flex items-center justify-center opacity-30">
                              <ChevronRight className="h-6 w-6" />
                           </div>

                           {/* Target Spirit */}
                           <div className="flex flex-col items-center gap-3">
                              <div className="relative w-24 h-24 flex items-center justify-center rounded-[2.5rem] border-2 bg-black overflow-hidden transition-shadow duration-500"
                                   style={{ 
                                     borderColor: currentIndex < rarityOrder.length - 1 ? rarityColors[rarityOrder[currentIndex+1]] : color,
                                     boxShadow: `0 0 40px -15px ${currentIndex < rarityOrder.length - 1 ? rarityColors[rarityOrder[currentIndex+1]] : color}`
                                   }}>
                                 <div className="w-[125%] h-[125%] flex-shrink-0 flex items-center justify-center">
                                    <SymbolIcon symbol={{...spirit.spiritType, symbolType: 'spirit'} as any} />
                                 </div>
                                 <div className="absolute top-2 right-2 w-6 h-6 bg-black/80 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center z-20">
                                    <span className="text-[10px] font-black text-lumora-gold">L1</span>
                                 </div>
                                 <motion.div 
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -top-1 -right-1"
                                 >
                                    <Sparkles className="h-7 w-7" style={{ color: currentIndex < rarityOrder.length - 1 ? rarityColors[rarityOrder[currentIndex+1]] : color }} />
                                 </motion.div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: currentIndex < rarityOrder.length - 1 ? rarityColors[rarityOrder[currentIndex+1]] : color }}>
                                 Evolución
                              </span>
                           </div>
                        </div>

                        <button 
                          onClick={handleMerge}
                          disabled={isMerging}
                          className="w-full py-4 rounded-2xl bg-gradient-to-r from-lumora-purple to-lumora-pink text-white font-black text-xs hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isMerging ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              FUSIONANDO...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5" />
                              CONFIRMAR FUSIÓN
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
            
            <p className="text-center text-[10px] text-muted-foreground px-6 py-4 opacity-50">
              Usa tus espíritus en giros y desafíos para ganar experiencia y desbloquear su verdadero poder.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
