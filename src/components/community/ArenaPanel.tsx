'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Swords, Trophy, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';
import { EnergyRefillDialog } from '@/components/game/EnergyRefillDialog';
import { CombatResultModal } from '@/components/game/CombatResultModal';
import { SquadManagerModal } from '@/components/game/SquadManagerModal';
import { HelpCircle, X, Settings } from 'lucide-react';
import { PlayerAvatar } from '@/components/progression/PlayerAvatar';

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
  const [showEnergyRefill, setShowEnergyRefill] = useState(false);
  const [filterElement, setFilterElement] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'power' | 'rarity'>('power');
  
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  
  const energy = useGameStore(s => s.energy);
  const ARENA_COST = 15;

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
    setSelectedSpirits((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      if (prev.length < 3) {
        return [...prev, id];
      }
      // Smart Swap: Replace the first one if we already have 3
      return [prev[1], prev[2], id];
    });
  };

  const getSynergy = () => {
    if (selectedSpirits.length < 3) return { label: null, bonus: 0 };
    const selected = selectedSpirits.map(id => spirits.find(s => s.id === id)).filter(Boolean);
    const elements = selected.map(s => s!.element);
    const unique = new Set(elements);
    
    if (unique.size === 1) return { label: `TRIPLE ${elements[0].toUpperCase()}`, bonus: 0.25 };
    if (unique.size === 2) {
      const counts: any = {};
      elements.forEach(e => counts[e] = (counts[e] || 0) + 1);
      const duo = Object.keys(counts).find(k => counts[k] === 2);
      return { label: `DUO ${duo?.toUpperCase()}`, bonus: 0.10 };
    }
    return { label: 'VERSATILIDAD', bonus: 0.05 };
  };

  const handleSaveSquad = async (spiritIds: string[]) => {
    const res = await fetch('/api/arena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setDefense', spiritIds }),
    });
    if (res.ok) {
      setDefenseIds(spiritIds);
      fetchArena();
    } else {
      throw new Error('Failed to save');
    }
  };

  const handleAttack = async () => {
    if (!attackTarget) return;
    if (energy < ARENA_COST) {
      setShowEnergyRefill(true);
      return;
    }
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
          setLastResult(data);
          setRating(data.newRating);
          useGameStore.getState().syncPlayerStats({
            lumens: data.newLumens,
            energy: data.newEnergy,
            maxEnergy: useGameStore.getState().maxEnergy,
          });
          useGameStore.getState().triggerRefresh();
          
          setShowResultModal(true);

          setAttackTarget(null);
          setMode('overview');
          fetchArena();
          setIsFighting(false);
        }, 1500);
      } else {
        audioService.playError();
        if (data.error === 'Energía insuficiente') setShowEnergyRefill(true);
        else toast.error(data.error);
        setIsFighting(false);
      }
    } catch (err) {
      toast.error('Error de conexión');
      setIsFighting(false);
    }
  };


  const synergy = getSynergy();
  const RARITY_MULTIPLIERS: any = { legendary: 1.6, epic: 1.3, rare: 1.15, common: 1.0 };
  const selectedObjects = selectedSpirits.map(id => spirits.find(x => x.id === id)).filter(Boolean);
  
  const baseSum = selectedObjects.reduce((acc, s) => acc + (s?.power || 0), 0);
  const rarityBonus = Math.round(selectedObjects.reduce((acc, s) => {
    const mult = RARITY_MULTIPLIERS[s!.rarity] || 1.0;
    return acc + (s!.power * mult - s!.power);
  }, 0));
  
  const totalPower = Math.round((baseSum + rarityBonus) * (1 + synergy.bonus));

  const filteredSpirits = spirits
    .filter(s => !filterElement || s.element === filterElement)
    .sort((a, b) => {
      if (sortBy === 'power') return b.power - a.power;
      const rarities: any = { legendary: 4, epic: 3, rare: 2, common: 1 };
      return (rarities[b.rarity] || 0) - (rarities[a.rarity] || 0);
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Swords className="h-8 w-8 text-lumora-gold/40" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative overflow-hidden rounded-2xl p-4 min-h-[600px]">
      {/* Shared Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: [1.1, 1.15, 1.1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          src="/assets/backgrounds/bg_arena.png" 
          alt="Arena Background" 
          className="w-full h-full object-cover opacity-50 mix-blend-soft-light" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      {/* Main Content Switcher */}
      <div className="relative z-10">
        {mode === 'attack' && attackTarget ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">vs {attackTarget.displayName}</h3>
              <Button variant="ghost" size="icon" onClick={() => { setMode('overview'); setSpinResults([]); setAttackTarget(null); }} className="rounded-full bg-white/5 border border-white/10 h-10 w-10"><X className="h-5 w-5" /></Button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6">
              <div className="flex justify-center gap-4 mb-8 h-24 bg-black/60 border-2 border-white/10 rounded-2xl items-center relative">
                {spinResults.length > 0 ? spinResults.map((element, idx) => (
                  <motion.div key={idx} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.2 }} className="w-16 h-16 rounded-2xl border-2 border-lumora-gold/50 bg-card/80 flex items-center justify-center">
                    <img src={`/assets/symbols/sym_${element}_rare.png`} className="w-12 h-12" />
                  </motion.div>
                )) : Array.from({ length: 3 }).map((_, idx) => <div key={idx} className="w-16 h-16 rounded-2xl border-2 border-white/5 bg-white/5 flex items-center justify-center opacity-30">?</div>)}
              </div>
              <Button onClick={handleAttack} disabled={isFighting} className="w-full h-14 rounded-3xl bg-gradient-to-r from-red-500 to-lumora-pink text-white font-black text-xl"><Swords className="h-6 w-6 mr-2" />{isFighting ? 'COMBATIENDO...' : '¡A LA CARGA!'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-700">
            <Button variant="ghost" size="icon" onClick={() => setShowHelpDialog(true)} className="absolute top-0 right-0 h-8 w-8 rounded-full bg-black/40 border border-white/10 text-white/60"><HelpCircle className="h-4 w-4" /></Button>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-3xl border-2 border-lumora-gold/40 bg-gradient-to-b from-lumora-gold/20 to-black/60 p-6 text-center mt-4">
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-lumora-gold">{rating}</p>
              <p className="text-xs text-lumora-gold/60 font-black uppercase mt-1">Nivel Competitivo</p>
            </motion.div>
            <div className="flex gap-2">
              <Button onClick={() => setShowSquadModal(true)} variant="outline" size="sm" className="flex-1 h-12 rounded-2xl border-white/10 bg-white/5 font-black text-xs text-lumora-blue"><Shield className="h-4 w-4 mr-2" />{t('setDefense')}</Button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2"><Swords className="h-4 w-4 text-red-500" /><p className="text-xs font-black text-white/60 uppercase">{t('opponents')}</p></div>
              <div className="space-y-3">
                {opponents.map((o) => (
                  <button key={o.id} onClick={() => { setAttackTarget(o); setMode('attack'); setSelectedSpirits([]); }} className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar avatarId={(o as any).avatar} displayName={o.displayName} size="sm" />
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-black text-white">{o.displayName}</span>
                        <span className="text-[10px] text-white/40 font-bold">NV.{o.level}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-lumora-gold">{o.rating}</span>
                      <div className="px-2 py-0.5 rounded-md bg-red-500/20 text-[8px] font-black text-red-400 uppercase">Retar</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Modals */}
      <CombatResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        type={lastResult?.victory ? 'victory' : 'defeat'}
        title={lastResult?.victory ? '¡VICTORIA ESTELAR!' : 'DERROTA'}
        subtitle={lastResult?.victory ? `Has vencido a ${lastResult.opponentName}` : 'Tu equipo ha caído en combate'}
        rewards={lastResult?.victory ? [{ type: 'lumens', amount: lastResult.lumensReward || 0 }, { type: 'exp', amount: 25 }] : []}
        stats={[{ label: 'PUNTOS ELO', value: `${lastResult?.ratingChange > 0 ? '+' : ''}${lastResult?.ratingChange || 0}` }, { label: 'TU RATING', value: rating }]}
      />

      <SquadManagerModal
        isOpen={showSquadModal}
        onClose={() => setShowSquadModal(false)}
        spirits={spirits}
        initialSelectedIds={defenseIds}
        onSave={handleSaveSquad}
      />

      {showHelpDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            className="bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden"
          >
            <div className="bg-gradient-to-b from-white/5 to-transparent p-6 pb-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-lumora-gold/20 flex items-center justify-center border border-lumora-gold/40">
                  <Shield className="h-5 w-5 text-lumora-gold" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-white uppercase italic tracking-tighter">Guía del Coliseo</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Domina la Arena Estelar</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Sección 1: La Guardia */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-lumora-gold">
                  <Crown className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider">La Guardia Táctica</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Tu guardia defiende tu posición en el ranking. El **Poder Total** se calcula sumando el poder base de tus 3 espíritus y aplicando bonos por su **Nivel** y **Rareza**.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-lumora-gold uppercase block mb-1">Multiplicador Rango</span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-white/40"><span>LEGENDARIO</span><span className="text-lumora-gold">x1.6</span></div>
                      <div className="flex justify-between text-[8px] font-bold text-white/40"><span>ÉPICO</span><span className="text-lumora-purple">x1.3</span></div>
                      <div className="flex justify-between text-[8px] font-bold text-white/40"><span>RARO</span><span className="text-lumora-blue">x1.1</span></div>
                    </div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <span className="text-[9px] font-black text-lumora-blue uppercase block mb-1">Nivel (LV)</span>
                    <p className="text-[8px] text-white/40 font-bold leading-tight">Cada nivel aumenta permanentemente las estadísticas base del espíritu.</p>
                  </div>
                </div>
              </section>

              {/* Sección 2: Sinergias */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-lumora-blue">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Sinergias Elementales</span>
                </div>
                <div className="bg-gradient-to-br from-lumora-blue/10 to-transparent p-4 rounded-2xl border border-lumora-blue/20">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-lumora-gold" />
                        <span className="text-[10px] font-black text-white uppercase">Triple Elemento</span>
                      </div>
                      <span className="text-xs font-black text-lumora-gold">+25% PODER</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-lumora-blue" />
                        <span className="text-[10px] font-black text-white uppercase">Dúo Elemental</span>
                      </div>
                      <span className="text-xs font-black text-lumora-blue">+10% PODER</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/40" />
                        <span className="text-[10px] font-black text-white uppercase">Versatilidad</span>
                      </div>
                      <span className="text-xs font-black text-white/40">+5% PODER</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Sección 3: Recompensas */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-lumora-pink">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-wider">Gloria y Botín</span>
                </div>
                <p className="text-[10px] text-white/40 font-bold leading-relaxed italic">
                  "Los campeones con mayor ELO reciben cofres estelares cada semana y Lumens extra en cada victoria."
                </p>
              </section>
            </div>

            <div className="p-6 pt-0">
              <Button 
                onClick={() => setShowHelpDialog(false)} 
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-lumora-blue to-lumora-purple text-white font-black text-lg shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all"
              >
                ¡ENTENDIDO, COMANDANTE!
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <EnergyRefillDialog isOpen={showEnergyRefill} onClose={() => setShowEnergyRefill(false)} onSuccess={() => fetchArena()} />
    </div>
  );
}
