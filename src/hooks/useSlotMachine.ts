'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';

export interface GridSymbol {
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

export interface WinInfo {
  symbolId: string;
  symbolName: string;
  symbolEmoji: string;
  element: string;
  positions: { col: number; row: number }[];
  count: number;
  payout: number;
  isWild: boolean;
}

export interface SpiritReward {
  spiritTypeId: string;
  element: string;
  rarity: string;
  name: string;
  nameEn: string;
}

export interface SpinResult {
  grid: GridSymbol[][];
  wins: { symbolId: string; positions: [number, number][]; payout: number }[];
  elementalSurges: { element: string; positions: [number, number][] }[];
  missionHighlights: { element: string; positions: [number, number][]; points: number };
  totalPayout: number;
  isBigWin: boolean;
  isMegaWin: boolean;
  spiritsWon: SpiritReward[];
  availableNudges: number;
  canHold: boolean;
  holdPositions: boolean[];
  bonusTriggered: boolean;
  bonusCount: number;
  player: {
    lumens: number;
    energy: number;
    maxEnergy: number;
    level: number;
    experience: number;
    totalPower?: number;
    collectionMultiplier?: number;
  };
}

export function useSlotMachine() {
  const { data: session } = useSession();
  const router = useRouter();
  const syncPlayerStats = useGameStore(s => s.syncPlayerStats);
  const triggerRefresh = useGameStore(s => s.triggerRefresh);

  const [isSpinning, setIsSpinning] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [grid, setGrid] = useState<GridSymbol[][] | null>(null);

  // Initialize grid on mount
  useEffect(() => {
    const generateInitialGrid = () => {
      const SYMBOLS_LIST = [
        { id: 'sym_fire_common', element: 'fire', rarity: 'common', emoji: '🔥', glowColor: '#FF6B35', name: 'Chispa' },
        { id: 'sym_water_common', element: 'water', rarity: 'common', emoji: '💧', glowColor: '#3498DB', name: 'Gotita' },
        { id: 'sym_nature_common', element: 'nature', rarity: 'common', emoji: '🌿', glowColor: '#27AE60', name: 'Brotito' },
        { id: 'sym_dream_common', element: 'dream', rarity: 'common', emoji: '🌙', glowColor: '#DDA0DD', name: 'Suspiro' },
        { id: 'sym_star_common', element: 'star', rarity: 'common', emoji: '⭐', glowColor: '#F1C40F', name: 'Destello' },
      ];
      return Array.from({ length: 5 }, () =>
        Array.from({ length: 4 }, () => {
          const s = SYMBOLS_LIST[Math.floor(Math.random() * SYMBOLS_LIST.length)];
          return {
            id: s.id,
            name: s.name,
            nameEn: s.id,
            element: s.element,
            rarity: s.rarity,
            symbolType: 'spirit',
            emoji: s.emoji,
            color: '#FFF',
            glowColor: s.glowColor
          } as GridSymbol;
        })
      );
    };
    setGrid(generateInitialGrid());
  }, []);

  const [lumens, setLumens] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [winPositions, setWinPositions] = useState<Set<string>>(new Set());
  const [surgePositions, setSurgePositions] = useState<Set<string>>(new Set());
  const [missionPositions, setMissionPositions] = useState<Set<string>>(new Set());
  const [reelsStopped, setReelsStopped] = useState<boolean[]>([true, true, true, true, true]);
  const [showEnergyDialog, setShowEnergyDialog] = useState(false);

  const [multiplier, setMultiplier] = useState(1);
  const [availableNudges, setAvailableNudges] = useState(0);
  const [canHold, setCanHold] = useState(false);
  const [holdPositions, setHoldPositions] = useState<boolean[]>([false, false, false, false, false]);
  
  const [showBonusGame, setShowBonusGame] = useState(false);
  const [bonusCount, setBonusCount] = useState(0);

  const autoSpinRef = useRef(false);
  useEffect(() => { autoSpinRef.current = autoSpin; }, [autoSpin]);

  // Initial data fetch
  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await fetch('/api/player');
        if (res.ok) {
          const data = await res.json();
          setLumens(data.lumens);
          setEnergy(data.energy);
          setMaxEnergy(data.maxEnergy);
          syncPlayerStats(data);
        }

        // Fetch initial session state if exists
        const sessionRes = await fetch('/api/spin/session');
        if (sessionRes.ok) {
          const sData = await sessionRes.json();
          if (sData.grid) setGrid(sData.grid);
          setAvailableNudges(sData.availableNudges || 0);
          setCanHold(sData.canHold || false);
          setHoldPositions(sData.holds || [false, false, false, false, false]);
        }
      } catch {
        toast.error('Error al cargar datos del jugador');
      } finally {
        setIsLoaded(true);
      }
    };
    if (session?.user) fetchPlayer();
  }, [session, syncPlayerStats]);

  const toggleHold = useCallback((index: number) => {
    if (!canHold || isSpinning) return;
    audioService.playClick();
    setHoldPositions(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, [canHold, isSpinning]);

  const doNudge = useCallback(async (reelIndex: number) => {
    if (isSpinning || availableNudges <= 0) return;
    setIsSpinning(true);
    audioService.playClick();
    
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nudge', reelIndex }),
      });
      const data = await res.json();
      if (res.ok) {
        setGrid(data.grid);
        setResult(data);
        setAvailableNudges(data.availableNudges);
        // Simple animation for nudge
        setReelsStopped([true, true, true, true, true]);
        // Evaluate wins
        const wins = new Set<string>();
        const surges = new Set<string>();
        const mission = new Set<string>();
        data.wins.forEach((w: any) => w.positions.forEach((p: any) => wins.add(`${p[0]},${p[1]}`)));
        data.elementalSurges.forEach((s: any) => s.positions.forEach((p: any) => surges.add(`${p[0]},${p[1]}`)));
        data.missionHighlights.positions.forEach((p: any) => mission.add(`${p[0]},${p[1]}`));
        
        setWinPositions(wins);
        setSurgePositions(surges);
        setMissionPositions(mission);

        if (wins.size > 0 || surges.size > 0) audioService.playWin();
      }
    } catch {
      toast.error('Error al realizar avance');
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, availableNudges]);

  const doSpin = useCallback(async () => {
    if (isSpinning) return;
    if (!session?.user) { router.push('/auth/login'); return; }

    setIsSpinning(true);
    audioService.playSpinStart();
    setError(null);
    setResult(null);
    setWinPositions(new Set());
    setReelsStopped([false, false, false, false, false]);

    try {
      const hasHolds = holdPositions.some(h => h);
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          multiplier, 
          action: hasHolds ? 'spin_with_holds' : 'spin' 
        }),
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
      setGrid(spinResult.grid);

      // Animation
      for (let col = 0; col < 5; col++) {
        // If reel was held, stop it faster or don't animate as much
        const delay = holdPositions[col] ? 100 : (300 + col * 250);
        setTimeout(() => {
          if (!holdPositions[col]) audioService.playReelStop();
          setReelsStopped(prev => {
            const next = [...prev];
            next[col] = true;
            return next;
          });
        }, delay);
      }

      const totalDelay = 300 + 5 * 250 + 150;
      setTimeout(() => {
        setResult(spinResult);
        setAvailableNudges(spinResult.availableNudges);
        setCanHold(spinResult.canHold);
        setHoldPositions([false, false, false, false, false]); // Reset for next

        const wins = new Set<string>();
        const surges = new Set<string>();
        const mission = new Set<string>();
        spinResult.wins.forEach((w: any) => w.positions.forEach((p: any) => wins.add(`${p[0]},${p[1]}`)));
        spinResult.elementalSurges.forEach((s: any) => s.positions.forEach((p: any) => surges.add(`${p[0]},${p[1]}`)));
        spinResult.missionHighlights.positions.forEach((p: any) => mission.add(`${p[0]},${p[1]}`));
        
        setWinPositions(wins);
        setSurgePositions(surges);
        setMissionPositions(mission);

        if (wins.size > 0 || surges.size > 0) audioService.playWin();

        setLumens(spinResult.player.lumens);
        setEnergy(spinResult.player.energy);
        setMaxEnergy(spinResult.player.maxEnergy);
        
        // Handle Bonus Trigger
        if (spinResult.bonusTriggered) {
          setBonusCount(3); // or use spinResult.bonusCount if available
          setTimeout(() => {
            setShowBonusGame(true);
            setAutoSpin(false); // Pause auto-spin during bonus
          }, 4000); // Give time for regular win feedback
        }

        setIsSpinning(false);

        syncPlayerStats(spinResult.player);
        triggerRefresh();

      }, totalDelay);

    } catch (e) {
      setError('Error de conexión');
      setIsSpinning(false);
      setAutoSpin(false);
      autoSpinRef.current = false;
    }
  }, [isSpinning, session, router, syncPlayerStats, triggerRefresh, multiplier, holdPositions]);

  return {
    isSpinning,
    isLoaded,
    autoSpin,
    setAutoSpin,
    result,
    grid,
    lumens,
    energy,
    maxEnergy,
    error,
    setError,
    winPositions,
    surgePositions,
    missionPositions,
    reelsStopped,
    showEnergyDialog,
    setShowEnergyDialog,
    doSpin,
    doNudge,
    toggleHold,
    availableNudges,
    canHold,
    holdPositions,
    setEnergy,
    setLumens,
    multiplier,
    setMultiplier,
    showBonusGame,
    setShowBonusGame,
    bonusCount,
    onBonusComplete: (data: any) => {
      setShowBonusGame(false);
      setLumens(data.player.lumens);
      setEnergy(data.player.energy);
      syncPlayerStats(data.player);
      triggerRefresh();
    }
  };
}
