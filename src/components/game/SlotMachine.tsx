'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Zap, 
  HelpCircle, 
  RotateCcw, 
  Square, 
  Sparkles, 
  TrendingUp, 
  Timer,
  ChevronRight,
  Trophy,
  Star,
  PartyPopper,
  Lock
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSlotMachine, GridSymbol } from '@/hooks/useSlotMachine';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SymbolIcon } from './SymbolIcon';
import { RaceWidget } from './RaceWidget';
import { BonusGame } from './BonusGame';
import { EnergyRefillDialog } from './EnergyRefillDialog';

// Constants for the spinning animation
const SPIN_STRIP_IDS = [
  ['sym_fire_common', 'sym_water_common', 'sym_nature_common', 'sym_dream_common', 'sym_star_common', 'sym_fire_uncommon'],
  ['sym_nature_common', 'sym_fire_common', 'sym_water_common', 'sym_dream_common', 'sym_water_uncommon', 'sym_nature_uncommon'],
  ['sym_water_common', 'sym_dream_common', 'sym_fire_common', 'sym_star_common', 'sym_fire_rare', 'sym_water_rare'],
  ['sym_dream_common', 'sym_nature_common', 'sym_water_common', 'sym_fire_common', 'sym_nature_rare', 'sym_dream_uncommon'],
  ['sym_star_common', 'sym_fire_common', 'sym_water_common', 'sym_nature_common', 'sym_dream_rare', 'sym_star_uncommon'],
];

const CornerDiamond = ({ flip = false }) => (
  <div className={`w-8 h-8 border-2 border-lumora-gold/40 rotate-45 flex items-center justify-center ${flip ? '-scale-x-100' : ''}`}>
    <div className="w-4 h-4 border border-lumora-gold/20" />
  </div>
);

function useCountUp(target: number, duration: number = 2000, active: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) { setCount(0); return; }
    let start = 0;
    const end = target;
    if (start === end) return;
    let totalMiliseconds = duration;
    let incrementTime = (totalMiliseconds / end) * 10;
    let timer = setInterval(() => {
      start += Math.ceil(end / (duration / 10));
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 10);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return count;
}

