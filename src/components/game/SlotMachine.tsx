'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, RotateCcw, Play, Square, Volume2, VolumeX, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { BonusGame } from '@/components/game/BonusGame';
import { SymbolIcon } from '@/components/game/SymbolIcon';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';
import { EnergyRefillDialog } from './EnergyRefillDialog';
import { RewardedVideoAd } from '@/components/ads/RewardedVideoAd';
import confetti from 'canvas-confetti';
import { SYMBOLS } from '@/game/engine/symbols';

interface GridSymbol {
  id: string;
  name: string;
  nameEn: string;
  element: string;
  rarity: string;
  symbolType: string;
  emoji: string;
  color: string;
  glowColor: string;
}

interface WinInfo {
  symbolId: string;
  symbolName: string;
  symbolEmoji: string;
  element: string;
  positions: { col: number; row: number }[];
  count: number;
  payout: number;
  isWild: boolean;
}

interface SpiritReward {
  spiritTypeId: string;
  element: string;
  rarity: string;
  name: string;
  nameEn: string;
}

interface SpinResult {
  grid: GridSymbol[][];
  wins: WinInfo[];
  totalPayout: number;
  isBigWin: boolean;
  isMegaWin: boolean;
  spiritsWon: SpiritReward[];
  elementContributions: Record<string, number>;
  bonusTriggered?: boolean;
  bonusCount?: number;
  player: {
    lumens: number;
    energy: number;
    maxEnergy: number;
    level: number;
    experience: number;
  };
}

// ─── Count-up hook ────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || target === 0) { setValue(target); return; }
    setValue(0);
    const steps = 40;
    const increment = target / steps;
    const delay = duration / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) { setValue(target); clearInterval(interval); }
      else setValue(Math.floor(current));
    }, delay);
    return () => clearInterval(interval);
  }, [target, duration, active]);
  return value;
}

// ─── Confetti helpers ─────────────────────────────────────────────
function fireBigWin() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { x: 0.5, y: 0.8 },
    colors: ['#FFD700', '#FFC107', '#FF8C00', '#FFE082'],
    gravity: 1.2,
    scalar: 1.1,
  });
}

function fireMegaWin() {
  const duration = 3000;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({ particleCount: 8, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#FFD700', '#FF69B4', '#9B59B6'] });
    confetti({ particleCount: 8, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#FFD700', '#FF69B4', '#5DADE2'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function fireNormalWin() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    colors: ['#FFE082', '#FF69B4', '#5DADE2']
  });
}

// ─── Symbols available for idle/spin display (exclude bonus/wild from spin strip) ───
const SPIN_SYMBOLS = SYMBOLS.filter(s => s.symbolType !== 'bonus' && s.symbolType !== 'wild');

// Pick a random symbol weighted by rarity weight
function weightedRandomSymbol(): typeof SYMBOLS[0] {
  const total = SPIN_SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * total;
  for (const sym of SPIN_SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SPIN_SYMBOLS[0];
}

// Build a random 5×4 grid of real symbols (for idle/initial state)
function generateRandomGrid(): GridSymbol[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 4 }, () => {
      const s = weightedRandomSymbol();
      return {
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        element: s.element,
        rarity: s.rarity,
        symbolType: s.symbolType,
        emoji: s.emoji,
        color: s.color,
        glowColor: s.glowColor,
      } as GridSymbol;
    })
  );
}

// A fixed strip of symbol ids used for the scroll animation column
const SPIN_STRIP_IDS: string[][] = Array.from({ length: 5 }, (_, col) =>
  Array.from({ length: 8 }, (__, i) => SPIN_SYMBOLS[(col * 3 + i) % SPIN_SYMBOLS.length].id)
);

// ─── Decorative corner diamond SVG ───────────────────────────────
function CornerDiamond({ flip = false }: { flip?: boolean }) {
  return (
    <motion.svg
      width="28" height="28" viewBox="0 0 28 28"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        <radialGradient id="cd-grad">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#9B59B6" />
        </radialGradient>
      </defs>
      <polygon points="14,2 24,14 14,26 4,14" fill="url(#cd-grad)" opacity="0.85" />
      <polygon points="14,6 20,14 14,22 8,14" fill="none" stroke="#FFFDE7" strokeWidth="0.8" opacity="0.5" />
      <circle cx="14" cy="14" r="2.5" fill="#FFFDE7" opacity="0.7" />
    </motion.svg>
  );
}

