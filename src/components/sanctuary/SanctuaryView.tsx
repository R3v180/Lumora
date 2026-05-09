'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Coins, TreePine, Flower2, Mountain, Waves, Star, Flame, Droplets, Moon, Leaf, ArrowUp, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/store';
import { toast } from 'sonner';

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

interface SanctuaryViewProps {
  sanctuary: SanctuaryData | null;
  onTileClick: (x: number, y: number) => void;
  onSpiritClick: (spiritId: string) => void;
  selectedSpiritId?: string | null;
  isPlacingMode: boolean;
  onAutoPlace?: () => void;
  onStartPlacing?: () => void;
}

// === CONSTANTS ===
const GRID_SIZE = 8;

// Element icon mapping using Lucide
const ELEMENT_ICONS: Record<string, { icon: typeof Flame; color: string }> = {
  fire: { icon: Flame, color: 'text-lumora-fire' },
  water: { icon: Droplets, color: 'text-lumora-water' },
  dream: { icon: Moon, color: 'text-lumora-dream' },
  nature: { icon: Leaf, color: 'text-lumora-nature' },
  star: { icon: Star, color: 'text-lumora-star' },
};

// Element emoji mapping (fallback)
const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  dream: '🌙',
  nature: '🌿',
  star: '⭐',
};

// Rarity border colors
const RARITY_COLORS: Record<string, string> = {
  common: 'border-muted-foreground/40',
  uncommon: 'border-lumora-emerald/60',
  rare: 'border-lumora-blue/60',
  epic: 'border-lumora-purple/60',
  legendary: 'border-lumora-gold/60',
};

const RARITY_GLOW: Record<string, string> = {
  common: '',
  uncommon: 'shadow-[0_0_8px_rgba(46,204,113,0.3)]',
  rare: 'shadow-[0_0_10px_rgba(93,173,226,0.4)]',
  epic: 'shadow-[0_0_12px_rgba(155,89,182,0.5)]',
  legendary: 'shadow-[0_0_16px_rgba(255,215,0,0.5)]',
};

// Terrain types for visual variety
type TerrainType = 'grass' | 'water' | 'rock' | 'flower' | 'sand';

function getTerrainForPosition(x: number, y: number, level: number): TerrainType {
  // Center area is grass, edges have water, corners have rock
  const distFromCenter = Math.sqrt(Math.pow(x - 3.5, 2) + Math.pow(y - 3.5, 2));

  if (distFromCenter > 4.5 - Math.min(level * 0.2, 1.5)) return 'water';
  if (distFromCenter > 4 - Math.min(level * 0.2, 1.5)) return 'sand';
  if ((x === 2 && y === 2) || (x === 5 && y === 5)) return 'flower';
  if ((x === 5 && y === 2) || (x === 2 && y === 5)) return 'rock';
  return 'grass';
}

function getTerrainStyle(terrain: TerrainType): any {
  return {
    backgroundImage: `url('/assets/sanctuary/iso_${terrain}.png')`,
    backgroundSize: 'cover',
  };
}

