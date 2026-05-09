'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, Swords, Trophy, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';

interface Spirit {
  id: string;
  name: string;
  element: string;
  rarity: string;
  level: number;
  power: number;
}

interface Opponent {
  id: string;
  displayName: string;
  level: number;
  rating: number;
}

interface RankEntry {
  rank: number;
  id: string;
  displayName: string;
  level: number;
  rating: number;
  isYou: boolean;
}

export function ArenaPanel() {
  const t = useTranslations('arena');
  const [rating, setRating] = useState(1000);
  const [defenseIds, setDefenseIds] = useState<string[]>([]);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [spirits, setSpirits] = useState<Spirit[]>([]);
  const [selectedSpirits, setSelectedSpirits] = useState<string[]>([]);
  const [mode, setMode] = useState<'overview' | 'defense' | 'attack'>('overview');
  const [attackTarget, setAttackTarget] = useState<Opponent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFighting, setIsFighting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [spinResults, setSpinResults] = useState<string[]>([]);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const fetchArena = useCallback(async () => {
    try {
      const res = await fetch('/api/arena');
      if (res.ok) {
        const data = await res.json();
        setRating(data.rating);
        setDefenseIds(data.defenseIds || []);
        setOpponents(data.opponents);
        setRanking(data.ranking);
        setSpirits(data.spirits);
      }
    } catch (err) {
      console.error('Failed to fetch arena:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArena();
  }, [fetchArena]);

  const toggleSpirit = (id: string) => {
    setSelectedSpirits((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleSetDefense = async () => {
    if (selectedSpirits.length !== 3) {
      toast.error(t('selectAttackTeam'));
      return;
    }
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setDefense', spiritIds: selectedSpirits }),
      });
      if (res.ok) {
        audioService.playClaimReward();
        toast.success(t('defenseSet'));
        setDefenseIds(selectedSpirits);
        setSelectedSpirits([]);
        setMode('overview');
      }
    } catch (err) {
      toast.error('Error');
    }
  };

  const handleAttack = async () => {
    if (!attackTarget) return;
    setIsFighting(true);
    setSpinResults([]);
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attack', opponentId: attackTarget.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSpinResults(data.spins);
        audioService.playSpinStart();

        setTimeout(() => {
          if (data.victory) {
            audioService.playSurge();
            toast.success(t('victory'));
          } else {
            audioService.playError();
            toast(t('defeat'));
          }
          setLastResult(data);
          setRating(data.newRating);
          useGameStore.getState().syncPlayerStats({
            lumens: data.newLumens,
            energy: data.newEnergy,
            maxEnergy: useGameStore.getState().maxEnergy,
          });
          useGameStore.getState().triggerRefresh();
          setAttackTarget(null);
          setMode('overview');
          fetchArena();
          setIsFighting(false);
        }, 1500);
      } else {
        audioService.playError();
        toast.error(data.error);
        setIsFighting(false);
      }
    } catch (err) {
      toast.error('Error de conexión');
      setIsFighting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Swords className="h-8 w-8 text-lumora-gold/40" />
        </motion.div>
      </div>
    );
  }

  // DEFENSE MODE
  if (mode === 'defense') {
    return (
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{t('setDefense')}</h3>
          <Button variant="ghost" size="sm" onClick={() => { setMode('overview'); setSelectedSpirits([]); }}>←</Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('selectAttackTeam')} ({selectedSpirits.length}/3)</p>
        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
          {spirits.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSpirit(s.id)}
              className={`p-1.5 rounded-xl border text-center transition-all ${
                selectedSpirits.includes(s.id)
                  ? 'border-lumora-gold/60 bg-lumora-gold/10 ring-1 ring-lumora-gold/30'
                  : 'border-border/20 bg-background/30 hover:bg-card/60'
              }`}
            >
              <img src={`/assets/symbols/sym_${s.element}_${s.rarity}.png`} className="w-6 h-6 mx-auto object-contain" alt={s.name} />
              <span className="text-[8px] text-muted-foreground block">⚔{s.power}</span>
            </button>
          ))}
        </div>
        <Button onClick={handleSetDefense} disabled={selectedSpirits.length !== 3} className="w-full rounded-xl bg-gradient-to-r from-lumora-blue to-lumora-purple text-white font-bold" size="sm">
          <Shield className="h-4 w-4 mr-1.5" />{t('setDefense')}
        </Button>
      </div>
    );
  }

  // ATTACK MODE
  if (mode === 'attack' && attackTarget) {
    return (
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">vs {attackTarget.displayName}</h3>
          <Button variant="ghost" size="sm" onClick={() => { setMode('overview'); setSpinResults([]); setAttackTarget(null); }}>←</Button>
        </div>
        <div className="rounded-2xl border border-border/20 bg-card/40 p-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold text-muted-foreground">Tus 3 Giros de Combate</p>
            <span className="text-xs font-bold text-lumora-blue bg-lumora-blue/10 px-2 py-1 rounded-full border border-lumora-blue/20">Coste: 15 ⚡</span>
          </div>
          
          {/* Slot Machine Visualization - Bandeja de Invocación */}
          <div className="flex justify-center gap-3 mb-6 h-20 bg-black/60 border-2 border-lumora-gold/40 rounded-xl items-center shadow-[inset_0_0_20px_rgba(255,215,0,0.15)] relative mt-2">
            <div className="absolute -top-3 px-2 bg-black text-[10px] text-lumora-gold font-bold rounded-full border border-lumora-gold/40 uppercase tracking-wider">
              Bandeja de Invocación
            </div>
            {spinResults.length > 0 ? (
              spinResults.map((element, idx) => (
                <motion.div
                  key={idx}
                  initial={{ y: -50, opacity: 0, scale: 0.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.2, type: 'spring', bounce: 0.5 }}
                  className="w-14 h-14 rounded-xl border-2 bg-card/80 flex items-center justify-center shadow-lg border-lumora-gold/50 shadow-lumora-gold/20"
                >
                  <img src={`/assets/symbols/sym_${element}_rare.png`} alt={element} className="w-10 h-10 object-contain" />
                </motion.div>
              ))
            ) : (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="w-14 h-14 rounded-xl border-2 border-border/20 bg-background/30 flex items-center justify-center opacity-50">
                  <span className="text-xl text-muted-foreground/30">?</span>
                </div>
              ))
            )}
          </div>

          <Button onClick={handleAttack} disabled={isFighting} className="w-full rounded-xl bg-gradient-to-r from-red-500 to-lumora-pink text-white font-bold h-12 text-lg shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <Swords className="h-5 w-5 mr-2" />{isFighting && spinResults.length === 0 ? t('fighting') : t('fight')}
          </Button>
        </div>
      </div>
    );
  }

  // OVERVIEW
  return (
    <div className="space-y-4 relative overflow-hidden rounded-2xl p-4">
      {/* Background Arena Image */}
      <div className="absolute inset-0 z-0">
        <img src="/assets/backgrounds/bg_arena.png" alt="Arena Background" className="w-full h-full object-cover opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative z-10 flex justify-end">
        <Button variant="ghost" size="icon" onClick={() => setShowHelpDialog(true)} className="h-8 w-8 rounded-full bg-card/50 border border-border/30 text-muted-foreground hover:text-foreground">
          <span className="font-bold font-serif">?</span>
        </Button>
      </div>
      {/* Rating Card */}
      <div className="rounded-2xl border border-lumora-gold/30 bg-card/60 backdrop-blur-sm p-4 text-center relative z-10 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
        <Crown className="h-6 w-6 text-lumora-gold mx-auto mb-1" />
        <p className="text-2xl font-bold font-fantasy text-lumora-gold">{rating}</p>
        <p className="text-[10px] text-muted-foreground">{t('arenaPoints')}</p>
      </div>

      {/* Last Result */}
      {lastResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative z-10 rounded-xl p-3 text-center text-sm font-bold ${
            lastResult.victory ? 'bg-lumora-emerald/10 text-lumora-emerald border border-lumora-emerald/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}
        >
          {lastResult.victory ? t('victory') : t('defeat')} ({lastResult.ratingChange > 0 ? '+' : ''}{lastResult.ratingChange} ELO)
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-2 relative z-10">
        <Button onClick={() => { setMode('defense'); setSelectedSpirits(defenseIds); }} variant="outline" size="sm" className="flex-1 rounded-xl border-lumora-blue/30">
          <Shield className="h-4 w-4 mr-1" />{t('setDefense')}
        </Button>
      </div>

      {/* Opponents */}
      <div className="rounded-2xl border border-border/20 bg-card/80 backdrop-blur-md p-3 relative z-10">
        <p className="text-xs font-semibold mb-2">{t('opponents')}</p>
        {opponents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t('noOpponents')}</p>
        ) : (
          <div className="space-y-1.5">
            {opponents.map((o) => (
              <button
                key={o.id}
                onClick={() => { setAttackTarget(o); setMode('attack'); setSelectedSpirits([]); }}
                className="w-full flex items-center justify-between p-3 min-h-[60px] rounded-xl border border-border/20 bg-background/20 hover:bg-card/60 transition-colors"
              >
                <div className="text-left">
                  <span className="text-xs font-semibold">{o.displayName}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">Nv.{o.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-lumora-gold font-bold">ELO {o.rating}</span>
                  <Swords className="h-3.5 w-3.5 text-red-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ranking */}
      {ranking.length > 0 && (
        <div className="rounded-2xl border border-border/20 bg-card/80 backdrop-blur-md p-3 relative z-10">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="h-4 w-4 text-lumora-gold" />
            <span className="text-xs font-semibold">{t('ranking')}</span>
          </div>
          <div className="space-y-1">
            {ranking.map((r) => (
              <div key={r.id} className={`flex items-center justify-between px-2 py-1 rounded-lg ${r.isYou ? 'bg-lumora-gold/10 border border-lumora-gold/20' : 'bg-background/20'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-lumora-gold w-4">#{r.rank}</span>
                  <span className="text-xs">{r.displayName} {r.isYou ? '⭐' : ''}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{r.rating} ELO</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Dialog */}
      {showHelpDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border/30 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="font-fantasy font-bold text-lg mb-2">Arena Interactiva</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              En la Arena, el combate ahora se define mediante <strong className="text-lumora-gold">3 Giros de Combate</strong>. 
              Selecciona tu equipo de Defensa y ataca a otros jugadores girando los símbolos para superar su defensa con ventajas elementales.
            </p>
            <Button onClick={() => setShowHelpDialog(false)} className="w-full rounded-xl bg-lumora-blue text-white font-bold">
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