export function SlotMachine() {
  const t = useTranslations('spins');
  const tBonus = useTranslations('bonus');
  
  const {
    isSpinning,
    autoSpin,
    setAutoSpin,
    grid,
    result,
    doSpin,
    doNudge,
    toggleHold,
    multiplier,
    setMultiplier,
    availableNudges,
    canHold,
    holdPositions,
    error,
    setError,
    winPositions,
    surgePositions,
    missionPositions,
    reelsStopped,
    showEnergyDialog,
    setShowEnergyDialog,
    showBonusGame,
    setShowBonusGame,
    bonusCount,
    onBonusComplete
  } = useSlotMachine();

  const [showHelp, setShowHelp] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showSpiritReward, setShowSpiritReward] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<any>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [spinCount, setSpinCount] = useState(0);

  const displayedPayout = useCountUp(currentSummary?.totalPayout || 0, 1000, !!currentSummary);

  const collectionMultiplier = useGameStore(s => s.collectionMultiplier);

  // Handle Vibration Helper
  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Handle Spin Result Feedbacks
  useEffect(() => {
    if (result) {
      setSpinCount(prev => prev + 1);
      
      // Calculate summary
      const summary = {
        totalPayout: result.totalPayout,
        isBigWin: result.isBigWin,
        isMegaWin: result.isMegaWin,
        spirits: result.spiritsWon?.map((spirit: any) => {
          // Find how many symbols of this element contributed
          const elementCount = result.grid.flat().filter((s: any) => s.element === spirit.element).length;
          return { ...spirit, combo: elementCount };
        }) || [],
        missionPoints: result.missionHighlights?.points || 0,
        missionElement: result.missionHighlights?.element,
        surges: result.elementalSurges?.map((s: any) => ({
          element: s.element,
          count: s.positions.length,
          bonus: 25 // Simplified
        })) || []
      };

      if (summary.totalPayout > 0 || summary.spirits.length > 0 || summary.missionPoints > 0) {
        if (summary.isMegaWin || summary.isBigWin) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 600);
          audioService.playWin();
          confetti({ 
            particleCount: summary.isMegaWin ? 150 : 80, 
            spread: 70, 
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FF69B4', '#8A2BE2', '#00BFFF']
          });
          vibrate(summary.isMegaWin ? [100, 50, 100, 50, 100] : [100, 50, 100]);
        } else if (summary.totalPayout > 0) {
          audioService.playClick();
          vibrate(50);
        }

        setCurrentSummary(summary);
        
        // Auto-close after 3.5s (increased to allow reading)
        const timer = setTimeout(() => {
          setCurrentSummary(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [result]);

  useEffect(() => {
    // Pause auto-spin if there are interactive features (holds or nudges)
    if (!autoSpin || isSpinning || showBonusGame || canHold || availableNudges > 0) return;
    const timer = setTimeout(() => {
      if (autoSpin) doSpin();
    }, 800);
    return () => clearTimeout(timer);
  }, [autoSpin, isSpinning, doSpin, spinCount, showBonusGame, canHold, availableNudges]);

  const renderCell = (col: number, row: number) => {
    if (!grid) {
      return <div key={`empty-${col}-${row}`} className="w-full h-full rounded-lg slot-cell-altar" />;
    }

    const reelStopped = reelsStopped[col];
    if (reelStopped && grid && grid[col]) {
      const sym = grid[col][row];
      const isWin = winPositions.has(`${col},${row}`);
      const isSurge = surgePositions.has(`${col},${row}`);
      const isMission = missionPositions.has(`${col},${row}`);

      let cellStyle = {};
      let cellClass = "w-full h-full rounded-lg overflow-hidden slot-cell-altar relative transition-all duration-300";

      if (isWin) {
        cellClass += " is-winning scale-105 z-10 shadow-[0_0_20px_rgba(255,215,0,0.4)]";
        cellStyle = {
          border: `3px solid #FFD700`,
          boxShadow: `0 0 25px #FFD700A0, inset 0 0 15px #FFD70080`,
        };
      } else if (isSurge) {
        cellClass += " z-0";
        cellStyle = {
          border: `2px solid ${sym.glowColor}`,
          boxShadow: `inset 0 0 20px ${sym.glowColor}60, 0 0 15px ${sym.glowColor}40`,
        };
      } else if (isMission) {
        cellClass += " animate-pulse z-0";
        cellStyle = {
          border: `2px dashed #FF6B6B`,
          boxShadow: `0 0 12px #FF6B6B70`,
        };
      }

      return (
        <motion.div
          key={`result-${col}-${row}`}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 14 }}
          className={cellClass}
          style={cellStyle}
        >
          <SymbolIcon symbol={sym} isWin={isWin} />
          {isMission && (
            <motion.div 
              className="absolute inset-0 bg-lumora-pink/10 pointer-events-none"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      );
    }

    const stripIds = SPIN_STRIP_IDS[col];
    return (
      <div key={`spin-${col}-${row}`} className="w-full h-full rounded-lg overflow-hidden slot-cell-altar relative">
        <motion.div
          className="flex flex-col absolute w-full"
          style={{ gap: 0, filter: 'blur(3px)' }}
          animate={{ y: [0, -52 * stripIds.length] }}
          transition={{ duration: 0.3 + col * 0.05, repeat: Infinity, ease: 'linear' }}
        >
          {[...stripIds, ...stripIds].map((id, i) => (
            <div key={i} style={{ width: '100%', height: 52, flexShrink: 0 }}>
              <img src={`/assets/symbols/${id}.png`} alt="" className="w-full h-full object-contain" style={{ opacity: 0.65 }} />
            </div>
          ))}
        </motion.div>
      </div>
    );
  };

  const winLabel = result?.isMegaWin ? 'MEGA GANANCIA!' : result?.isBigWin ? 'GRAN GANANCIA!' : t('win');
  const winColor = result?.isMegaWin ? 'text-lumora-gold' : result?.isBigWin ? 'text-lumora-pink' : 'text-lumora-purple';
  const winBorder = result?.isMegaWin ? 'border-lumora-gold/50 animate-lumora-pulse' : result?.isBigWin ? 'border-lumora-pink/40' : 'border-lumora-purple/40';

  return (
    <motion.div className="relative flex flex-col items-center w-full max-w-lg mx-auto pb-4" animate={isShaking ? { x: [-5, 5, -5, 5, 0] } : {}}>
      <div className="w-full mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent font-fantasy">GIRO ONÍRICO</h2>
          <button onClick={() => setShowHelp(true)} className="p-1 rounded-full bg-white/5 border border-white/5"><HelpCircle className="h-4 w-4 text-muted-foreground" /></button>
        </div>
      </div>

      <div className="relative w-full mb-3 scale-[0.95] origin-top">
        <div className="slot-machine-frame-altar p-3 relative bg-cover bg-center rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundImage: 'url(/assets/backgrounds/bg_slot_altar.png)' }}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-0" />
          <div className="relative z-10">
            <div className="rounded-2xl border-4 border-lumora-gold/30 bg-black p-2">
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, col) => (
                  <div key={col} className="flex flex-col gap-1.5 relative">
                    {Array.from({ length: 4 }).map((_, row) => (
                      <div key={`${col}-${row}`} className="aspect-square w-full">
                        {renderCell(col, row)}
                      </div>
                    ))}
                    <div className="flex flex-col gap-1 mt-1 px-1">
                      <button onClick={() => toggleHold(col)} disabled={!canHold || isSpinning} className={`py-1 rounded-md text-[9px] font-black border ${holdPositions[col] ? 'bg-lumora-gold text-black' : 'bg-black/40 text-lumora-gold border-lumora-gold/30'}`}>HOLD</button>
                      <button onClick={() => doNudge(col)} disabled={availableNudges <= 0 || isSpinning} className={`py-1 rounded-md text-[9px] font-black border ${availableNudges > 0 ? 'bg-lumora-blue text-white' : 'bg-black/20 text-white/10'}`}><TrendingUp className="h-3 w-3 rotate-180 mx-auto" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-3 bg-black/40 p-1 rounded-2xl border border-white/5">
        {[1, 3, 5, 10].map((m) => (
          <button key={m} onClick={() => setMultiplier(m)} disabled={isSpinning} className={`px-4 py-1 rounded-xl text-xs font-black transition-all ${multiplier === m ? 'bg-lumora-blue text-white' : 'text-muted-foreground'}`}>x{m}</button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-2">
        <Button onClick={doSpin} disabled={isSpinning} className="rounded-2xl h-14 px-8 bg-gradient-to-r from-lumora-pink to-lumora-gold text-white font-black">GIRAR</Button>
        <Button variant={autoSpin ? 'default' : 'outline'} onClick={() => setAutoSpin(!autoSpin)} disabled={isSpinning && !autoSpin} className="rounded-2xl h-14 w-14 p-0">{autoSpin ? <Square /> : <RotateCcw />}</Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Coste: {5 * multiplier} energía por giro</p>

      <EnergyRefillDialog 
        isOpen={showEnergyDialog} 
        onClose={() => setShowEnergyDialog(false)} 
        onSuccess={() => {}} 
      />

      <SlotMachineHelp 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
      />

      <AnimatePresence>
        {currentSummary && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-auto overflow-hidden"
          >
            {/* Very Subtle Neutral Glow */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 4, opacity: 0.1 }}
              className="absolute w-96 h-96 rounded-full blur-[100px] bg-white/10"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 1.05, y: -10 }} 
              className={`relative w-full max-w-[400px] rounded-[2.5rem] border border-white/20 bg-black/30 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ${
                currentSummary.isMegaWin || currentSummary.isBigWin ? 'border-lumora-gold/40' : ''
              }`}
              style={{ maxHeight: '80vh' }}
            >
              <div className="relative z-10 flex-1 flex flex-col items-center pt-6 px-6 overflow-hidden">
                {/* Praise Text & Header */}
                <div className="flex flex-col items-center text-center space-y-2 mb-5 shrink-0">
                  <span className={`text-[8px] font-black uppercase tracking-[0.4em] drop-shadow-md ${
                    currentSummary.isMegaWin || currentSummary.isBigWin ? 'text-lumora-gold' : 'text-white/60'
                  }`}>
                    {currentSummary.isMegaWin ? '¡GIRO DIVINO!' : currentSummary.isBigWin ? '¡GRAN HALLAZGO!' : '¡BOTÍN OBTENIDO!'}
                  </span>
                  
                  <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <span className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg">
                      +{displayedPayout.toLocaleString()}
                    </span>
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Zap className="h-8 w-8 text-lumora-gold fill-current drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
                    </motion.div>
                  </div>
                </div>

                {/* Rewards Stack - Scrollable Area */}
                <div className="w-full flex-1 overflow-y-auto custom-scrollbar pr-1 pointer-events-auto">
                  <div className="space-y-2 pb-10">
                    <div className={currentSummary.spirits.length > 2 ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                      {currentSummary.spirits.map((spirit: any, idx: number) => (
                        <motion.div 
                          key={`spirit-${idx}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + (idx * 0.05) }}
                          className="flex flex-col gap-2 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black/60 p-1.5 flex items-center justify-center border border-white/10">
                              <SymbolIcon 
                                symbol={{ 
                                  id: spirit.spiritTypeId, 
                                  element: spirit.element, 
                                  rarity: spirit.rarity, 
                                  symbolType: 'spirit', 
                                  glowColor: '#fff', 
                                  name: spirit.name 
                                }} 
                                isWin={true}
                                size={24}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black text-white uppercase truncate tracking-tight">{spirit.name}</span>
                              <span className={`text-[7px] font-bold tracking-[0.2em] uppercase ${
                                spirit.rarity === 'legendary' ? 'text-lumora-gold' :
                                spirit.rarity === 'epic' ? 'text-lumora-purple' : 'text-white/40'
                              }`}>{spirit.rarity}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Secondary Rewards */}
                    <div className="space-y-2">
                      {currentSummary.missionPoints > 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between p-3 px-4 rounded-2xl bg-black/40 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-lumora-pink" />
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">Misión {currentSummary.missionElement}</span>
                          </div>
                          <span className="text-xs font-black text-lumora-pink">+{currentSummary.missionPoints} PTS</span>
                        </motion.div>
                      )}

                      {currentSummary.surges.map((surge: any, idx: number) => (
                        <motion.div 
                          key={`surge-${idx}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between p-3 px-4 rounded-2xl bg-black/40 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <Zap className="h-4 w-4 text-lumora-blue" />
                            <span className="text-[10px] font-black text-white uppercase italic tracking-wider">Oleada x{surge.count}</span>
                          </div>
                          <span className="text-xs font-black text-lumora-blue">+{surge.bonus} ✨</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* New Balance Footer Card */}
              <div className="shrink-0 p-5 bg-black/60 border-t border-white/10 backdrop-blur-md">
                <div className="flex flex-col items-center w-full">
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] mb-3">CRISTALES TOTALES</span>
                  <div className="w-full py-4 rounded-[2rem] bg-black/40 border border-white/20 flex items-center justify-center gap-4 shadow-inner">
                    <span className="text-3xl font-black text-lumora-gold tracking-tighter">
                      {result?.player?.lumens.toLocaleString() || '---'}
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-lumora-gold/20 flex items-center justify-center border border-lumora-gold/30">
                      <Zap className="h-5 w-5 text-lumora-gold fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBonusGame && (
          <BonusGame 
            bonusCount={bonusCount} 
            onComplete={onBonusComplete} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlotMachineHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-lumora-gold uppercase tracking-tighter">Códice de Giro Onírico</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Guía completa de recompensas y mecánica</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 1. ESTRATEGIA */}
            <section className="space-y-3">
              <h4 className="text-xs font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-2">
                <Zap className="h-3 w-3" /> Mecánicas de Estrategia
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <p className="text-xs font-bold text-lumora-gold flex items-center gap-2">
                    <Lock className="h-3 w-3" /> Retenciones
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">Bloquea rodillos si tienes 2+ símbolos épicos o de Bonus para asegurar el premio en el siguiente giro.</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <p className="text-xs font-bold text-lumora-blue flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 rotate-180" /> Avances
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">¿Te quedaste a un paso? Empuja los rodillos hacia abajo para meter símbolos ganadores en pantalla.</p>
                </div>
              </div>
            </section>

            {/* 2. RECOMPENSAS */}
            <section className="space-y-3">
              <h4 className="text-xs font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-2">
                <Star className="h-3 w-3" /> Tipos de Recompensas
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-lumora-blue/10 to-transparent border border-lumora-blue/20 flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-lumora-blue/20 flex items-center justify-center shrink-0 border border-lumora-blue/30">
                    <Sparkles className="h-5 w-5 text-lumora-blue" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Captura de Espíritus</p>
                    <p className="text-[9px] text-muted-foreground">Consigue 3+ símbolos de un elemento para capturar su espíritu. ¡Cuanto mayor sea el premio del giro, más rara será la captura!</p>
                  </div>
                </div>
                
                <div className="p-3 rounded-2xl bg-gradient-to-br from-lumora-pink/10 to-transparent border border-lumora-pink/20 flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-lumora-pink/20 flex items-center justify-center shrink-0 border border-lumora-pink/30">
                    <Trophy className="h-5 w-5 text-lumora-pink" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Progreso de Carrera</p>
                    <p className="text-[9px] text-muted-foreground">Los símbolos de misión otorgan puntos directos para el ranking mundial. ¡Escala posiciones y gana premios exclusivos!</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-lumora-gold/10 to-transparent border border-lumora-gold/20 flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-lumora-gold/20 flex items-center justify-center shrink-0 border border-lumora-gold/30">
                    <Zap className="h-5 w-5 text-lumora-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Oleadas Elementales</p>
                    <p className="text-[9px] text-muted-foreground">Acumula muchos símbolos del mismo elemento en pantalla (sin necesidad de línea) para liberar una explosión de Lumens.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. MULTIPLICADORES */}
            <section className="space-y-3">
              <h4 className="text-xs font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-1">Potenciadores</h4>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-xs">W</div>
                  <p className="text-[10px] font-bold text-white uppercase">Multiplicador Wild</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">1x</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-lumora-blue/20 border border-lumora-blue/30 text-lumora-blue">2x</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-lumora-pink/20 border border-lumora-pink/30 text-lumora-pink">3x</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-lumora-gold/20 border border-lumora-gold/30 text-lumora-gold">5x</span>
                </div>
              </div>
            </section>

            {/* 4. RAREZAS */}
            <section className="space-y-2">
              <h4 className="text-xs font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-1">Tabla de Rarezas</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'LEGENDARIO', val: '500-1000x', color: 'text-lumora-gold' },
                  { label: 'ÉPICO', val: '100-250x', color: 'text-lumora-purple' },
                  { label: 'RARO', val: '25-50x', color: 'text-lumora-blue' },
                  { label: 'COMÚN', val: '5-10x', color: 'text-white' },
                ].map((r) => (
                  <div key={r.label} className="p-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center">
                    <span className={`text-[9px] font-black ${r.color}`}>{r.label}</span>
                    <span className="text-[8px] text-white/40">{r.val}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="text-center space-y-2">
              <p className="text-[10px] text-muted-foreground italic leading-relaxed">"Cada giro es una oportunidad para evolucionar tu santuario. El destino de Lumora está en tus manos."</p>
              <div className="text-[8px] text-white/20 uppercase tracking-[0.3em]">Versión del Motor: 2.5.0</div>
            </section>
          </div>

          <Button onClick={onClose} className="w-full h-14 rounded-3xl bg-gradient-to-r from-lumora-blue to-lumora-purple text-white font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
            ¡ACEPTO EL DESAFÍO!
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
