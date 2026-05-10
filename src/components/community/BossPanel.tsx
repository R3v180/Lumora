'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Swords, Zap, Trophy, Heart, Flame, Droplets, Moon, Leaf, Star, HelpCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';
import { EnergyRefillDialog } from '@/components/game/EnergyRefillDialog';
import { CombatResultModal } from '@/components/game/CombatResultModal';

interface BossData {
  id: string;
  name: string;
  nameEn: string;
  element: string;
  type: string;
  maxHp: number;
  currentHp: number;
  status: string;
  endsAt: string;
  timeLeftMs: number;
}

interface RankEntry {
  rank: number;
  playerId: string;
  displayName: string;
  level: number;
  totalDamage: number;
}

interface Spirit {
  id: string;
  name: string;
  element: string;
  rarity: string;
  level: number;
  power: number;
}

const ELEMENT_ICONS: Record<string, { icon: typeof Flame; color: string }> = {
  fire: { icon: Flame, color: 'text-lumora-fire' },
  water: { icon: Droplets, color: 'text-lumora-water' },
  dream: { icon: Moon, color: 'text-lumora-dream' },
  nature: { icon: Leaf, color: 'text-lumora-nature' },
  star: { icon: Star, color: 'text-lumora-star' },
};

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  dream: '🌙',
  nature: '🌿',
  star: '⭐',
};

const ELEMENT_ADVANTAGE: Record<string, string> = {
  fire: 'nature',
  nature: 'water',
  water: 'fire',
  dream: 'star',
  star: 'dream',
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'text-lumora-fire',
  water: 'text-lumora-water',
  dream: 'text-lumora-dream',
  nature: 'text-lumora-nature',
  star: 'text-lumora-star',
};

