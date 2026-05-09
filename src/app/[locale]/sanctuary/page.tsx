'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Sparkles, TreePine, Coins, Settings, Pencil, ArrowUp,
  Plus, ArrowRight, Info, ChevronUp, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { SanctuaryView } from '@/components/sanctuary/SanctuaryView';
import { SanctuaryManager } from '@/components/sanctuary/SanctuaryManager';
import { audioService } from '@/lib/audioService';
import { LumensCollector } from '@/components/sanctuary/LumensCollector';
import { useGameStore } from '@/lib/store';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// === TYPES ===
interface PlacedItem {
  id: string;
  type: string;
  spiritId?: string | null;
  positionX: number;
  positionY: number;
  level: number;
}

interface PlacedSpirit {
  id: string;
  level: number;
  spiritType: {
    id: string;
    name: string;
    nameEn: string;
    element: string;
    rarity: string;
    basePower: number;
    lumensPerHour: number;
  };
  placedPosition?: {
    positionX: number;
    positionY: number;
  };
}

interface UnplacedSpirit {
  id: string;
  level: number;
  spiritType: {
    id: string;
    name: string;
    nameEn: string;
    element: string;
    rarity: string;
    basePower: number;
    lumensPerHour: number;
  };
}

interface SanctuaryData {
  id: string;
  name: string;
  lumensPerHour: number;
  baseLumensPerHour: number;
  spiritLumensPerHour: number;
  idleLumens: number;
  hoursSinceCollection: number;
  lastCollectAt: string;
  elements: Record<string, number>;
  placedItems: PlacedItem[];
  placedSpirits: PlacedSpirit[];
  unplacedSpirits: UnplacedSpirit[];
  totalSpirits: number;
  sanctuaryLevel: number;
  maxPlacedSpirits: number;
  currentPlacedCount: number;
}

import { SanctuaryHelpDialog } from '@/components/sanctuary/SanctuaryHelpDialog';

