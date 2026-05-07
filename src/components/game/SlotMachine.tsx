'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, RotateCcw, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { BonusGame } from '@/components/game/BonusGame';
import { useGameStore } from '@/lib/store';

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

// Random symbols for spinning animation
const SPIN_EMOJIS = ['🔥', '💧', '🌙', '🌿', '⭐', '💎', '🍄', '🪷', '🌀', '🌱', '🜂', '🌊', '💫', '🌳', '🌟', '🦅', '🧜', '🍀', '💍'];

export function SlotMachine() {
  const t = useTranslations('spins');
  const tBonus = useTranslations('bonus');
  const { data: session } = useSession();
  const router = useRouter();

  // Game state
  const [isSpinning, setIsSpinning] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [grid, setGrid] = useState<GridSymbol[][] | null>(null);
  const [spinningGrid, setSpinningGrid] = useState<string[][]>([]);
  const [showWin, setShowWin] = useState(false);
  const [showSpiritReward, setShowSpiritReward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lumens, setLumens] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [maxEnergy, setMaxEnergy] = useState(100);
  const [spinCount, setSpinCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [reelsStopped, setReelsStopped] = useState<boolean[]>([false, false, false, false, false]);

  // Bonus game state
  const [showBonusTrigger, setShowBonusTrigger] = useState(false);
  const [showBonusGame, setShowBonusGame] = useState(false);
  const [bonusCount, setBonusCount] = useState(3);

  const autoSpinRef = useRef(false);

  // Initialize spinning grid with random emojis
  const initSpinningGrid = useCallback(() => {
    const newGrid: string[][] = [];
    for (let col = 0; col < 5; col++) {
      const column: string[] = [];
      for (let row = 0; row < 4; row++) {
        column.push(SPIN_EMOJIS[Math.floor(Math.random() * SPIN_EMOJIS.length)]);
      }
      newGrid.push(column);
    }
    return newGrid;
  }, []);

  // Fetch current player data on mount
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
      } catch (err) {
        console.error('Failed to fetch player data:', err);
        toast.error('Error al cargar datos del jugador');
      }
    };
    if (session?.user) fetchPlayer();
  }, [session]);

  // Execute spin
  const doSpin = useCallback(async () => {
    if (isSpinning) return;
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    setIsSpinning(true);
    setShowWin(false);
    setShowSpiritReward(false);
    setShowBonusTrigger(false);
    setError(null);
    setReelsStopped([false, false, false, false, false]);

    // Start spinning animation
    setSpinningGrid(initSpinningGrid());
    setGrid(null);

    // Spin animation interval
    const spinInterval = setInterval(() => {
      setSpinningGrid(initSpinningGrid());
    }, 80);

    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al girar');
        clearInterval(spinInterval);
        setIsSpinning(false);
        setAutoSpin(false);
        autoSpinRef.current = false;
        return;
      }

      const spinResult: SpinResult = data;

      // Stop reels one by one with delay (cascading effect)
      clearInterval(spinInterval);

      // Reveal columns one at a time
      for (let col = 0; col < 5; col++) {
        setTimeout(() => {
          setReelsStopped(prev => {
            const next = [...prev];
            next[col] = true;
            return next;
          });
        }, 300 + col * 250);
      }

      // Set final grid after all reels stopped
      setTimeout(() => {
        setGrid(spinResult.grid);
        setResult(spinResult);
        setLumens(spinResult.player.lumens);
        setEnergy(spinResult.player.energy);
        setMaxEnergy(spinResult.player.maxEnergy);
        setSpinCount(prev => prev + 1);
        setIsSpinning(false);
        useGameStore.getState().triggerRefresh();

        // Check for bonus trigger FIRST (takes priority over other overlays)
        if (spinResult.bonusTriggered) {
          // Stop auto-spin when bonus triggers
          setAutoSpin(false);
          autoSpinRef.current = false;
          // Show bonus trigger overlay after a short delay
          setTimeout(() => setShowBonusTrigger(true), 300);
        } else {
          // Show win animation
          if (spinResult.totalPayout > 0) {
            setTimeout(() => setShowWin(true), 200);
            setTimeout(() => setShowWin(false), 3000);
          }

          // Show spirit reward
          if (spinResult.spiritsWon.length > 0) {
            setTimeout(() => setShowSpiritReward(true), 1500);
            setTimeout(() => setShowSpiritReward(false), 4500);
          }
        }
      }, 300 + 5 * 250 + 200);

    } catch (err) {
      setError('Error de conexión');
      toast.error('Error de conexión');
      clearInterval(spinInterval);
      setIsSpinning(false);
      setAutoSpin(false);
      autoSpinRef.current = false;
    }
  }, [isSpinning, session, router, initSpinningGrid]);

  // Auto-spin logic
  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    if (!autoSpin || isSpinning || showBonusTrigger || showBonusGame) return;

    const timer = setTimeout(() => {
      if (autoSpinRef.current) {
        doSpin();
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [autoSpin, isSpinning, doSpin, spinCount, showBonusTrigger, showBonusGame]);

  // Handle bonus game open
  const handleOpenBonus = () => {
    setShowBonusTrigger(false);
    if (result?.bonusCount) {
      setBonusCount(result.bonusCount);
    }
    setShowBonusGame(true);
  };

  // Handle bonus game complete
  const handleBonusComplete = (bonusResults: {
    totalLumens: number;
    totalEnergy: number;
    spiritsWon: any[];
    player: { lumens: number; energy: number; maxEnergy: number; level: number; experience: number };
  }) => {
    setShowBonusGame(false);
    // Update player stats from bonus results
    if (bonusResults.player) {
      setLumens(bonusResults.player.lumens);
      setEnergy(bonusResults.player.energy);
      setMaxEnergy(bonusResults.player.maxEnergy);
    }
    useGameStore.getState().triggerRefresh();
  };

  // Render a single reel cell
  const renderCell = (col: number, row: number) => {
    const reelStopped = reelsStopped[col];

    if (reelStopped && grid && grid[col]) {
      const sym = grid[col][row];
      const isWinPosition = result?.wins.some(w =>
        w.positions.some(p => p.col === col && p.row === row)
      );
      const isBonusSymbol = sym.symbolType === 'bonus';

      return (
        <motion.div
          key={`result-${col}-${row}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: isWinPosition ? [1, 1.15, 1] : isBonusSymbol && result?.bonusTriggered ? [1, 1.2, 1] : 1,
            opacity: 1,
          }}
          transition={{
            scale: isWinPosition || (isBonusSymbol && result?.bonusTriggered) ? { duration: 0.6, repeat: Infinity } : { duration: 0.3 },
          }}
          className={`w-full h-full flex items-center justify-center rounded-xl text-2xl sm:text-3xl
            ${isWinPosition ? 'bg-lumora-gold/15 ring-2 ring-lumora-gold/50' : isBonusSymbol && result?.bonusTriggered ? 'bg-lumora-emerald/20 ring-2 ring-lumora-emerald/50' : 'bg-card/40'}
            border ${isWinPosition ? 'border-lumora-gold/30' : isBonusSymbol && result?.bonusTriggered ? 'border-lumora-emerald/30' : 'border-border/20'}`}
          style={isWinPosition ? { boxShadow: `0 0 15px ${sym.glowColor}40` } : isBonusSymbol && result?.bonusTriggered ? { boxShadow: '0 0 15px rgba(46, 204, 113, 0.4)' } : {}}
        >
          {sym.emoji}
        </motion.div>
      );
    }

    // Spinning state
    return (
      <div className="w-full h-full flex items-center justify-center rounded-xl bg-card/30 border border-border/10 text-2xl sm:text-3xl animate-pulse">
        {spinningGrid[col]?.[row] || '✨'}
      </div>
    );
  };

  const energyPercent = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;

  return (
    <div className="relative flex flex-col items-center w-full max-w-lg mx-auto">
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
        {/* Energy bar */}
        <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-lumora-blue to-lumora-purple rounded-full"
            animate={{ width: `${energyPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Slot Machine Grid: 5×4 */}
      <div className="relative w-full mb-6">
        {/* Machine frame */}
        <div className="rounded-2xl border-2 border-lumora-purple/30 bg-gradient-to-b from-card/60 to-background/80 p-3 backdrop-blur-sm shadow-xl">
          {/* Win lines indicator (decorative) */}
          <div className="flex justify-between px-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-lumora-gold/30" />
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 4 }).map((_, row) =>
              Array.from({ length: 5 }).map((_, col) => (
                <div
                  key={`${col}-${row}`}
                  className="aspect-square w-full"
                >
                  {renderCell(col, row)}
                </div>
              ))
            )}
          </div>

          {/* Decorative bottom line */}
          <div className="flex justify-between px-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-lumora-gold/30" />
            ))}
          </div>
        </div>

        {/* Bonus Trigger Overlay */}
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
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(46, 204, 113, 0.3)',
                    '0 0 40px rgba(46, 204, 113, 0.5)',
                    '0 0 20px rgba(46, 204, 113, 0.3)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-4xl mb-2"
                >
                  🌱
                </motion.div>
                <p className="text-2xl font-bold bg-gradient-to-r from-lumora-gold to-lumora-emerald bg-clip-text text-transparent font-fantasy">
                  ¡Bonus Game!
                </p>
                <p className="text-sm text-lumora-emerald mt-1">
                  {result.bonusCount}x {tBonus('title')}
                </p>
                <motion.p
                  className="text-xs text-muted-foreground mt-3"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Toca para jugar
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win overlay */}
        <AnimatePresence>
          {showWin && result && result.totalPayout > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className={`px-6 py-3 rounded-2xl backdrop-blur-md border-2 text-center ${
                result.isMegaWin
                  ? 'bg-lumora-gold/20 border-lumora-gold/50 animate-lumora-pulse'
                  : result.isBigWin
                  ? 'bg-lumora-pink/20 border-lumora-pink/50'
                  : 'bg-lumora-purple/20 border-lumora-purple/50'
              }`}>
                <p className={`text-lg font-fantasy font-bold ${
                  result.isMegaWin ? 'text-lumora-gold' : result.isBigWin ? 'text-lumora-pink' : 'text-lumora-purple'
                }`}>
                  {result.isMegaWin ? 'MEGA GANANCIA!' : result.isBigWin ? 'GRAN GANANCIA!' : t('win')}
                </p>
                <p className="text-2xl font-bold text-white">
                  +{result.totalPayout} ✨
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spirit reward overlay */}
        <AnimatePresence>
          {showSpiritReward && result && result.spiritsWon.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <div className="px-6 py-4 rounded-2xl bg-lumora-emerald/20 border-2 border-lumora-emerald/50 backdrop-blur-md text-center">
                <Sparkles className="h-6 w-6 text-lumora-emerald mx-auto mb-2" />
                <p className="text-sm font-fantasy font-bold text-lumora-emerald mb-1">
                  ¡Espíritu conseguido!
                </p>
                {result.spiritsWon.map((spirit, i) => (
                  <p key={i} className="text-lg font-bold text-white">
                    {spirit.name}
                    <span className="ml-2 text-xs text-lumora-gold capitalize">
                      {spirit.rarity}
                    </span>
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center"
        >
          {error}
        </motion.div>
      )}

      {/* Win details (persistent) */}
      {result && result.wins.length > 0 && !isSpinning && !showBonusTrigger && !showBonusGame && (
        <div className="w-full mb-4 px-2">
          <div className="flex flex-wrap gap-2">
            {result.wins.map((win, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/60 border border-border/30 text-xs"
              >
                <span className="text-base">{win.symbolEmoji}</span>
                <span className="font-semibold">{win.count}×</span>
                <span className="text-lumora-gold font-bold">+{win.payout}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        {/* Auto-spin toggle */}
        <Button
          variant={autoSpin ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setAutoSpin(!autoSpin);
            if (autoSpin) autoSpinRef.current = false;
          }}
          className={`rounded-xl gap-1.5 ${
            autoSpin
              ? 'bg-lumora-blue text-white hover:bg-lumora-blue/80'
              : 'border-border/50'
          }`}
          disabled={isSpinning && !autoSpin}
        >
          {autoSpin ? <Square className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
          {autoSpin ? t('stop') : t('autoSpin')}
        </Button>

        {/* Main Spin Button */}
        <motion.button
          onClick={doSpin}
          disabled={isSpinning || energy < 5}
          className="relative group"
          whileHover={{ scale: isSpinning ? 1 : 1.05 }}
          whileTap={{ scale: isSpinning ? 1 : 0.95 }}
        >
          <div className={`absolute -inset-1.5 rounded-full blur-lg transition-opacity ${
            isSpinning ? 'opacity-30' : 'opacity-60 group-hover:opacity-80'
          } bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple`} />
          <div className={`relative flex items-center gap-2 rounded-full px-8 py-3.5 font-fantasy font-bold text-lg text-white shadow-xl transition-all ${
            isSpinning
              ? 'bg-muted cursor-not-allowed'
              : energy < 5
              ? 'bg-muted/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple'
          }`}>
            {isSpinning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
            ) : (
              <Play className="h-5 w-5" />
            )}
            {isSpinning ? 'Girando...' : t('spin')}
          </div>
        </motion.button>

        {/* Mute toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="rounded-xl h-9 w-9"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Spin cost info */}
      <p className="text-xs text-muted-foreground">
        Coste: 5 energía por giro · 1 energía cada 5 min
      </p>

      {/* Bonus Game Full-Screen Overlay */}
      <AnimatePresence>
        {showBonusGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <BonusGame
              bonusCount={bonusCount}
              onComplete={handleBonusComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