export function BossPanel() {
  const t = useTranslations('boss');
  const { data: session } = useSession();
  const [boss, setBoss] = useState<BossData | null>(null);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [spinResults, setSpinResults] = useState<string[]>([]);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showEnergyRefill, setShowEnergyRefill] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [floatingDamage, setFloatingDamage] = useState<number | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [victoryRewards, setVictoryRewards] = useState<any[]>([]);
  const [finalStats, setFinalStats] = useState<{damage: number, rank: number | string}>({ damage: 0, rank: '-' });
  const [lastBossImage, setLastBossImage] = useState<string>('');
  const [autoAttack, setAutoAttack] = useState(false);
  const autoAttackRef = useRef(false);
  const [multiplier, setMultiplier] = useState(1);
  
  const energy = useGameStore(s => s.energy);
  const BASE_COST = 10;
  const attackCost = BASE_COST * multiplier;

  const fetchBoss = useCallback(async () => {
    try {
      const res = await fetch('/api/boss');
      if (res.ok) {
        const data = await res.json();
        setBoss(data.boss);
        setRanking(data.ranking);
      }
    } catch (err) {
      console.error('Failed to fetch boss:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoss();
    const interval = setInterval(fetchBoss, 10000);
    return () => clearInterval(interval);
  }, [fetchBoss]);

  const handleAttack = async () => {
    if (energy < attackCost) {
      setShowEnergyRefill(true);
      setAutoAttack(false);
      autoAttackRef.current = false;
      return;
    }
    if (isAttacking) return;
    setIsAttacking(true);
    setSpinResults([]);
    try {
      const res = await fetch('/api/boss', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier })
      });
      const data = await res.json();
      
      if (res.ok) {
        audioService.playSpinStart();
        // Visual spin simulation
        setSpinResults(['fire', 'water', 'nature', 'dream', 'star'].sort(() => Math.random() - 0.5));
        
        setTimeout(() => {
          setSpinResults(data.spins);
          setLastDamage(data.damage);
          setFloatingDamage(data.damage);
          setIsShaking(true);
          audioService.playSurge();
          
          setTimeout(() => setIsShaking(false), 500);
          setTimeout(() => setFloatingDamage(null), 2000);

          useGameStore.getState().syncPlayerStats({
            lumens: data.newLumens,
            energy: data.newEnergy,
            maxEnergy: useGameStore.getState().maxEnergy,
          });
          useGameStore.getState().triggerRefresh();

          // Check for victory
          if (data.defeated) {
            const rewards = data.rewards || [
              { type: 'lumens', amount: data.lumensReward || 0 },
              { type: 'chest', amount: 'Recompensa de Ranking' }
            ];
            setVictoryRewards(rewards);
            setFinalStats({
              damage: data.playerTotalDamage || 0,
              rank: data.playerRank || '-'
            });
            setLastBossImage(`/assets/bosses/boss_${boss?.type || boss?.element}.png`);
            setTimeout(() => setShowVictoryModal(true), 1000);
            setAutoAttack(false);
            autoAttackRef.current = false;
          }

          fetchBoss();
          setIsAttacking(false);
        }, 1500);

      } else {
        audioService.playError();
        toast.error(data.error);
        setIsAttacking(false);
        setAutoAttack(false);
        autoAttackRef.current = false;
      }
    } catch (err) {
      toast.error('Error de conexión');
      setIsAttacking(false);
      setAutoAttack(false);
      autoAttackRef.current = false;
    }
  };

  // Auto-attack loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoAttack && !isAttacking) {
      timer = setTimeout(() => {
        if (autoAttackRef.current) {
          handleAttack();
        }
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [autoAttack, isAttacking]);

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Skull className="h-8 w-8 text-lumora-purple/40" />
        </motion.div>
      </div>
    );
  }

  if (!boss || boss.status !== 'active') {
    return (
      <div className="text-center py-12">
        <Skull className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{t('noBoss')}</p>
      </div>
    );
  }

  const hpPercent = Math.max(0, (boss.currentHp / boss.maxHp) * 100);

  return (
    <div className="relative space-y-4 rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/20 p-6 min-h-[600px]">
      {/* Immersive Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.img 
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 1.5 }}
          src="/assets/backgrounds/bg_boss.png" 
          alt="" 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Boss Card with Image */}
        <div className="rounded-2xl border border-lumora-purple/30 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col relative">
        {/* Absolute Help Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowHelpDialog(true)} 
          className="absolute top-3 right-3 z-[30] h-7 w-7 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 hover:text-white pointer-events-auto"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 z-0" />
        
        {/* Boss Image with Breathing and Shake Animation */}
        <motion.div
          animate={isShaking ? { 
            x: [0, -10, 10, -10, 10, 0],
            rotate: [0, -1, 1, -1, 1, 0]
          } : { 
            scale: [1, 1.02, 1] 
          }}
          transition={isShaking ? { duration: 0.4 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full h-48 relative z-0 flex items-center justify-center pt-4"
        >
          {/* Floating Damage Text */}
          <AnimatePresence>
            {floatingDamage !== null && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.2 }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  y: -40, 
                  scale: [0.5, 1.8, 2, 1.5],
                  x: (Math.random() - 0.5) * 40 // Random horizontal jitter
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute z-50 pointer-events-none flex items-center justify-center w-full h-full"
              >
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-400 to-orange-600 drop-shadow-[0_0_20px_rgba(255,165,0,0.9)] italic tracking-tighter">
                  -{floatingDamage.toLocaleString()}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <img 
            src={`/assets/bosses/boss_${boss.type || boss.element}.png`} 
            onError={(e) => { e.currentTarget.src = '/assets/bosses/boss_void.png'; }}
            alt={boss.name}
            className={`h-full object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-75 ${isShaking ? 'brightness-[3] contrast-[2]' : ''}`}
          />
        </motion.div>

        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-lumora-purple" />
              <h3 className="font-fantasy font-bold text-lumora-purple text-lg">{boss.name}</h3>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-background/50 border border-border/30 ${ELEMENT_COLORS[boss.element]}`}>{boss.element.toUpperCase()}</span>
              {/* Weakness Indicator */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[8px] text-muted-foreground uppercase font-bold">Débil contra:</span>
                <div className="flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10">
                   {/* Finding who is strong against the boss element */}
                   {Object.entries(ELEMENT_ADVANTAGE).find(([k, v]) => v === boss.element)?.[0] && (
                     <>
                       <span className="text-[10px]">{ELEMENT_EMOJIS[Object.entries(ELEMENT_ADVANTAGE).find(([k, v]) => v === boss.element)![0]]}</span>
                       <span className={`text-[9px] font-black uppercase ${ELEMENT_COLORS[Object.entries(ELEMENT_ADVANTAGE).find(([k, v]) => v === boss.element)![0]]}`}>
                         {Object.entries(ELEMENT_ADVANTAGE).find(([k, v]) => v === boss.element)![0]}
                       </span>
                     </>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{t('hitPoints', { defaultMessage: 'Puntos de Vida' })}</span>
              <span>{boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}</span>
            </div>
            <div className="h-4 rounded-full bg-background/50 border border-border/20 overflow-hidden relative">
              <motion.div
                className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500"
                initial={{ width: '100%' }}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground mt-3">
            <span className="flex items-center gap-1">⏱ {formatTime(boss.timeLeftMs)}</span>
            {lastDamage && <span className="text-lumora-gold font-bold text-sm bg-lumora-gold/10 px-2 py-0.5 rounded-md border border-lumora-gold/20">⚔️ -{lastDamage}</span>}
          </div>
        </div>
      </div>

      {/* Interactive Combat Spins */}
      <div className="rounded-2xl border border-border/20 bg-card/40 p-3.5">
        <div className="flex justify-between items-center mb-2.5">
          <p className="text-sm font-semibold text-muted-foreground">Giros de Combate</p>
          <span className="text-[10px] font-bold text-lumora-blue bg-lumora-blue/10 px-2 py-0.5 rounded-full border border-lumora-blue/20">Coste: {attackCost} ⚡</span>
        </div>
        
        {/* Slot Machine Visualization - Bandeja de Invocación */}
        <div className="flex justify-center gap-2 mb-4 h-16 bg-black/60 border-2 border-red-500/40 rounded-xl items-center shadow-[inset_0_0_20px_rgba(239,68,68,0.15)] relative mt-1.5">
          <div className="absolute -top-2.5 px-2 bg-black text-[9px] text-red-400 font-black rounded-full border border-red-500/40 uppercase tracking-wider">
            Bandeja de Invocación
          </div>
          {spinResults.length > 0 ? (
            spinResults.map((element, idx) => (
              <motion.div
                key={idx}
                initial={{ y: -50, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.2, type: 'spring', bounce: 0.5 }}
                className={`w-12 h-12 rounded-xl border-2 bg-card/80 flex items-center justify-center shadow-lg ${
                  element === 'fire' ? 'border-lumora-fire/50 shadow-lumora-fire/20' :
                  element === 'water' ? 'border-lumora-water/50 shadow-lumora-water/20' :
                  element === 'nature' ? 'border-lumora-nature/50 shadow-lumora-nature/20' :
                  element === 'dream' ? 'border-lumora-dream/50 shadow-lumora-dream/20' :
                  'border-lumora-star/50 shadow-lumora-star/20'
                }`}
              >
                <img src={`/assets/symbols/sym_${element}_rare.png`} alt={element} className="w-7 h-7 object-contain" />
              </motion.div>
            ))
          ) : (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="w-10 h-10 rounded-xl border-2 border-border/10 bg-background/30 flex items-center justify-center opacity-50">
                <span className="text-lg text-muted-foreground/20">?</span>
              </div>
            ))
          )}
        </div>

        {/* Multiplier Selector */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 3, 5, 10].map((m) => (
            <button
              key={m}
              onClick={() => setMultiplier(m)}
              disabled={isAttacking || autoAttack}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                multiplier === m 
                  ? 'bg-lumora-purple text-white border-lumora-purple shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                  : 'bg-card/40 text-muted-foreground border-border/20 hover:bg-card/60'
              }`}
            >
              x{m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant={autoAttack ? "destructive" : "outline"}
            onClick={() => {
              setAutoAttack(!autoAttack);
              autoAttackRef.current = !autoAttack;
            }}
            className="flex-1 rounded-xl font-bold h-12 text-sm border-lumora-purple/30 text-lumora-purple hover:bg-lumora-purple/10"
          >
            {autoAttack ? "PARAR AUTO" : "AUTO-COMBATE"}
          </Button>

          <Button
            onClick={handleAttack}
            disabled={isAttacking || autoAttack}
            className="flex-[2] rounded-xl bg-gradient-to-r from-lumora-purple to-lumora-pink hover:from-lumora-purple/90 hover:to-lumora-pink/90 text-white font-bold h-12 text-lg shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
          >
            {isAttacking && spinResults.length === 0 ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Zap className="h-5 w-5" />
              </motion.div>
            ) : (
              <>
                <Swords className="h-5 w-5 mr-2" />
                {autoAttack ? "LUCHANDO..." : "¡ATACAR!"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Ranking */}
      {ranking.length > 0 && (
        <div className="rounded-2xl border border-border/20 bg-card/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="h-4 w-4 text-lumora-gold" />
            <span className="text-xs font-semibold">{t('damageRanking')}</span>
          </div>
          <div className="space-y-1">
            {ranking.map((r) => (
              <div key={r.playerId} className="flex items-center justify-between px-2 py-1 rounded-lg bg-background/20">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-lumora-gold w-4">#{r.rank}</span>
                  <span className="text-xs">{r.displayName}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">⚔️ {r.totalDamage.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Dialog */}
      {showHelpDialog && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border/30 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-lumora-purple" />
              <h3 className="font-fantasy font-bold text-lg">Guía de Incursiones</h3>
            </div>
            
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                Cada ataque consume <strong className="text-lumora-blue">10⚡</strong> y lanza <strong className="text-white">5 Giros Elementales</strong>. El daño total depende de tu nivel y las ventajas de los elementos obtenidos.
              </p>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-black uppercase text-lumora-gold mb-2">Ventaja Elemental (x2 Daño)</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center justify-between bg-black/20 p-1.5 rounded-lg">
                    <span>💧 AGUA</span> <span className="text-muted-foreground mx-1">➜</span> <span>🔥 FUEGO</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/20 p-1.5 rounded-lg">
                    <span>🔥 FUEGO</span> <span className="text-muted-foreground mx-1">➜</span> <span>🌿 NATUR.</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/20 p-1.5 rounded-lg">
                    <span>🌿 NATUR.</span> <span className="text-muted-foreground mx-1">➜</span> <span>💧 AGUA</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/20 p-1.5 rounded-lg">
                    <span>🌙 SUEÑO</span> <span className="text-muted-foreground mx-1">➜</span> <span>⭐ ESTRELLA</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground italic">
                *El elemento ESTRELLA ⭐ siempre otorga un multiplicador de x1.5.
              </p>
            </div>

            <Button onClick={() => setShowHelpDialog(false)} className="w-full mt-6 rounded-xl bg-lumora-purple text-white font-bold">
              ¡ENTENDIDO!
            </Button>
          </div>
        </div>
      )}

      {/* Combat Result Modal (Victory) */}
      <CombatResultModal
        isOpen={showVictoryModal}
        onClose={() => setShowVictoryModal(false)}
        type="victory"
        title="¡JEFE DERROTADO!"
        subtitle={`Has purificado a ${boss?.name}`}
        rewards={victoryRewards}
        bossImage={lastBossImage}
        stats={[
          { label: 'DAÑO TOTAL', value: finalStats.damage.toLocaleString() },
          { label: 'RANGO', value: finalStats.rank }
        ]}
      />

      {/* Energy Refill Dialog */}
      <EnergyRefillDialog 
        isOpen={showEnergyRefill} 
        onClose={() => setShowEnergyRefill(false)}
        onSuccess={() => fetchBoss()}
      />
      </div>
    </div>
  );
}