export default function SanctuaryPage() {
  const t = useTranslations('sanctuary');
  const { data: session } = useSession();
  const router = useRouter();

  // Sanctuary state
  const [sanctuary, setSanctuary] = useState<SanctuaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction state
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [selectedSpiritId, setSelectedSpiritId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const refreshKey = useGameStore(s => s.refreshKey);

  // Player lumens (for collector display)
  const [playerLumens, setPlayerLumens] = useState(0);

  // Action feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Fetch sanctuary data
  const fetchSanctuary = useCallback(async () => {
    try {
      const res = await fetch('/api/sanctuary');
      if (res.ok) {
        const data = await res.json();
        setSanctuary(data);

        // Also fetch player for lumens
        const playerRes = await fetch('/api/player');
        if (playerRes.ok) {
          const playerData = await playerRes.json();
          setPlayerLumens(playerData.lumens || 0);
        }
      } else if (res.status === 401) {
        // Not logged in
      } else {
        setError('Error al cargar santuario');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSanctuary();
  }, [fetchSanctuary, refreshKey]);

  // Collect idle lumens
  const handleCollect = useCallback(async (): Promise<{ collected: number; totalLumens: number } | null> => {
    try {
      const res = await fetch('/api/sanctuary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'collect' }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlayerLumens(data.totalLumens);
        if (data.collected > 0) audioService.playCollect();
        // Refresh sanctuary to reset idle counter
        fetchSanctuary();
        useGameStore.getState().triggerRefresh();
        return { collected: data.collected, totalLumens: data.totalLumens };
      }
    } catch (err) {
      console.error('Failed to collect lumens:', err);
      toast.error('Error al recolectar Lumens');
    }
    return null;
  }, [fetchSanctuary]);

  // Upgrade sanctuary
  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/sanctuary/upgrade', { method: 'POST' });
      if (res.ok) {
        toast.success('¡Santuario Mejorado!');
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#FFD700', '#9B59B6', '#2ECC71'] });
        fetchSanctuary();
        useGameStore.getState().triggerRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al mejorar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Auto Place
  const handleAutoPlace = async () => {
    setIsPlacing(true);
    try {
      const res = await fetch('/api/sanctuary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_place' })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`¡${data.placedCount} espíritus colocados automáticamente!`);
        fetchSanctuary();
        useGameStore.getState().triggerRefresh();
        setShowManager(false);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al colocar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsPlacing(false);
    }
  };

  // Place spirit on tile
  const handleTileClick = useCallback(async (x: number, y: number) => {
    if (!selectedSpiritId || isPlacing) return;

    setIsPlacing(true);
    try {
      const res = await fetch('/api/sanctuary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place',
          spiritId: selectedSpiritId,
          positionX: x,
          positionY: y,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        audioService.playPlaceSpirit();
        setActionMessage(`${data.spiritName} colocado en (${x}, ${y})`);
        setSelectedSpiritId(null);
        setIsPlacingMode(false);
        setShowManager(false);
        fetchSanctuary();
        useGameStore.getState().triggerRefresh();
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        const data = await res.json();
        setActionMessage(data.error || 'Error al colocar espíritu');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch {
      setActionMessage('Error de conexión');
      setTimeout(() => setActionMessage(null), 3000);
    }
    setIsPlacing(false);
  }, [selectedSpiritId, isPlacing, fetchSanctuary]);

  // Click on placed spirit
  const handleSpiritClick = useCallback((spiritId: string) => {
    if (isPlacingMode) return;
    const spirit = sanctuary?.placedSpirits.find(s => s.id === spiritId);
    if (spirit) {
      setShowManager(true);
    }
  }, [sanctuary, isPlacingMode]);

  // Remove spirit from sanctuary
  const handleRemoveSpirit = useCallback(async (spiritId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/sanctuary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', spiritId }),
      });

      if (res.ok) {
        fetchSanctuary();
        useGameStore.getState().triggerRefresh();
        return true;
      }
    } catch (err) {
      console.error('Failed to remove spirit:', err);
      toast.error('Error al quitar espíritu');
    }
    return false;
  }, [fetchSanctuary]);

  // Start placing mode
  const startPlacingMode = () => {
    if (!sanctuary) return;
    setShowManager(true);
  };

  // Rename sanctuary
  const handleRename = useCallback(async () => {
    if (!renameValue.trim() || renameValue.trim().length < 2) return;
    try {
      const res = await fetch('/api/sanctuary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', name: renameValue.trim() }),
      });
      if (res.ok) {
        setActionMessage('Santuario renombrado');
        setIsRenaming(false);
        fetchSanctuary();
        setTimeout(() => setActionMessage(null), 2000);
      }
    } catch (err) {
      console.error('Failed to rename sanctuary:', err);
      toast.error('Error al renombrar santuario');
    }
  }, [renameValue, fetchSanctuary]);

  // Cancel placing mode
  const cancelPlacingMode = () => {
    setIsPlacingMode(false);
    setSelectedSpiritId(null);
    setShowManager(false);
  };

  // Not logged in state
  if (!session?.user && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <TreePine className="h-16 w-16 text-lumora-emerald mx-auto mb-4" />
        <h2 className="text-xl font-fantasy font-bold bg-gradient-to-r from-lumora-emerald to-lumora-blue bg-clip-text text-transparent mb-2">
          {t('title')}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Inicia sesión para acceder a tu santuario personal
        </p>
        <Button
          onClick={() => router.push('/auth/login')}
          className="rounded-xl bg-gradient-to-r from-lumora-emerald to-lumora-blue text-white"
        >
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <TreePine className="h-12 w-12 text-lumora-emerald" />
        </motion.div>
        <p className="text-sm text-muted-foreground mt-4">Cargando santuario...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-2 pb-8 min-h-[80vh] relative overflow-x-hidden">
      {/* Sanctuary background — fixed behind everything */}
      <div 
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: "url('/assets/sanctuary/bg_sanctuary.png')" }} 
      />
      {/* Title with rename */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-3 flex flex-col items-center"
      >
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-emerald to-lumora-blue bg-clip-text text-transparent">
            {t('title')}
          </h1>
          {sanctuary && !isRenaming && (
            <button
              onClick={() => {
                setIsRenaming(true);
                setRenameValue(sanctuary.name);
              }}
              className="p-1 rounded-lg hover:bg-card/60 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        {isRenaming ? (
          <div className="flex items-center gap-2 mt-1 justify-center">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              placeholder="Nombre del santuario"
              className="h-7 w-40 text-xs text-center rounded-lg border-lumora-emerald/30"
              autoFocus
            />
            <button
              onClick={handleRename}
              className="p-1 rounded-lg bg-lumora-emerald/20 text-lumora-emerald hover:bg-lumora-emerald/30"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsRenaming(false)}
              className="p-1 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-1">
            <p className="text-xs text-muted-foreground mb-2">
              {sanctuary?.name || 'Tu isla flotante'} · Nivel {sanctuary?.sanctuaryLevel || 1}
            </p>
            <SanctuaryHelpDialog />
          </div>
        )}
      </motion.div>

      {/* Action message */}
      {actionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 px-4 py-2 rounded-xl bg-lumora-gold/10 border border-lumora-gold/20 text-xs text-lumora-gold text-center"
        >
          {actionMessage}
        </motion.div>
      )}

      {/* Placing mode banner */}
      {isPlacingMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="w-full max-w-lg mb-3 px-4 py-2 rounded-xl bg-lumora-gold/10 border border-lumora-gold/30 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lumora-gold" />
            <span className="text-xs text-lumora-gold font-medium">
              {selectedSpiritId ? 'Toca una casilla vacía' : 'Selecciona un espíritu'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelPlacingMode}
            className="text-xs text-muted-foreground h-7"
          >
            Cancelar
          </Button>
        </motion.div>
      )}

      {/* Sanctuary View (Now contains most of the UI) */}
      <SanctuaryView
        sanctuary={sanctuary}
        onTileClick={handleTileClick}
        onSpiritClick={handleSpiritClick}
        selectedSpiritId={selectedSpiritId}
        isPlacingMode={isPlacingMode}
        onAutoPlace={handleAutoPlace}
        onStartPlacing={startPlacingMode}
      />

      {/* Lumens Collector (Keep this as a separate section) */}
      <div className="w-full mt-4">
        <LumensCollector
          idleLumens={sanctuary?.idleLumens || 0}
          lumensPerHour={sanctuary?.lumensPerHour || 0}
          hoursSinceCollection={sanctuary?.hoursSinceCollection || 0}
          totalLumens={playerLumens}
          onCollect={handleCollect}
        />
      </div>

      {/* Unified Sanctuary Manager (The practical way) */}
      <SanctuaryManager
        isOpen={showManager}
        onClose={() => {
          setShowManager(false);
          setIsPlacingMode(false);
        }}
        placedSpirits={sanctuary?.placedSpirits || []}
        unplacedSpirits={sanctuary?.unplacedSpirits || []}
        maxSlots={sanctuary?.maxPlacedSpirits || 5}
        onRemove={handleRemoveSpirit}
        onPlace={async (id) => {
          setSelectedSpiritId(id);
          setIsPlacingMode(true);
          setShowManager(false);
          toast.info('Toca una casilla para colocar al espíritu');
        }}
      />
    </div>
  );
}
