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
  const [reelsStopped, setReelsStopped] = useState<boolean[]>([true, true, true, true, true]);
  const [showEnergyDialog, setShowEnergyDialog] = useState(false);

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
      } catch {
        toast.error('Error al cargar datos del jugador');
      } finally {
        setIsLoaded(true);
      }
    };
    if (session?.user) fetchPlayer();
  }, [session, syncPlayerStats]);

  const doSpin = useCallback(async () => {
    if (isSpinning) return;
    if (!session?.user) { router.push('/auth/login'); return; }

    setIsSpinning(true);
    audioService.playSpinStart();
    setError(null);
    setResult(null);
    setWinPositions(new Set());
    // NO setGrid(null) here — keep previous symbols until they start "moving"
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
      // Grid is updated immediately, but symbols only show when reelStopped[col] is true
      setGrid(spinResult.grid);

      // Animation: Stop reels with snappier timing
      for (let col = 0; col < 5; col++) {
        setTimeout(() => {
          audioService.playReelStop();
          setReelsStopped(prev => {
            const next = [...prev];
            next[col] = true;
            return next;
          });
        }, 300 + col * 250); // Reduced from 450ms to 250ms
      }

      const totalDelay = 300 + 5 * 250 + 150;
      setTimeout(() => {
        setResult(spinResult);
        
        const positions = new Set<string>();
        // Wins positions
        spinResult.wins.forEach(w => w.positions.forEach(p => positions.add(`${p.col},${p.row}`)));
        // Spirit rewards highlights
        if (spinResult.spiritsWon.length > 0) {
          const wonElements = new Set(spinResult.spiritsWon.map(s => s.element));
          spinResult.grid.forEach((col, cIdx) => col.forEach((sym, rIdx) => {
            if (wonElements.has(sym.element)) positions.add(`${cIdx},${rIdx}`);
          }));
        }
        // Surge highlights (6+ same element)
        const elementCounts: Record<string, number> = {};
        spinResult.grid.forEach(col => col.forEach(s => elementCounts[s.element] = (elementCounts[s.element] || 0) + 1));
        Object.entries(elementCounts).forEach(([element, count]) => {
          if (count >= 6) spinResult.grid.forEach((col, cIdx) => col.forEach((sym, rIdx) => {
            if (sym.element === element) positions.add(`${cIdx},${rIdx}`);
          }));
        });

        setWinPositions(positions);
        
        if (positions.size > 0) {
          if (Object.values(elementCounts).some(c => c >= 6)) audioService.playSurge();
          else audioService.playWin();
        }

        // Update local and global state
        setLumens(spinResult.player.lumens);
        setEnergy(spinResult.player.energy);
        setMaxEnergy(spinResult.player.maxEnergy);
        setIsSpinning(false);

        syncPlayerStats({
          ...spinResult.player,
          totalPower: (spinResult.player as any).totalPower,
          collectionMultiplier: (spinResult.player as any).collectionMultiplier,
        });
        triggerRefresh();

      }, totalDelay);

    } catch (e) {
      setError('Error de conexión');
      setIsSpinning(false);
      setAutoSpin(false);
      autoSpinRef.current = false;
    }
  }, [isSpinning, session, router, syncPlayerStats, triggerRefresh]);

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
    winPositions,
    reelsStopped,
    showEnergyDialog,
    setShowEnergyDialog,
    doSpin,
    setEnergy,
    setLumens
  };
}