// ─── Main component ───────────────────────────────────────────────
export function SlotMachine() {
  const t = useTranslations('spins');
  const tBonus = useTranslations('bonus');
  const { data: session } = useSession();
  const router = useRouter();

  const [isSpinning, setIsSpinning] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  // Start with a random static grid so the machine looks alive immediately
  const [grid, setGrid] = useState<GridSymbol[][] | null>(null);

  useEffect(() => {
    setGrid(generateRandomGrid());
  }, []);
  const [showWin, setShowWin] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showSpiritReward, setShowSpiritReward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lumens, setLumens] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [maxEnergy, setMaxEnergy] = useState(100);
  const [spinCount, setSpinCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  // All reels start as 'stopped' so the initial grid renders without animation
  const [reelsStopped, setReelsStopped] = useState<boolean[]>([true, true, true, true, true]);
  // Dedicated Set for win positions — 'col,row' strings — updated atomically with result
  const [winPositions, setWinPositions] = useState<Set<string>>(new Set());

  // Bonus game state
  const [showBonusTrigger, setShowBonusTrigger] = useState(false);
  const [showBonusGame, setShowBonusGame] = useState(false);
  const [bonusCount, setBonusCount] = useState(3);

  // Payout for count-up animation
  const [countUpTarget, setCountUpTarget] = useState(0);
  const [countUpActive, setCountUpActive] = useState(false);
  const displayedPayout = useCountUp(countUpTarget, 1200, countUpActive);

  // Ads
  const [showAd, setShowAd] = useState(false);
  const [adRewardType, setAdRewardType] = useState<'energy' | 'free_spin'>('energy');
  const [showEnergyDialog, setShowEnergyDialog] = useState(false);

  const autoSpinRef = useRef(false);

  // Fetch player data
  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await fetch('/api/player');
        if (res.ok) {
          const data = await res.json();
          setLumens(data.lumens);
          setEnergy(data.energy);
          setMaxEnergy(data.maxEnergy);
        }
      } catch {
        toast.error('Error al cargar datos del jugador');
      }
    };
    if (session?.user) fetchPlayer();
  }, [session]);

  const handleAdReward = async () => {
    try {
      const res = await fetch('/api/ads/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardType: adRewardType })
      });
      if (res.ok) {
        const data = await res.json();
        setEnergy(data.newEnergy);
        useGameStore.getState().syncPlayerStats({
          lumens,
          energy: data.newEnergy,
          maxEnergy: data.maxEnergy
        });
        useGameStore.getState().triggerRefresh();
        toast.success(adRewardType === 'energy' ? '¡+25 Energía obtenida!' : '¡Giro Onírico obtenido!');
        if (adRewardType === 'free_spin') {
          doSpin(); // Auto trigger spin after watching ad for free spin
        }
      }
    } catch (err) {
      toast.error('Error al reclamar recompensa');
    }
  };

  // ─── Execute spin ─────────────────────────────────────────────
  const doSpin = useCallback(async () => {
    if (isSpinning) return;
    if (!session?.user) { router.push('/auth/login'); return; }

    setIsSpinning(true);
    audioService.playSpinStart();
    setShowWin(false);
    setShowSpiritReward(false);
    setShowBonusTrigger(false);
    setError(null);
    setCountUpActive(false);
    setResult(null);
    setWinPositions(new Set());
    // Clear the grid and mark all reels as spinning
    setGrid(null);
    setReelsStopped([false, false, false, false, false]);

    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'Energía insuficiente') {
          setShowEnergyDialog(true);
        } else {
          setError(data.error || 'Error al girar');
        }
        setIsSpinning(false);
        setAutoSpin(false);
        autoSpinRef.current = false;
        return;
      }

      const spinResult: SpinResult = data;

      // Set the result grid IMMEDIATELY so each reel can reveal its symbol as it stops
      setGrid(spinResult.grid);

      // Stop reels one by one with escalating delay — creates tension
      for (let col = 0; col < 5; col++) {
        setTimeout(() => {
          audioService.playReelStop();
          setReelsStopped(prev => {
            const next = [...prev];
            next[col] = true;
            return next;
          });
        }, 400 + col * 450);
      }

      // After last reel stops — update stats and show win animations
      const totalDelay = 400 + 5 * 450 + 200;
      setTimeout(() => {
        setResult(spinResult);
        
        // Nueva lógica: Recolectamos TODAS las posiciones que deben brillar
        const positions = new Set<string>();

        // 1. Añadir posiciones de líneas de pago (Lumens por combinaciones)
        spinResult.wins.forEach(w => 
          w.positions.forEach(p => positions.add(`${p.col},${p.row}`))
        );

        // 2. Añadir posiciones por Espíritus ganados (3+ de un elemento)
        if (spinResult.spiritsWon.length > 0) {
          const wonElements = new Set(spinResult.spiritsWon.map(s => s.element));
          spinResult.grid.forEach((col, colIdx) => {
            col.forEach((sym, rowIdx) => {
              if (wonElements.has(sym.element)) {
                positions.add(`${colIdx},${rowIdx}`);
              }
            });
          });
        }

        // 3. Añadir posiciones por Surge Elemental (los +10 Lumens que viste)
        // Buscamos si algún elemento tiene 6 o más símbolos
        const elementCounts: Record<string, number> = {};
        spinResult.grid.forEach(col => col.forEach(s => {
            elementCounts[s.element] = (elementCounts[s.element] || 0) + 1;
        }));

        Object.entries(elementCounts).forEach(([element, count]) => {
          if (count >= 6) {
            spinResult.grid.forEach((col, colIdx) => {
              col.forEach((sym, rowIdx) => {
                if (sym.element === element) positions.add(`${colIdx},${rowIdx}`);
              });
            });
          }
        });

        setWinPositions(positions);
        
        if (positions.size > 0) {
          const isSurge = Object.values(elementCounts).some(count => count >= 6);
          if (isSurge) {
            audioService.playSurge();
          } else {
            audioService.playWin();
          }
        }
        
        setLumens(spinResult.player.lumens);
        setEnergy(spinResult.player.energy);
        setMaxEnergy(spinResult.player.maxEnergy);
        setSpinCount(prev => prev + 1);
        setIsSpinning(false);

        useGameStore.getState().syncPlayerStats({
          lumens: spinResult.player.lumens,
          energy: spinResult.player.energy,
          maxEnergy: spinResult.player.maxEnergy,
          level: spinResult.player.level,
          experience: spinResult.player.experience,
        });
        useGameStore.getState().triggerRefresh();
        window.dispatchEvent(new Event('player-update'));

        if (spinResult.bonusTriggered) {
          setAutoSpin(false);
          autoSpinRef.current = false;
          setTimeout(() => setShowBonusTrigger(true), 300);
          return;
        }

        // Show win popup
        if (spinResult.totalPayout > 0) {
          setCountUpTarget(spinResult.totalPayout);
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 400); // Stop shaking after 400ms

          setTimeout(() => {
            setShowWin(true);
            setCountUpActive(true);
            if (spinResult.isMegaWin) fireMegaWin();
            else if (spinResult.isBigWin) fireBigWin();
            else fireNormalWin();
          }, 200);
          if (spinResult.spiritsWon.length > 0) {
            setTimeout(() => { setShowWin(false); setCountUpActive(false); }, 3200);
            setTimeout(() => setShowSpiritReward(true), 3600);
            setTimeout(() => setShowSpiritReward(false), 6600);
          } else {
            setTimeout(() => { setShowWin(false); setCountUpActive(false); }, 3200);
          }
        } else if (spinResult.spiritsWon.length > 0) {
          setTimeout(() => setShowSpiritReward(true), 300);
          setTimeout(() => setShowSpiritReward(false), 3300);
        }
      }, totalDelay);

    } catch {
      setError('Error de conexión');
      toast.error('Error de conexión');
      setIsSpinning(false);
      setAutoSpin(false);
      autoSpinRef.current = false;
    }
  }, [isSpinning, session, router]);

  useEffect(() => { autoSpinRef.current = autoSpin; }, [autoSpin]);

  useEffect(() => {
    if (!autoSpin || isSpinning || showBonusTrigger || showBonusGame) return;
    const timer = setTimeout(() => { if (autoSpinRef.current) doSpin(); }, 1200);
    return () => clearTimeout(timer);
  }, [autoSpin, isSpinning, doSpin, spinCount, showBonusTrigger, showBonusGame]);

  const handleOpenBonus = () => {
    setShowBonusTrigger(false);
    if (result?.bonusCount) setBonusCount(result.bonusCount);
    setShowBonusGame(true);
  };

  const handleBonusComplete = (bonusResults: {
    totalLumens: number;
    totalEnergy: number;
    spiritsWon: any[];
    player: { lumens: number; energy: number; maxEnergy: number; level: number; experience: number };
  }) => {
    setShowBonusGame(false);
    if (bonusResults.player) {
      setLumens(bonusResults.player.lumens);
      setEnergy(bonusResults.player.energy);
      setMaxEnergy(bonusResults.player.maxEnergy);
      useGameStore.getState().syncPlayerStats(bonusResults.player);
      useGameStore.getState().triggerRefresh();
    }
  };

  // ─── Render cell ── Altar de Obsidianas ───────────────────────
  const renderCell = (col: number, row: number) => {
    if (!grid) {
      return (
        <div key={`empty-${col}-${row}`} className="w-full h-full rounded-lg slot-cell-altar" />
      );
    }

    const reelStopped = reelsStopped[col];

    if (reelStopped && grid && grid[col]) {
      const sym = grid[col][row];
      const isWinPosition = winPositions.has(`${col},${row}`);
      const isBonusSymbol = sym.symbolType === 'bonus';
      const isActiveBonus = isBonusSymbol && !!result?.bonusTriggered;

      return (
        <motion.div
          key={`result-${col}-${row}`}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 14 }}
          className={`w-full h-full rounded-lg overflow-hidden slot-cell-altar relative ${isWinPosition ? 'is-winning' : ''}`}
          style={isWinPosition ? {
            border: `2px solid ${sym.glowColor}`,
            boxShadow: `inset 0 0 12px ${sym.glowColor}90, 0 0 20px ${sym.glowColor}80`,
          } : isActiveBonus ? {
            border: '2px solid #2ECC71',
            boxShadow: 'inset 0 0 12px #2ECC7190, 0 0 20px #2ECC7180',
          } : {}}
        >
          <SymbolIcon symbol={sym} isWin={!!isWinPosition} isBonus={isActiveBonus} />
        </motion.div>
      );
    }

    // Spinning state — obsidian tile with scrolling PNG strip
    const stripIds = SPIN_STRIP_IDS[col];
    return (
      <div
        key={`spin-${col}-${row}`}
        className="w-full h-full rounded-lg overflow-hidden slot-cell-altar relative"
      >
        <motion.div
          className="flex flex-col absolute w-full"
          style={{ gap: 0, filter: 'blur(3px)' }}
          animate={{ y: [0, -52 * stripIds.length] }}
          transition={{ duration: 0.3 + col * 0.05, repeat: Infinity, ease: 'linear' }}
        >
          {[...stripIds, ...stripIds].map((id, i) => (
            <div key={i} style={{ width: '100%', height: 52, flexShrink: 0 }}>
              <img
                src={`/assets/symbols/${id}.png`}
                alt=""
                className="w-full h-full object-contain pointer-events-none select-none"
                style={{ opacity: 0.65, filter: 'blur(0.8px)' }}
              />
            </div>
          ))}
        </motion.div>
      </div>
    );
  };

  const energyPercent = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;

  // Win label
  const winLabel = result?.isMegaWin ? 'MEGA GANANCIA!' : result?.isBigWin ? 'GRAN GANANCIA!' : t('win');
  const winColor = result?.isMegaWin ? 'text-lumora-gold' : result?.isBigWin ? 'text-lumora-pink' : 'text-lumora-purple';
  const winBorder = result?.isMegaWin ? 'border-lumora-gold/50 animate-lumora-pulse' : result?.isBigWin ? 'border-lumora-pink/40' : 'border-lumora-purple/40';

  return (
    <motion.div 
      className="relative flex flex-col items-center w-full max-w-lg mx-auto"
      animate={isShaking ? { x: [-5, 5, -5, 5, -2, 2, 0], y: [-2, 2, -2, 2, -1, 1, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* Header: Energy bar */}
      <div className="w-full mb-4 px-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lumora-gold" />
            <span className="text-sm font-semibold text-lumora-gold">{lumens.toLocaleString()} Lumens</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-lumora-blue" />
            <span className="text-sm font-semibold text-lumora-blue">{energy}/{maxEnergy}</span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-muted/20 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className="h-full rounded-full bar-animated"
            style={{ background: 'linear-gradient(90deg, #5DADE2, #9B59B6, #FF69B4, #5DADE2)', backgroundSize: '200% 100%' }}
            animate={{ width: `${energyPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Slot Machine Grid */}
      <div className="relative w-full mb-6">

        {/* ── Altar de Lumora frame ── */}
        <div 
          className="slot-machine-frame-altar p-3 relative bg-cover bg-center rounded-2xl overflow-hidden shadow-2xl" 
          style={{ backgroundImage: 'url(/assets/backgrounds/bg_slot_altar.png)' }}
        >
          {/* Dark overlay for better contrast */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-0" />
          
          <div className="relative z-10">

          {/* Corner decorations */}
          <div className="absolute -top-3 -left-3 z-10"><CornerDiamond /></div>
          <div className="absolute -top-3 -right-3 z-10"><CornerDiamond flip /></div>
          <div className="absolute -bottom-3 -left-3 z-10 rotate-180"><CornerDiamond flip /></div>
          <div className="absolute -bottom-3 -right-3 z-10 rotate-180"><CornerDiamond /></div>

          {/* Top rune dots */}
          <div className="flex justify-between px-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-lumora-gold"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>

          {/* Grid — Arcane Chassis */}
          <div className="rounded-2xl border-4 border-lumora-gold/30 bg-gradient-to-b from-gray-900 via-black to-gray-950 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,215,0,0.1)]">
            {/* Inner bevel */}
            <div className="rounded-xl border border-lumora-purple/20 bg-black/40 p-1.5 overflow-hidden">
              <div className="grid grid-cols-5 gap-0">
                {Array.from({ length: 5 }).map((_, col) => (
                  <div key={col} className="flex flex-col gap-1.5 relative">
                    {/* Column separator */}
                    {col > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-lumora-gold/15 to-transparent z-10" />
                    )}
                    {Array.from({ length: 4 }).map((_, row) => (
                      <div key={`${col}-${row}`} className="aspect-square w-full px-0.5">
                        {renderCell(col, row)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom rune dots */}
          <div className="flex justify-between px-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-lumora-purple"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 + 0.9 }}
              />
            ))}
          </div>
          </div>
        </div>

        {/* ── Bonus Trigger Overlay ── */}
        <AnimatePresence>
          {showBonusTrigger && result?.bonusTriggered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-40 cursor-pointer"
              onClick={handleOpenBonus}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl" />
              <motion.div
                className="relative px-8 py-6 rounded-2xl bg-gradient-to-b from-lumora-emerald/30 to-lumora-gold/20 border-2 border-lumora-emerald/50 backdrop-blur-md text-center"
                animate={{ boxShadow: ['0 0 20px rgba(46,204,113,0.3)', '0 0 40px rgba(46,204,113,0.5)', '0 0 20px rgba(46,204,113,0.3)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-4xl mb-2">🌱</motion.div>
                <p className="text-2xl font-bold bg-gradient-to-r from-lumora-gold to-lumora-emerald bg-clip-text text-transparent font-fantasy">¡Bonus Game!</p>
                <p className="text-sm text-lumora-emerald mt-1">{result.bonusCount}x {tBonus('title')}</p>
                <motion.p className="text-xs text-muted-foreground mt-3" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  Toca para jugar
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Win overlay — anchored TOP of grid ── */}
        <AnimatePresence>
          {showWin && result && result.totalPayout > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -24, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none z-20 px-4"
            >
              <div className={`px-6 py-3 rounded-2xl backdrop-blur-md border-2 text-center glass-card ${winBorder}`}>
                <p className={`text-base font-fantasy font-bold tracking-wide ${winColor}`}>{winLabel}</p>
                <motion.p
                  className="text-2xl font-bold text-white mt-0.5"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                >
                  +{displayedPayout.toLocaleString()} ✨
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Spirit reward overlay — anchored BOTTOM of grid ── */}
        <AnimatePresence>
          {showSpiritReward && result && result.spiritsWon.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20 }}
              className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-30 px-4"
            >
              <div className="px-6 py-4 rounded-2xl glass-card border-2 border-lumora-emerald/40 text-center">
                <Sparkles className="h-6 w-6 text-lumora-emerald mx-auto mb-2" />
                <p className="text-sm font-fantasy font-bold text-lumora-emerald mb-1">¡Espíritu conseguido!</p>
                {result.spiritsWon.map((spirit, i) => (
                  <p key={i} className="text-lg font-bold text-white">
                    {spirit.name}
                    <span className="ml-2 text-xs text-lumora-gold capitalize">{spirit.rarity}</span>
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center">
          {error}
        </motion.div>
      )}

      {/* Win details (persistent) */}
      {result && result.wins.length > 0 && !isSpinning && !showBonusTrigger && !showBonusGame && (
        <div className="w-full mb-4 px-2">
          <div className="flex flex-wrap gap-2">
            {result.wins.map((win, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card-subtle text-xs">
                <span className="font-semibold">{win.count}×</span>
                <span className="text-lumora-gold font-bold">+{win.payout}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant={autoSpin ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setAutoSpin(!autoSpin); if (autoSpin) autoSpinRef.current = false; }}
          className={`rounded-xl gap-1.5 ${autoSpin ? 'bg-lumora-blue text-white hover:bg-lumora-blue/80' : 'border-border/50'}`}
          disabled={isSpinning && !autoSpin}
        >
          {autoSpin ? <Square className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
          {autoSpin ? t('stop') : t('autoSpin')}
        </Button>

        <motion.button
          onClick={doSpin}
          disabled={isSpinning || energy < 5}
          className="relative group"
          whileHover={{ scale: isSpinning ? 1 : 1.08 }}
          whileTap={{ scale: isSpinning ? 1 : 0.92 }}
        >
          <div className={`absolute -inset-2 rounded-full blur-xl transition-opacity duration-300 ${isSpinning ? 'opacity-20' : 'opacity-50 group-hover:opacity-80'} bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple`} />
          <div className={`relative flex items-center gap-2 rounded-full px-8 py-3.5 font-fantasy font-bold text-lg text-white shadow-xl transition-all ${isSpinning ? 'bg-muted cursor-not-allowed' : energy < 5 ? 'bg-muted/50 cursor-not-allowed' : 'btn-lumora'}`}>
            {isSpinning ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Sparkles className="h-5 w-5" />
              </motion.div>
            ) : <Play className="h-5 w-5" />}
            {isSpinning ? 'Girando...' : t('spin')}
          </div>
        </motion.button>

        <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="rounded-xl h-9 w-9">
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground">Coste: 5 energía por giro · 1 energía cada 5 min</p>
        
        {energy < 5 && !isSpinning && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => { setAdRewardType('energy'); setShowAd(true); }}
              className="rounded-xl border-lumora-blue/50 text-lumora-blue hover:bg-lumora-blue/10 bg-card/50 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            >
              <Video className="h-4 w-4 mr-1.5" /> Recargar Energía (+25⚡)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => { setAdRewardType('free_spin'); setShowAd(true); }}
              className="rounded-xl border-lumora-purple/50 text-lumora-purple hover:bg-lumora-purple/10 bg-card/50 backdrop-blur-sm shadow-[0_0_15px_rgba(168,85,247,0.15)]"
            >
              <Video className="h-4 w-4 mr-1.5" /> Giro Onírico Gratis
            </Button>
          </motion.div>
        )}
      </div>

      {/* Ads overlay */}
      <RewardedVideoAd
        isOpen={showAd}
        onClose={() => setShowAd(false)}
        onReward={handleAdReward}
        rewardText={adRewardType === 'energy' ? 'Energía' : 'Giro Libre'}
      />

      {/* Energy Recovery Dialog */}
      <EnergyRefillDialog 
        isOpen={showEnergyDialog} 
        onClose={() => setShowEnergyDialog(false)}
        onSuccess={() => {
          // Stats are synced via useGameStore in the dialog
          setEnergy(useGameStore.getState().energy);
          setLumens(useGameStore.getState().lumens);
        }}
      />

      {/* Bonus Game Full-Screen Overlay */}
      <AnimatePresence>
        {showBonusGame && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BonusGame bonusCount={bonusCount} onComplete={handleBonusComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}