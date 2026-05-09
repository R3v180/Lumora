'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, Target, Coins, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';
import { EnergyRefillDialog } from '@/components/game/EnergyRefillDialog';
import { CombatResultModal } from '@/components/game/CombatResultModal';
import { Zap, Play, Square, HelpCircle, X } from 'lucide-react';

interface RaidTarget {
  id: string;
  displayName: string;
  level: number;
  sanctuaryName: string;
  idleLumens: number;
  stealable: number;
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
  const [autoRaid, setAutoRaid] = useState(false);
  const [sessionLoot, setSessionLoot] = useState(0);
  const autoRaidRef = useRef(false);

  const energy = useGameStore(s => s.energy);
  const RAID_COST = 20;

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRaids = useCallback(async () => {
    try {
      const res = await fetch('/api/raid');
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets);
        setMyShield(data.myShield);
      }
    } catch (err) {
      console.error('Failed to fetch raids:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async (isAuto = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/raid/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (!isAuto) toast.success(data.isFree ? 'Exploración gratuita realizada' : 'Nuevos objetivos localizados');
        
        useGameStore.getState().syncPlayerStats({
          lumens: data.newLumens,
          energy: useGameStore.getState().energy,
          maxEnergy: useGameStore.getState().maxEnergy,
        });
        useGameStore.getState().triggerRefresh();
        fetchRaids();
      } else {
        if (!isAuto) toast.error(data.error);
        if (isAuto) setAutoRaid(false);
      }
    } catch (err) {
      toast.error('Error al explorar');
      if (isAuto) setAutoRaid(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRaids();
  }, [fetchRaids]);

  useEffect(() => {
    if (autoRaid && !raidingId) {
      if (energy < RAID_COST) {
        setAutoRaid(false);
        autoRaidRef.current = false;
        setShowEnergyRefill(true);
        return;
      }
      const viableTargets = targets.filter(t => t.stealable > 0);
      if (viableTargets.length === 0) {
        const timer = setTimeout(() => handleRefresh(true), 1200);
        return () => clearTimeout(timer);
      }
      const sorted = [...viableTargets].sort((a, b) => b.stealable - a.stealable);
      const timer = setTimeout(() => handleRaid(sorted[0].id), 1500);
      return () => clearTimeout(timer);
    }
  }, [autoRaid, raidingId, targets, energy]);

