'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Coins, TreePine, Flower2, Mountain, Waves, Star, Flame } from 'lucide-react';

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

interface SanctuaryViewProps {
  sanctuary: SanctuaryData | null;
  onTileClick: (x: number, y: number) => void;
  onSpiritClick: (spiritId: string) => void;
  selectedSpiritId?: string | null;
  isPlacingMode: boolean;
}

// === CONSTANTS ===
const GRID_SIZE = 8;

// Element emoji mapping
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

function getTerrainStyle(terrain: TerrainType): string {
  switch (terrain) {
    case 'grass': return 'bg-emerald-900/40 border-emerald-700/30';
    case 'water': return 'bg-blue-900/40 border-blue-700/30';
    case 'rock': return 'bg-stone-800/40 border-stone-600/30';
    case 'flower': return 'bg-emerald-900/50 border-pink-500/20';
    case 'sand': return 'bg-amber-900/30 border-amber-700/20';
  }
}

function getTerrainEmoji(terrain: TerrainType): string {
  switch (terrain) {
    case 'grass': return '';
    case 'water': return '〰️';
    case 'rock': return '🪨';
    case 'flower': return '🌸';
    case 'sand': return '';
  }
}

export function SanctuaryView({
  sanctuary,
  onTileClick,
  onSpiritClick,
  selectedSpiritId,
  isPlacingMode,
}: SanctuaryViewProps) {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

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

  const renderTile = (x: number, y: number) => {
    const key = `${x},${y}`;
    const placedItem = placedMap.get(key);
    const terrain = getTerrainForPosition(x, y, level);
    const isOccupied = !!placedItem;
    const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
    const isSelected = isPlacingMode && !isOccupied;

    // Find spirit details if placed
    const spiritInfo = placedItem?.spiritId
      ? spiritDetailsMap.get(placedItem.spiritId)
      : null;

    const terrainClass = getTerrainStyle(terrain);
    const terrainEmoji = getTerrainEmoji(terrain);

    return (
      <motion.div
        key={key}
        className={`
          relative aspect-square rounded-lg border cursor-pointer
          transition-all duration-200 select-none
          ${terrainClass}
          ${isSelected && isHovered ? 'ring-2 ring-lumora-gold/70 scale-105 z-10' : ''}
          ${isSelected && !isHovered ? 'ring-1 ring-lumora-gold/30' : ''}
          ${isOccupied ? 'z-5' : ''}
          ${terrain === 'water' ? 'cursor-not-allowed opacity-60' : ''}
        `}
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
        {/* Terrain emoji */}
        {terrainEmoji && !isOccupied && (
          <span className="absolute inset-0 flex items-center justify-center text-sm opacity-50">
            {terrainEmoji}
          </span>
        )}

        {/* Placed spirit */}
        {isOccupied && spiritInfo && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className={`
              absolute inset-1 rounded-md border-2 flex items-center justify-center
              bg-card/70 backdrop-blur-sm
              ${RARITY_COLORS[spiritInfo.spiritType.rarity]}
              ${RARITY_GLOW[spiritInfo.spiritType.rarity]}
            `}
          >
            <span className="text-lg sm:text-xl">{ELEMENT_EMOJIS[spiritInfo.spiritType.element]}</span>
            {/* Level badge */}
            <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-lumora-purple/80 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {spiritInfo.level}
            </span>
          </motion.div>
        )}

        {/* Placed decoration (non-spirit) */}
        {isOccupied && placedItem && !placedItem.spiritId && (
          <div className="absolute inset-1 rounded-md border border-border/30 flex items-center justify-center bg-card/50">
            <span className="text-lg">
              {placedItem.type === 'tree' ? '🌳' :
               placedItem.type === 'fountain' ? '⛲' :
               placedItem.type === 'lamp' ? '🏮' :
               placedItem.type === 'crystal' ? '💎' :
               placedItem.type === 'flower_bed' ? '🌺' :
               '✨'}
            </span>
          </div>
        )}

        {/* Hover tooltip for placing */}
        {isSelected && isHovered && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-lumora-gold/90 text-[10px] font-bold text-black whitespace-nowrap z-20">
            Colocar aquí
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Island frame with ethereal glow */}
      <div className="relative rounded-2xl border-2 border-lumora-emerald/30 bg-gradient-to-b from-emerald-950/30 via-card/60 to-blue-950/20 p-3 backdrop-blur-sm shadow-xl overflow-hidden">
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

        {/* Sanctuary name */}
        <div className="text-center mb-2">
          <h2 className="text-sm font-fantasy font-bold bg-gradient-to-r from-lumora-emerald to-lumora-blue bg-clip-text text-transparent">
            {sanctuary?.name || 'Mi Santuario'}
          </h2>
          <p className="text-[10px] text-muted-foreground">
            Nivel {sanctuary?.sanctuaryLevel || 1} · {sanctuary?.lumensPerHour || 0} Lumens/h
          </p>
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

        {/* Isometric grid */}
        <div className="grid grid-cols-8 gap-1 p-1">
          {Array.from({ length: GRID_SIZE }).map((_, y) =>
            Array.from({ length: GRID_SIZE }).map((_, x) => renderTile(x, y))
          )}
        </div>

        {/* Cloud decoration at bottom */}
        <div className="flex justify-center gap-4 mt-2 opacity-30">
          <span className="text-sm">☁️</span>
          <span className="text-xs">☁️</span>
          <span className="text-sm">☁️</span>
        </div>
      </div>
    </div>
  );
}
