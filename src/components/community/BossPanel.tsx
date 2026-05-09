'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Skull, Swords, Zap, Trophy, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';

interface BossData {
  id: string;
  name: string;
  nameEn: string;
  element: string;
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

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'text-lumora-fire',
  water: 'text-lumora-water',
  dream: 'text-lumora-dream',
  nature: 'text-lumora-nature',
  star: 'text-lumora-star',
};

export function BossPanel() {
  const t = useTranslations('boss');
  const [boss, setBoss] = useState<BossData | null>(null);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [spinResults, setSpinResults] = useState<string[]>([]);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const fetchBoss = useCallback(async () => {
    try {
      const [bossRes, playerRes] = await Promise.all([
        fetch('/api/boss'),
        fetch('/api/player'),
      ]);
      if (bossRes.ok) {
        const data = await bossRes.json();
        setBoss(data.boss);
        setRanking(data.ranking);
      }
      if (playerRes.ok) {
        const pData = await playerRes.json();

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
    setIsAttacking(true);
    setSpinResults([]); // clear previous
    try {
      const res = await fetch('/api/boss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      
      if (res.ok) {
        // Show spins
        setSpinResults(data.spins);
        audioService.playSpinStart();
        
        // Wait for spin animation (5 items * 0.2s = 1s + some buffer)
        setTimeout(() => {
          audioService.playWin();
          setLastDamage(data.damage);
          toast.success(t('damageDealt', { damage: data.damage }));
          useGameStore.getState().syncPlayerStats({
            lumens: data.newLumens,
            energy: data.newEnergy,
            maxEnergy: useGameStore.getState().maxEnergy,
          });
          useGameStore.getState().triggerRefresh();
          fetchBoss();
          setIsAttacking(false);
        }, 1500);

      } else {
        audioService.playError();
        toast.error(data.error);
        setIsAttacking(false);
      }
    } catch (err) {
      toast.error('Error de conexión');
      setIsAttacking(false);
    }
  };

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
    <div className="space-y-4">
      {/* Header with Help Button */}
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="icon" onClick={() => setShowHelpDialog(true)} className="h-8 w-8 rounded-full bg-card/50 border border-border/30 text-muted-foreground hover:text-foreground">
          <span className="font-bold font-serif">?</span>
        </Button>
      </div>

      {/* Boss Card with Image */}
      <div className="rounded-2xl border border-lumora-purple/30 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 z-0" />
        
        {/* Boss Image with Breathing Animation */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full h-48 relative z-0 flex items-center justify-center pt-4"
        >
          <img 
            src={`/assets/bosses/boss_${boss.element}.png`} 
            onError={(e) => { e.currentTarget.src = '/assets/bosses/boss_void.png'; }}
            alt={boss.name}
            className="h-full object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          />
        </motion.div>

        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-lumora-purple" />
              <h3 className="font-fantasy font-bold text-lumora-purple text-lg">{boss.name}</h3>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full bg-background/50 border border-border/30 ${ELEMENT_COLORS[boss.element]}`}>{boss.element.toUpperCase()}</span>
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
      <div className="rounded-2xl border border-border/20 bg-card/40 p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold text-muted-foreground">Giros de Combate (5)</p>
          <span className="text-xs font-bold text-lumora-blue bg-lumora-blue/10 px-2 py-1 rounded-full border border-lumora-blue/20">Coste: 10 ⚡</span>
        </div>
        
        {/* Slot Machine Visualization - Bandeja de Invocación */}
        <div className="flex justify-center gap-2 mb-6 h-20 bg-black/60 border-2 border-red-500/40 rounded-xl items-center shadow-[inset_0_0_20px_rgba(239,68,68,0.15)] relative mt-2">
          <div className="absolute -top-3 px-2 bg-black text-[10px] text-red-400 font-bold rounded-full border border-red-500/40 uppercase tracking-wider">
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
                <img src={`/assets/symbols/sym_${element}_rare.png`} alt={element} className="w-8 h-8 object-contain" />
              </motion.div>
            ))
          ) : (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="w-12 h-12 rounded-xl border-2 border-border/20 bg-background/30 flex items-center justify-center opacity-50">
                <span className="text-lg text-muted-foreground/30">?</span>
              </div>
            ))
          )}
        </div>

        <Button
          onClick={handleAttack}
          disabled={isAttacking}
          className="w-full rounded-xl bg-gradient-to-r from-lumora-purple to-lumora-pink hover:from-lumora-purple/90 hover:to-lumora-pink/90 text-white font-bold h-12 text-lg shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
        >
          {isAttacking && spinResults.length === 0 ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Zap className="h-5 w-5" />
            </motion.div>
          ) : (
            <>
              <Swords className="h-5 w-5 mr-2" />
              ¡Atacar!
            </>
          )}
        </Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border/30 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="font-fantasy font-bold text-lg mb-2">Jefes de Mundo</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              El combate contra los Jefes de Mundo utiliza <strong className="text-lumora-gold">5 Giros de Combate</strong>. 
              Gira para obtener símbolos elementales y maximizar tu daño aprovechando la debilidad del Jefe.
            </p>
            <Button onClick={() => setShowHelpDialog(false)} className="w-full rounded-xl bg-lumora-purple text-white font-bold">
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
