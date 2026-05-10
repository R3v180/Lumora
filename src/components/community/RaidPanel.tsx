'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, Target, Coins, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';
import { EnergyRefillDialog } from '@/components/game/EnergyRefillDialog';
import { CombatResultModal } from '@/components/game/CombatResultModal';
import { SquadManagerModal } from '@/components/game/SquadManagerModal';
import { Zap, Play, Square, HelpCircle, X } from 'lucide-react';
import { PlayerAvatar } from '@/components/progression/PlayerAvatar';

interface RaidTarget {
  id: string;
  displayName: string;
  level: number;
  avatar?: string;
  sanctuaryName: string;
  idleLumens: number;
  stealable: number;
  isShielded?: boolean;
  defenseElements?: string[];
  power?: number;
}

export function RaidPanel() {
  const t = useTranslations('raid');
  const [targets, setTargets] = useState<RaidTarget[]>([]);
  const [myShield, setMyShield] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [raidingId, setRaidingId] = useState<string | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showEnergyRefill, setShowEnergyRefill] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [sessionLoot, setSessionLoot] = useState(0);
  const [spinResults, setSpinResults] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  // Mini-game states
  const [precisionMode, setPrecisionMode] = useState(false);
  const [precisionPos, setPrecisionPos] = useState(0);
  const [precisionDir, setPrecisionDir] = useState(1);
  const [precisionFactor, setPrecisionFactor] = useState(1.0);
  const precisionTimerRef = useRef<any>(null);

  const energy = useGameStore(s => s.energy);
  const maxEnergy = useGameStore(s => s.maxEnergy);
  const level = useGameStore(s => s.level);
  
  const [playerRating, setPlayerRating] = useState(1000);
  const [playerSpirits, setPlayerSpirits] = useState<any[]>([]);
  const [arenaDefenseIds, setArenaDefenseIds] = useState<string[]>([]);

  const RAID_COST = 20;

  const getMyPower = useCallback(() => {
    if (playerSpirits.length === 0) return 0;
    const RARITY_MULTIPLIERS: any = { legendary: 1.6, epic: 1.3, rare: 1.15, common: 1.0 };
    const selectedObjects = arenaDefenseIds.map(id => playerSpirits.find(x => x.id === id)).filter(Boolean);
    const baseSum = selectedObjects.reduce((acc, s) => acc + (s?.power || 0), 0);
    const rarityBonus = Math.round(selectedObjects.reduce((acc, s) => {
      const mult = RARITY_MULTIPLIERS[s!.rarity] || 1.0;
      return acc + (s!.power * mult - s!.power);
    }, 0));
    
    const elements = selectedObjects.map(s => s!.element);
    const counts: any = {};
    elements.forEach(e => counts[e] = (counts[e] || 0) + 1);
    const maxCount = Math.max(...Object.values(counts) as number[], 0);
    const bonus = maxCount === 3 ? 0.25 : maxCount === 2 ? 0.10 : 0.05;

    return Math.round((baseSum + rarityBonus) * (1 + bonus));
  }, [playerSpirits, arenaDefenseIds]);

  const calculateElementalAdvantage = useCallback((targetElements: string[]) => {
    if (!targetElements || targetElements.length === 0) return 0;
    const ELEMENT_ADVANTAGE: Record<string, string> = {
      fire: 'nature', nature: 'water', water: 'fire', dream: 'star', star: 'dream',
    };
    
    const myElements = arenaDefenseIds.map(id => playerSpirits.find(x => x.id === id)?.element).filter(Boolean);
    if (myElements.length === 0) return 0;

    let advantageScore = 0;
    for (let i = 0; i < 3; i++) {
      const myEl = myElements[i];
      const theirEl = targetElements[i];
      if (myEl && theirEl) {
        if (ELEMENT_ADVANTAGE[myEl] === theirEl) advantageScore++;
        else if (ELEMENT_ADVANTAGE[theirEl] === myEl) advantageScore--;
      }
    }
    return advantageScore;
  }, [playerSpirits, arenaDefenseIds]);

  const myPower = getMyPower();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRaids = useCallback(async () => {
    try {
      const res = await fetch('/api/raid');
      if (res.ok) {
        const data = await res.json();
        const enhancedTargets = data.targets.map((t: any) => ({
          ...t,
          power: t.power || Math.round(t.level * 45 + Math.random() * 100)
        }));
        setTargets(enhancedTargets);
        setMyShield(data.myShield);
      }

      const arenaRes = await fetch('/api/arena');
      if (arenaRes.ok) {
        const arenaData = await arenaRes.json();
        setPlayerRating(arenaData.rating);
        setPlayerSpirits(arenaData.spirits);
        setArenaDefenseIds(arenaData.defenseIds || []);
      }
    } catch (err) {
      console.error('Failed to fetch raid/arena data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/raid/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Nuevos objetivos localizados');
        useGameStore.getState().syncPlayerStats({
          lumens: data.newLumens,
          energy: useGameStore.getState().energy,
          maxEnergy: useGameStore.getState().maxEnergy,
        });
        fetchRaids();
      } else {
        toast.error(data.error || 'Error al explorar');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRaids();
  }, [fetchRaids]);

  useEffect(() => {
    if (precisionMode) {
      const step = () => {
        setPrecisionPos(prev => {
          let next = prev + 4 * precisionDir;
          if (next >= 100) { setPrecisionDir(-1); next = 100; }
          if (next <= 0) { setPrecisionDir(1); next = 0; }
          return next;
        });
        precisionTimerRef.current = requestAnimationFrame(step);
      };
      precisionTimerRef.current = requestAnimationFrame(step);
    } else {
      if (precisionTimerRef.current) cancelAnimationFrame(precisionTimerRef.current);
    }
    return () => { if (precisionTimerRef.current) cancelAnimationFrame(precisionTimerRef.current); };
  }, [precisionMode, precisionDir]);

  const startRaidCombat = async (targetId: string, precision: number) => {
    setRaidingId(targetId);
    setPrecisionMode(false);
    setIsSpinning(true);
    setSpinResults([]);
    audioService.playSpinStart();

    try {
      const res = await fetch('/api/raid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, precision }),
      });
      const data = await res.json();
      
      setTimeout(() => {
        setIsSpinning(false);
        const elements = ['fire', 'water', 'nature', 'dream', 'star'];
        setSpinResults([
          elements[Math.floor(Math.random() * 5)],
          elements[Math.floor(Math.random() * 5)],
          elements[Math.floor(Math.random() * 5)]
        ]);

        if (res.ok) {
          const isSuccess = data.success !== false;
          setLastResult({ ...data, success: isSuccess, targetName: targets.find(t => t.id === targetId)?.displayName, precision });
          if (isSuccess) {
            audioService.playCollect();
            setSessionLoot(prev => prev + data.lumensStolen);
          } else {
            audioService.playError();
          }
          useGameStore.getState().syncPlayerStats({
            lumens: data.newLumens || useGameStore.getState().lumens,
            energy: data.newEnergy,
            maxEnergy: useGameStore.getState().maxEnergy,
          });
          setShowResultModal(true);
          setMyShield(data.shieldUntil);
          fetchRaids();
        } else {
          audioService.playError();
          if (data.error === 'Energía insuficiente') {
            setShowEnergyRefill(true);
          } else {
            toast.error(data.error);
          }
        }
        setRaidingId(null);
      }, 2000);
    } catch (err) {
      toast.error('Error de conexión');
      setRaidingId(null);
      setIsSpinning(false);
    }
  };

  const handleRaidRequest = (targetId: string) => {
    if (energy < RAID_COST) {
      setShowEnergyRefill(true);
      return;
    }
    setRaidingId(targetId);
    setPrecisionMode(true);
    setPrecisionPos(0);
    setPrecisionDir(1);
    audioService.playClick();
  };

  const stopPrecision = () => {
    const pos = precisionPos;
    let factor = 0.5;
    if (pos >= 40 && pos <= 60) factor = 1.0;
    else if ((pos >= 20 && pos < 40) || (pos > 60 && pos <= 80)) factor = 0.75;
    
    setPrecisionFactor(factor);
    if (raidingId) startRaidCombat(raidingId, factor);
  };

  const [showSquadModal, setShowSquadModal] = useState(false);

  const handleSaveSquad = async (newIds: string[]) => {
    const res = await fetch('/api/arena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setDefense', spiritIds: newIds }),
    });
    if (res.ok) {
      setArenaDefenseIds(newIds);
      toast.success('Escuadrón actualizado');
    } else {
      throw new Error('Failed to save');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Target className="h-8 w-8 text-lumora-pink/40" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10">
        {/* Header - Tactical Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Saqueos</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-lumora-gold font-black uppercase tracking-widest">Rating: {playerRating}</span>
              <span className="text-[10px] text-white/40 font-black">•</span>
              <span className="text-[10px] text-lumora-blue font-black uppercase tracking-widest">Poder: {myPower}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowHelpDialog(true)} 
            className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Tactical Grid Controls */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => handleRefresh()}
            disabled={isRefreshing}
            className="col-span-2 h-14 rounded-2xl gap-2 font-black text-xs bg-lumora-gold text-black hover:bg-lumora-gold/80 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
          >
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>{isRefreshing ? "ESCANEANDO..." : "EXPLORAR"}</span>
              </div>
              {!isRefreshing && <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">Costo: 500 Lumens</span>}
            </div>
          </Button>

          <div className="flex items-center justify-center gap-2 bg-lumora-gold/10 border border-lumora-gold/20 h-12 rounded-2xl">
            <Coins className="h-4 w-4 text-lumora-gold" />
            <span className="text-xs font-black text-lumora-gold">+{sessionLoot.toLocaleString()}</span>
          </div>
          
          <div className={`flex items-center justify-center gap-2 h-12 rounded-2xl border backdrop-blur-xl ${energy < RAID_COST ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-lumora-blue/10 border-lumora-blue/30 text-lumora-blue'}`}>
            <Zap className={`h-4 w-4 ${energy < RAID_COST ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-black">{energy} / {maxEnergy}</span>
          </div>
        </div>

        {/* Precision Bar Mini-game */}
        {precisionMode && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border-2 border-white/10 bg-black/80 backdrop-blur-3xl p-5 md:p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center gap-4">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Sincronización de Infiltración</p>
              
              <div className="w-full h-6 bg-white/5 rounded-full relative overflow-hidden border border-white/10">
                {/* Zones */}
                <div className="absolute inset-y-0 left-0 w-[20%] bg-red-500/20" />
                <div className="absolute inset-y-0 left-[20%] w-[20%] bg-yellow-500/20" />
                <div className="absolute inset-y-0 left-[40%] w-[20%] bg-green-500/40 blur-sm" />
                <div className="absolute inset-y-0 left-[40%] w-[20%] bg-green-500/60" />
                <div className="absolute inset-y-0 left-[60%] w-[20%] bg-yellow-500/20" />
                <div className="absolute inset-y-0 left-[80%] w-[20%] bg-red-500/20" />
                
                {/* Marker */}
                <motion.div 
                  className="absolute inset-y-0 w-1.5 bg-white shadow-[0_0_15px_white] z-10"
                  style={{ left: `${precisionPos}%` }}
                />
              </div>
              
              <div className="flex justify-between w-full px-2">
                <span className="text-[8px] font-black text-red-500 uppercase">Fallo</span>
                <span className="text-[8px] font-black text-green-500 uppercase">Perfecto</span>
                <span className="text-[8px] font-black text-red-500 uppercase">Fallo</span>
              </div>

              <Button onClick={stopPrecision} className="w-full h-12 rounded-2xl bg-white text-black font-black uppercase tracking-tighter shadow-xl hover:scale-95 transition-transform">
                ¡DETENER!
              </Button>
            </div>
          </motion.div>
        )}

        {/* Infiltration Minigame (Visible when raiding) */}
        {raidingId && !precisionMode && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border-2 border-lumora-pink/40 bg-black/80 backdrop-blur-3xl p-6 shadow-[0_0_50px_rgba(236,72,153,0.2)]"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-black text-lumora-pink uppercase tracking-[0.3em] animate-pulse">Desencriptando...</p>
                {precisionFactor === 1.0 && <span className="text-[10px] text-green-500 font-black">¡PERFECTO x1.0!</span>}
                {precisionFactor === 0.75 && <span className="text-[10px] text-yellow-500 font-black">¡BUENO x0.75!</span>}
                {precisionFactor === 0.5 && <span className="text-[10px] text-red-500 font-black">DÉBIL x0.5</span>}
              </div>
              <div className="flex gap-2 md:gap-3 h-20 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.div 
                    key={i}
                    animate={isSpinning ? { y: [0, -20, 20, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 0.2, delay: i * 0.1 }}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden"
                  >
                    {spinResults[i] ? (
                      <img src={`/assets/symbols/sym_${spinResults[i]}_common.png`} className="w-10 h-10" />
                    ) : <Sparkles className="h-6 w-6 text-white/10" />}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats and Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-4 bg-black/40 p-4 rounded-3xl border border-white/10">
            <div className="p-3 rounded-2xl bg-lumora-gold/20 border border-lumora-gold/40">
              <Zap className="h-6 w-6 text-lumora-gold" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Poder de Asalto</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{myPower.toLocaleString()}</span>
                <Button 
                  onClick={() => setShowSquadModal(true)}
                  size="sm" 
                  className="h-6 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-black text-lumora-gold uppercase flex items-center gap-1"
                >
                  <Users className="h-3 w-3" />
                  Gestionar
                </Button>
              </div>
            </div>
          </div>

          {/* Shield Status */}
          {myShield && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[2rem] border border-lumora-blue/40 bg-lumora-blue/10 backdrop-blur-xl p-5 flex items-center gap-4 shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-lumora-blue/20 flex items-center justify-center border border-lumora-blue/40">
                <ShieldCheck className="h-6 w-6 text-lumora-blue" />
              </div>
              <div>
                <p className="text-sm font-black text-lumora-blue uppercase tracking-tight">{t('shielded')}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                  {t('shieldActive', { time: new Date(myShield).toLocaleTimeString() })}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Targets Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-lumora-pink" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t('raidTargets')}</span>
            </div>
          </div>

          <div className="grid gap-3">
            {targets.map((target, idx) => {
              const diff = myPower - (target.power || 0);
              const isEasy = diff > 200;
              const isHard = diff < -200;
              
              const advScore = calculateElementalAdvantage(target.defenseElements || []);

              return (
                <motion.div
                  key={target.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl p-4 md:p-5 hover:border-white/20 transition-all shadow-xl"
                >
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <PlayerAvatar 
                        avatarId={target.avatar} 
                        displayName={target.displayName} 
                        size="md"
                        className="group-hover:scale-110 transition-transform border-white/10"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-black text-white uppercase tracking-tight truncate w-full mb-1">{target.displayName}</span>
                        
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-black text-white/40 uppercase shrink-0">NV.{target.level}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border shrink-0 ${isEasy ? 'bg-green-500/10 border-green-500/40 text-green-500' : isHard ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-white/5 border-white/10 text-white/40'}`}>
                            {isEasy ? 'DÉBIL' : isHard ? 'ÉLITE' : 'NORMAL'}
                          </span>
                          {advScore !== 0 && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border shrink-0 flex items-center gap-1 ${advScore > 0 ? 'bg-lumora-gold/10 border-lumora-gold/40 text-lumora-gold' : 'bg-red-500/10 border-red-500/40 text-red-500'}`}>
                              {advScore > 0 ? `VENTAJA +${advScore}` : `DESVENTAJA ${advScore}`}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <Shield className={`h-3 w-3 ${target.isShielded ? 'text-lumora-gold animate-pulse' : isEasy ? 'text-green-500' : isHard ? 'text-red-500' : 'text-lumora-blue'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${target.isShielded ? 'text-lumora-gold' : 'text-white/40'}`}>
                            {target.isShielded ? 'ESCUDO ACTIVO (Requiere Verde)' : isEasy ? 'Defensas Vulnerables' : isHard ? 'Protección Máxima' : 'Sistemas Activos'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 shrink-0">
                            <Coins className="h-3 w-3 text-lumora-gold" />
                            <span className="text-[10px] font-black text-lumora-gold">+{target.stealable}</span>
                          </div>
                          <div className="w-16 md:w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full transition-all duration-1000 ${isEasy ? 'bg-green-500' : isHard ? 'bg-red-500' : 'bg-lumora-blue'}`} 
                              style={{ width: `${Math.min(100, ((target.power || 0) / (myPower || 1)) * 100)}%` }} 
                            />
                          </div>
                          <span className="text-[8px] font-black text-white/20 uppercase shrink-0">{ target.power } ⚔</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleRaidRequest(target.id)}
                      disabled={!!raidingId}
                      className={`w-full sm:w-auto rounded-2xl hover:scale-105 transition-all text-white font-black text-[10px] h-10 px-6 shadow-lg ${isEasy ? 'bg-green-600' : isHard ? 'bg-red-600' : 'bg-lumora-pink'}`}
                    >
                      {raidingId === target.id ? "ASALTANDO" : "SAQUEAR"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Updated Help Dialog */}
        {showHelpDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-[#0a0a0c] border border-white/10 p-6 md:p-8 rounded-[3rem] max-w-sm w-full shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lumora-pink to-transparent opacity-50" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-lumora-pink/20 flex items-center justify-center border border-lumora-pink/40">
                  <Target className="h-6 w-6 text-lumora-pink" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-white uppercase italic tracking-tighter">Manual de Infiltración</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Estrategia y Precisión</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-lumora-blue">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Barra de Precisión</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Al asaltar, detén el puntero en la zona correcta:
                    <br/><span className="text-green-500">• Verde</span>: Éxito Total (100% Daño).
                    <br/><span className="text-yellow-500">• Amarillo</span>: Impacto Medio (75% Daño).
                    <br/><span className="text-red-500">• Rojo</span>: Impacto Débil (50% Daño).
                  </p>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-lumora-gold">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Poder de Guardia y Elementos</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Tu poder de asalto depende de tu **Guardia de la Arena**. ¡Mantén a tus mejores espíritus defendiendo!
                    <br/><br/>
                    <span className="text-lumora-gold font-bold">Ventaja Elemental:</span> Compara tu formación 1 a 1 con la del objetivo. Cada victoria elemental suma **+15% de poder**.
                  </p>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2 text-lumora-pink">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Escudos y Perforación</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Los objetivos con escudo dorado solo pueden ser saqueados con un **Impacto Perfecto (Verde)**.
                    <br/><br/>
                    El botín de perforación es del **40%**, pero permite ignorar la protección del rival.
                  </p>
                </section>
              </div>

              <Button onClick={() => setShowHelpDialog(false)} className="w-full mt-8 h-14 rounded-3xl bg-lumora-pink text-white font-black text-lg shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                ¡ENTENDIDO!
              </Button>
            </motion.div>
          </div>
        )}

        <CombatResultModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          type={lastResult?.success ? 'victory' : 'defeat'}
          title={lastResult?.success ? '¡SAQUEO EXITOSO!' : 'INCURSIÓN FALLIDA'}
          subtitle={lastResult?.success ? `Has asaltado el santuario de ${lastResult.targetName}` : (lastResult?.error || 'El escudo enemigo ha repelido tu ataque')}
          rewards={lastResult?.success ? [
            { type: 'lumens', amount: lastResult.lumensStolen || 0 },
            { type: 'exp', amount: 15 },
            ...(lastResult.droppedChest ? [{ 
              type: 'chest' as const, 
              amount: 1, 
              rarity: lastResult.droppedChest.rarity 
            }] : [])
          ] : []}
          stats={[
            { label: 'PRECISIÓN', value: lastResult?.precision === 1.0 ? 'PERFECTA' : lastResult?.precision === 0.75 ? 'BUENA' : 'MALA' },
            { label: 'BOTÍN TOTAL', value: sessionLoot }
          ]}
        />

      <EnergyRefillDialog 
        isOpen={showEnergyRefill}
        onClose={() => setShowEnergyRefill(false)}
        onSuccess={() => fetchRaids()}
      />

      <SquadManagerModal
        isOpen={showSquadModal}
        onClose={() => setShowSquadModal(false)}
        spirits={playerSpirits}
        initialSelectedIds={arenaDefenseIds}
        onSave={handleSaveSquad}
      />
    </div>
  );
}