export function SanctuaryView({
  sanctuary,
  onTileClick,
  onSpiritClick,
  selectedSpiritId,
  isPlacingMode,
  onAutoPlace,
  onStartPlacing,
}: SanctuaryViewProps) {
  const t = useTranslations('sanctuary');
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Create a map of positions to placed items
  const placedMap = useMemo(() => {
    const map = new Map<string, PlacedItem>();
    if (sanctuary) {
      for (const item of sanctuary.placedItems) {
        map.set(`${item.positionX},${item.positionY}`, item);
      }
    }
    return map;
  }, [sanctuary]);

  // Create a map of spiritId to placed spirit details
  const spiritDetailsMap = useMemo(() => {
    const map = new Map<string, PlacedSpirit>();
    if (sanctuary) {
      for (const spirit of sanctuary.placedSpirits) {
        map.set(spirit.id, spirit);
      }
    }
    return map;
  }, [sanctuary]);

  const level = sanctuary?.sanctuaryLevel || 1;
  const upgradeCost = level * 2000;
  const playerLumens = useGameStore(s => s.lumens);

  const handleUpgrade = async () => {
    if (playerLumens < upgradeCost || isUpgrading) return;
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/sanctuary/upgrade', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        useGameStore.getState().syncPlayerStats({ 
          lumens: data.newLumens, 
          sanctuaryLevel: data.newLevel,
          energy: useGameStore.getState().energy,
          maxEnergy: useGameStore.getState().maxEnergy
        });
        useGameStore.getState().triggerRefresh();
        toast.success(`¡Santuario mejorado a Nivel ${data.newLevel}!`);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Error al mejorar');
    } finally {
      setIsUpgrading(false);
    }
  };

  const renderTile = (x: number, y: number) => {
    const key = `${x},${y}`;
    const placedItem = placedMap.get(key);
    const terrain = getTerrainForPosition(x, y, level);
    const isOccupied = !!placedItem;
    const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
    const isSelected = isPlacingMode && !isOccupied && !!selectedSpiritId;

    // Find spirit details if placed
    const spiritInfo = placedItem?.spiritId
      ? spiritDetailsMap.get(placedItem.spiritId)
      : null;

    const terrainStyle = getTerrainStyle(terrain);

    return (
      <motion.div
        key={key}
        className={`
          relative aspect-square w-10 sm:w-12 md:w-14 cursor-pointer
          transition-all duration-200 select-none
          ${terrain === 'water' ? 'cursor-not-allowed opacity-50 border-0' : 'border border-white/5'}
          ${isSelected && isHovered ? 'ring-2 ring-lumora-gold/70 scale-105 z-10' : ''}
          ${isSelected && !isHovered ? 'ring-2 ring-lumora-gold animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.5)] z-10' : ''}
          ${isOccupied ? 'z-5' : ''}
        `}
        style={terrainStyle}
        onMouseEnter={() => setHoveredTile({ x, y })}
        onMouseLeave={() => setHoveredTile(null)}
        onClick={() => {
          if (terrain === 'water') return;
          if (isOccupied && placedItem?.spiritId) {
            onSpiritClick(placedItem.spiritId);
          } else if (!isOccupied && isPlacingMode) {
            onTileClick(x, y);
          }
        }}
        whileHover={isSelected ? { scale: 1.05 } : {}}
        whileTap={isSelected ? { scale: 0.95 } : {}}
      >

        {/* Placed spirit */}
        {isOccupied && spiritInfo && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: 'rotateZ(45deg) rotateX(-60deg) scale(1.6) translateY(-25%)', transformOrigin: 'bottom center' }}
          >
            <img 
              src={`/assets/symbols/sym_${spiritInfo.spiritType.element}_${spiritInfo.spiritType.rarity}.png`} 
              alt={spiritInfo.spiritType.name} 
              className="w-full h-full object-contain" 
              style={{ filter: 'drop-shadow(0px 8px 4px rgba(0,0,0,0.6))' }}
            />
            {/* Level badge */}
            <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-lumora-purple/90 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-md">
              {spiritInfo.level}
            </span>
          </motion.div>
        )}

        {/* Placed decoration (non-spirit) */}
        {isOccupied && placedItem && !placedItem.spiritId && (
          <div 
            className="absolute inset-1 flex items-center justify-center pointer-events-none"
            style={{ transform: 'rotateZ(45deg) rotateX(-60deg) scale(1.5) translateY(-20%)', transformOrigin: 'bottom center' }}
          >
            <img src={`/assets/sanctuary/deco_${placedItem.type}.png`} className="w-full h-full object-contain filter drop-shadow-lg" />
          </div>
        )}

        {/* Hover tooltip for placing */}
        {isSelected && isHovered && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-lumora-gold/90 text-[10px] font-bold text-black whitespace-nowrap z-20" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
            {t('placeHere')}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Island frame with ethereal glow */}
      <div className="sanctuary-frame p-3 overflow-hidden">
        {/* Floating particles (decorative) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-lumora-gold/40"
              animate={{
                y: [-10, -60],
                x: [0, Math.sin(i) * 20],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.7,
                ease: 'easeOut',
              }}
              style={{
                left: `${15 + i * 14}%`,
                bottom: '10%',
              }}
            />
          ))}
        </div>

        {/* Sanctuary name, level & upgrade */}
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex-1">
            <h2 className="text-sm font-fantasy font-bold bg-gradient-to-r from-lumora-emerald to-lumora-blue bg-clip-text text-transparent">
              {sanctuary?.name || 'Mi Santuario'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] text-muted-foreground">
                Nivel {level} · {sanctuary?.lumensPerHour || 0} L/h
              </p>
              <span className="text-[9px] text-muted-foreground/40">·</span>
              <p className={`text-[9px] font-medium ${
                sanctuary && sanctuary.currentPlacedCount >= sanctuary.maxPlacedSpirits
                  ? 'text-lumora-gold'
                  : 'text-muted-foreground'
              }`}>
                ✨ {sanctuary?.currentPlacedCount ?? 0}/{sanctuary?.maxPlacedSpirits ?? 5}
              </p>
            </div>
          </div>

          <Button 
            onClick={handleUpgrade}
            disabled={playerLumens < upgradeCost || isUpgrading}
            size="sm"
            className="h-8 rounded-xl bg-gradient-to-r from-lumora-purple to-lumora-blue border-0 shadow-lg text-[10px] font-bold px-3 gap-1.5"
          >
            <ArrowUp className="h-3 w-3" />
            {isUpgrading ? '...' : `SUBIR LV (${upgradeCost.toLocaleString()} ✨)`}
          </Button>
        </div>

        {/* Element balance bar */}
        {sanctuary && (
          <div className="flex items-center justify-center gap-3 mb-3 px-2">
            {Object.entries(sanctuary.elements).map(([element, count]) => (
              <div key={element} className="flex items-center gap-0.5">
                <span className="text-xs">{ELEMENT_EMOJIS[element]}</span>
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Isometric grid — horizontally scrollable on narrow screens */}
        <div className="w-full overflow-x-auto overflow-y-visible scrollbar-hide px-2 pt-4 pb-12">
          <div className="relative min-w-[320px] mx-auto w-fit">
            {/* Floating island base */}
            <div 
              className="absolute pointer-events-none z-0"
              style={{
                bottom: '-30%',
                left: '10%',
                right: '10%',
                height: '60%',
                clipPath: 'polygon(20% 0%, 80% 0%, 100% 30%, 50% 100%, 0% 30%)',
                background: 'linear-gradient(180deg, rgba(60,35,15,0.6) 0%, rgba(30,18,8,0.8) 40%, rgba(10,5,2,0.9) 100%)',
                filter: 'blur(1px)',
              }}
            />
            <div 
              className="grid grid-cols-8 gap-0 relative z-10"
              style={{ transform: 'rotateX(60deg) rotateZ(-45deg)', transformStyle: 'preserve-3d', width: 'fit-content', margin: '0 auto' }}
            >
              {Array.from({ length: GRID_SIZE }).map((_, y) =>
                Array.from({ length: GRID_SIZE }).map((_, x) => renderTile(x, y))
              )}
            </div>
          </div>
        </div>

        {/* Wisps below the island */}
        <div className="flex justify-center gap-6 mt-3 pointer-events-none">
          {[0.3, 0.5, 0.2].map((opacity, i) => (
            <motion.div
              key={i}
              className="w-8 h-2 rounded-full bg-lumora-blue/20"
              animate={{ opacity: [opacity, opacity + 0.2, opacity], scaleX: [1, 1.3, 1] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>

      {/* NEW: Placed Spirits Management Section */}
      <div className="mt-6 space-y-4 px-2">
        {/* Element Summary Cards */}
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(ELEMENT_EMOJIS).map(([element, emoji]) => (
            <div key={element} className="glass-card-subtle p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <span className="text-lg">{emoji}</span>
              <span className="text-[10px] font-bold text-muted-foreground">{sanctuary?.elements[element] || 0}</span>
            </div>
          ))}
        </div>

        {/* Placed Spirits Horizontal List */}
        <div className="bg-card/40 rounded-2xl border border-border/20 p-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Espíritus Colocados ({sanctuary?.currentPlacedCount}/{sanctuary?.maxPlacedSpirits})
            </h3>
            <div className="flex items-center gap-2">
              {sanctuary && sanctuary.currentPlacedCount < sanctuary.maxPlacedSpirits && (
                <>
                  <Button 
                    onClick={onAutoPlace}
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] text-lumora-gold hover:text-lumora-gold hover:bg-lumora-gold/10 px-2 rounded-lg border border-lumora-gold/20"
                  >
                    COLOCAR TODOS
                  </Button>
                  <Button 
                    onClick={onStartPlacing}
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] text-lumora-blue hover:text-lumora-blue hover:bg-lumora-blue/10 px-2 rounded-lg border border-lumora-blue/20"
                  >
                    <Plus className="h-3 w-3 mr-1" /> MANUAL
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sanctuary?.placedSpirits.map((spirit) => (
              <motion.button
                key={spirit.id}
                onClick={() => onSpiritClick(spirit.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-background/60 border border-white/10 flex items-center justify-center relative group"
              >
                <img 
                  src={`/assets/symbols/sym_${spirit.spiritType.element}_${spirit.spiritType.rarity}.png`} 
                  className="w-9 h-9 object-contain"
                  alt={spirit.spiritType.name}
                />
                <div className="absolute -top-1 -right-1 bg-lumora-purple text-[8px] font-bold px-1 rounded-full border border-white/20">
                  {spirit.level}
                </div>
              </motion.button>
            ))}
            
            {/* Empty Slots */}
            {sanctuary && Array.from({ length: Math.max(0, sanctuary.maxPlacedSpirits - sanctuary.currentPlacedCount) }).map((_, i) => (
              <div 
                key={`empty-${i}`}
                className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-white/5 bg-white/2 flex items-center justify-center"
              >
                <Plus className="h-4 w-4 text-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