  const handleRaid = async (targetId: string) => {
    if (energy < RAID_COST) {
      setShowEnergyRefill(true);
      setAutoRaid(false);
      autoRaidRef.current = false;
      return;
    }
    if (raidingId) return;
    setRaidingId(targetId);
    try {
      const res = await fetch('/api/raid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json();
      if (res.ok) {
        const isSuccess = data.success !== false;
        setLastResult({ ...data, success: isSuccess, targetName: targets.find(t => t.id === targetId)?.displayName });
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
        useGameStore.getState().triggerRefresh();
        setShowResultModal(true);
        setMyShield(data.shieldUntil);
        fetchRaids();
      } else {
        audioService.playError();
        if (data.error === 'Energía insuficiente') {
          setShowEnergyRefill(true);
          setAutoRaid(false);
        } else {
          toast.error(data.error);
        }
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setRaidingId(null);
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
    <div className="relative space-y-4 rounded-xl overflow-hidden border border-border/30 bg-card/40 p-4">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: 'url(/assets/backgrounds/bg_raid.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative z-10 space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleRefresh(false)}
            disabled={isRefreshing}
            className="h-8 px-3 rounded-full gap-1.5 font-bold text-[10px] border-lumora-gold/30 text-lumora-gold hover:bg-lumora-gold/10"
          >
            <Sparkles className="h-3 w-3" />
            {isRefreshing ? "..." : "EXPLORAR"}
          </Button>

          <Button 
            variant={autoRaid ? "destructive" : "default"} 
            size="sm" 
            onClick={() => {
              setAutoRaid(!autoRaid);
              autoRaidRef.current = !autoRaid;
            }}
            className="h-8 px-3 rounded-full gap-1.5 font-bold text-[10px]"
          >
            {autoRaid ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {autoRaid ? "PARAR AUTO" : "AUTO-RAID"}
          </Button>

          {sessionLoot > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 bg-lumora-gold/20 border border-lumora-gold/30 px-3 py-1 rounded-full"
            >
              <Coins className="h-3 w-3 text-lumora-gold" />
              <span className="text-[10px] font-bold text-lumora-gold">+{sessionLoot.toLocaleString()}</span>
            </motion.div>
          )}
          
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${energy < RAID_COST ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-lumora-blue/10 border-lumora-blue/30 text-lumora-blue'}`}>
            <Zap className={`h-3 w-3 ${energy < RAID_COST ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold">{energy} / 20</span>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={() => setShowHelpDialog(true)} className="h-8 w-8 rounded-full bg-card/50 border border-border/30 text-muted-foreground hover:text-foreground">
          <span className="font-bold font-serif">?</span>
        </Button>
      </div>

      {/* Shield Status */}
      {myShield && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-lumora-blue/30 bg-lumora-blue/5 p-3 flex items-center gap-3"
        >
          <ShieldCheck className="h-5 w-5 text-lumora-blue flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-lumora-blue">{t('shielded')}</p>
            <p className="text-[10px] text-muted-foreground">
              {t('shieldActive', { time: new Date(myShield).toLocaleTimeString() })}
            </p>
          </div>
        </motion.div>
      )}

      {/* Targets */}
      <div className="rounded-2xl border border-border/20 bg-card/40 p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <Target className="h-4 w-4 text-lumora-pink" />
          <span className="text-xs font-semibold">{t('raidTargets')}</span>
        </div>

        {targets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{t('noTargets')}</p>
        ) : (
          <div className="space-y-2">
            {targets.map((target) => (
              <div
                key={target.id}
                className="rounded-xl border border-border/20 bg-background/20 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold">{target.displayName}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">Nv.{target.level}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{target.sanctuaryName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-lumora-gold" />
                    <span className="text-xs text-lumora-gold font-bold">+{target.stealable} Lumens</span>
                    <span className="text-[10px] text-muted-foreground">({target.idleLumens} idle)</span>
                  </div>

                  <Button
                    onClick={() => handleRaid(target.id)}
                    disabled={raidingId === target.id}
                    size="sm"
                    className="rounded-lg bg-gradient-to-r from-lumora-pink to-red-500 text-white text-[10px] h-7 px-3"
                  >
                    {raidingId === target.id ? t('raiding') : t('attackSanctuary')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Combat Result Modal */}
      <CombatResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        type={lastResult?.success ? 'victory' : 'defeat'}
        title={lastResult?.success ? '¡SAQUEO EXITOSO!' : 'INCURSIÓN FALLIDA'}
        subtitle={lastResult?.success ? `Has asaltado el santuario de ${lastResult.targetName}` : 'El escudo enemigo ha repelido tu ataque'}
        rewards={lastResult?.success ? [
          { type: 'lumens', amount: lastResult.lumensStolen || 0 },
          { type: 'exp', amount: 15 }
        ] : []}
        stats={[
          { label: 'ESCUDO ACTIVO', value: '30 min' },
          { label: 'BOTÍN TOTAL', value: sessionLoot }
        ]}
      />

      {/* Help Dialog */}
      {showHelpDialog && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border/30 p-6 rounded-3xl max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-lumora-pink" />
              <h3 className="font-fantasy font-bold text-lg">Saqueos Oníricos</h3>
            </div>
            
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                Asalta santuarios de otros jugadores para robar sus <strong className="text-white">Lumens</strong> acumulados.
              </p>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-black uppercase text-lumora-gold mb-2">Reglas de Asalto</p>
                <ul className="space-y-1 text-[10px] text-muted-foreground">
                  <li>• Solo puedes robar Lumens "inactivos" (no reclamados).</li>
                  <li>• Atacar activa un <strong className="text-lumora-blue">Escudo 🛡️</strong> de 30 min para ti.</li>
                  <li>• Si el enemigo tiene escudo activo, no aparecerá en tu lista.</li>
                </ul>
              </div>
            </div>

            <Button onClick={() => setShowHelpDialog(false)} className="w-full mt-6 rounded-xl bg-lumora-pink text-white font-bold">
              ¡ENTENDIDO!
            </Button>
          </div>
        </div>
      )}
      </div>

      <EnergyRefillDialog 
        isOpen={showEnergyRefill}
        onClose={() => setShowEnergyRefill(false)}
        onSuccess={() => fetchRaids()}
      />
    </div>
  );
}
