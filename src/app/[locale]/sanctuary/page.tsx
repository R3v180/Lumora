'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Sparkles, TreePine, Coins, Settings, Pencil,
  Plus, ArrowRight, Info, ChevronUp, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { SanctuaryView } from '@/components/sanctuary/SanctuaryView';
import { SpiritPlacementPanel } from '@/components/sanctuary/SpiritPlacementPanel';
import { LumensCollector } from '@/components/sanctuary/LumensCollector';
import { SpiritDetailCard } from '@/components/sanctuary/SpiritDetailCard';

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
}

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
  const [showPlacementPanel, setShowPlacementPanel] = useState(false);
  const [selectedSpiritDetail, setSelectedSpiritDetail] = useState<PlacedSpirit | null>(null);
  const [showSpiritDetail, setShowSpiritDetail] = useState(false);

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
  }, [fetchSanctuary]);

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
        // Refresh sanctuary to reset idle counter
        fetchSanctuary();
        return { collected: data.collected, totalLumens: data.totalLumens };
      }
    } catch {}
    return null;
  }, [fetchSanctuary]);

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
        setActionMessage(`${data.spiritName} colocado en (${x}, ${y})`);
        setSelectedSpiritId(null);
        setIsPlacingMode(false);
        setShowPlacementPanel(false);
        fetchSanctuary();
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
      setSelectedSpiritDetail(spirit);
      setShowSpiritDetail(true);
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
        return true;
      }
    } catch {}
    return false;
  }, [fetchSanctuary]);

  // Start placing mode
  const startPlacingMode = () => {
    if (!sanctuary || sanctuary.unplacedSpirits.length === 0) {
      setActionMessage('No tienes espíritus para colocar. ¡Gira para conseguir más!');
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }
    setIsPlacingMode(true);
    setShowPlacementPanel(true);
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
    } catch {}
  }, [renameValue, fetchSanctuary]);

  // Cancel placing mode
  const cancelPlacingMode = () => {
    setIsPlacingMode(false);
    setSelectedSpiritId(null);
    setShowPlacementPanel(false);
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
    <div className="flex flex-col items-center px-4 pt-2 pb-8 min-h-[80vh]">
      {/* Title with rename */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-3"
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
          <p className="text-xs text-muted-foreground mt-1">
            {sanctuary?.name || 'Tu isla flotante'} · Nivel {sanctuary?.sanctuaryLevel || 1}
          </p>
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

      {/* Sanctuary View */}
      <SanctuaryView
        sanctuary={sanctuary}
        onTileClick={handleTileClick}
        onSpiritClick={handleSpiritClick}
        selectedSpiritId={selectedSpiritId}
        isPlacingMode={isPlacingMode}
      />

      {/* Lumens Collector */}
      <div className="w-full mt-4">
        <LumensCollector
          idleLumens={sanctuary?.idleLumens || 0}
          lumensPerHour={sanctuary?.lumensPerHour || 0}
          hoursSinceCollection={sanctuary?.hoursSinceCollection || 0}
          totalLumens={playerLumens}
          onCollect={handleCollect}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4">
        {/* Place Spirit */}
        <Button
          onClick={startPlacingMode}
          disabled={isPlacingMode}
          className="rounded-xl gap-1.5 bg-gradient-to-r from-lumora-emerald to-lumora-blue text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('placeSpirit')}
        </Button>

        {/* Collection count */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/60 border border-border/30">
          <Sparkles className="h-3.5 w-3.5 text-lumora-purple" />
          <span className="text-xs font-medium">
            {sanctuary?.totalSpirits || 0} espíritus
          </span>
        </div>
      </div>

      {/* Placed spirits summary */}
      {sanctuary && sanctuary.placedSpirits.length > 0 && (
        <div className="w-full max-w-lg mt-4">
          <div className="rounded-2xl border border-border/20 bg-card/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Espíritus Colocados ({sanctuary.placedSpirits.length})
              </span>
              <span className="text-xs text-lumora-gold font-medium flex items-center gap-1">
                ✨ +{sanctuary.spiritLumensPerHour}/h
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sanctuary.placedSpirits.map((spirit) => (
                <motion.button
                  key={spirit.id}
                  onClick={() => {
                    setSelectedSpiritDetail(spirit);
                    setShowSpiritDetail(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background/40 border border-border/20 hover:border-lumora-gold/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-base">
                    {{ fire: '🔥', water: '💧', dream: '🌙', nature: '🌿', star: '⭐' }[spirit.spiritType.element]}
                  </span>
                  <span className="text-xs font-medium">{spirit.spiritType.name}</span>
                  <span className="text-[10px] text-muted-foreground">Nv.{spirit.level}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unplaced spirits preview */}
      {sanctuary && sanctuary.unplacedSpirits.length > 0 && (
        <div className="w-full max-w-lg mt-3">
          <div className="rounded-2xl border border-dashed border-border/30 bg-card/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Sin Colocar ({sanctuary.unplacedSpirits.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={startPlacingMode}
                className="text-xs text-lumora-gold h-6"
              >
                Colocar todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sanctuary.unplacedSpirits.slice(0, 8).map((spirit) => (
                <div
                  key={spirit.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background/30 border border-border/10"
                >
                  <span className="text-sm">
                    {{ fire: '🔥', water: '💧', dream: '🌙', nature: '🌿', star: '⭐' }[spirit.spiritType.element]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{spirit.spiritType.name}</span>
                </div>
              ))}
              {sanctuary.unplacedSpirits.length > 8 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{sanctuary.unplacedSpirits.length - 8} más
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spirit Placement Panel */}
      <SpiritPlacementPanel
        isOpen={showPlacementPanel}
        onClose={cancelPlacingMode}
        spirits={sanctuary?.unplacedSpirits || []}
        onSelectSpirit={(id) => setSelectedSpiritId(id)}
        selectedSpiritId={selectedSpiritId}
      />

      {/* Spirit Detail Card */}
      <SpiritDetailCard
        spirit={selectedSpiritDetail}
        isOpen={showSpiritDetail}
        onClose={() => {
          setShowSpiritDetail(false);
          setSelectedSpiritDetail(null);
        }}
        onRemove={handleRemoveSpirit}
      />
    </div>
  );
}
