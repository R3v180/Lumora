'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Coins, TreePine, Flower2, Mountain, Waves, Star, Flame, Droplets, Moon, Leaf, ArrowUp, Trash2, Plus, Wand2, Settings } from 'lucide-react';
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

const ELEMENT_COLORS = {
  fire: '#ff4d4d',
  water: '#4da6ff',
  dream: '#a64dff',
  nature: '#4dff88',
  star: '#ffcc00',
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
          transition-all duration-300 select-none group/tile
          ${terrain === 'water' ? 'cursor-not-allowed opacity-10' : 'border border-white/5'}
          ${isSelected && isHovered ? 'bg-lumora-gold/20 z-30 scale-105' : ''}
          ${isOccupied ? 'z-10' : 'z-5'}
        `}
        style={{
          ...terrainStyle,
          backgroundColor: isOccupied && spiritInfo ? 'rgba(0,0,0,0.4)' : 'transparent'
        }}
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
      >
        {/* Selection Marker */}
        {isSelected && (
          <div className="absolute inset-0 border-2 border-lumora-gold/50 rounded-sm animate-pulse flex items-center justify-center">
            <Plus className="h-4 w-4 text-lumora-gold" />
          </div>
        )}

        {/* Placed spirit */}
        {isOccupied && spiritInfo && (
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute inset-0 flex items-center justify-center p-1"
            style={{ 
              transform: 'rotateZ(45deg) rotateX(-45deg) translateY(-25%)', 
              transformStyle: 'preserve-3d' 
            }}
          >
            {/* Rarity Border/Frame */}
            <div className={`
              relative w-full h-full rounded-xl border-2 flex items-center justify-center bg-black/40 backdrop-blur-sm
              ${RARITY_COLORS[spiritInfo.spiritType.rarity]}
              ${RARITY_GLOW[spiritInfo.spiritType.rarity]}
            `}>
              {/* Element Glow */}
              <div 
                className="absolute inset-0 blur-md opacity-30 rounded-lg"
                style={{ backgroundColor: ELEMENT_COLORS[spiritInfo.spiritType.element as keyof typeof ELEMENT_COLORS] }}
              />
              
              <motion.img 
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                src={`/assets/symbols/sym_${spiritInfo.spiritType.element}_${spiritInfo.spiritType.rarity}.png`} 
                alt={spiritInfo.spiritType.name} 
                className="w-[85%] h-[85%] object-contain relative z-10" 
              />

              {/* Level Badge - Tactical Style */}
              <div className="absolute -bottom-1 -right-1 z-20">
                <div className="bg-black/80 border border-white/20 px-1.5 py-0.5 rounded-md shadow-lg">
                  <span className="text-[7px] font-black text-white italic">L.{spiritInfo.level}</span>
                </div>
              </div>
              
              {/* Element Icon Badge */}
              <div className="absolute -top-1 -left-1 z-20">
                <div className="bg-black/80 border border-white/20 p-1 rounded-md shadow-lg">
                  {(() => {
                    const ElementIcon = ELEMENT_ICONS[spiritInfo.spiritType.element]?.icon;
                    return ElementIcon ? (
                      <ElementIcon className={`h-2 w-2 ${ELEMENT_ICONS[spiritInfo.spiritType.element].color}`} />
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Placed decoration */}
        {isOccupied && placedItem && !placedItem.spiritId && (
          <div 
            className="absolute inset-1 flex items-center justify-center pointer-events-none"
            style={{ transform: 'rotateZ(45deg) rotateX(-60deg) scale(1.5) translateY(-20%)', transformOrigin: 'bottom center' }}
          >
            <img src={`/assets/sanctuary/deco_${placedItem.type}.png`} className="w-full h-full object-contain filter drop-shadow-xl" />
          </div>
        )}

        {/* Selection Marker */}
        {isSelected && (
          <div className="absolute inset-0 border-2 border-lumora-gold/50 rounded-sm animate-pulse flex items-center justify-center">
            <Plus className="h-4 w-4 text-lumora-gold" />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* HUD Info Floating */}
      <div className="relative z-50 flex flex-col gap-4 px-4 mb-8">
         <div className="flex items-center justify-between">
            <div className="space-y-1">
              <motion.h2 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-2xl font-fantasy font-black italic tracking-tighter text-white drop-shadow-lg"
              >
                {sanctuary?.name || 'Mi Santuario'}
              </motion.h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] font-black bg-lumora-purple/40 px-2 py-0.5 rounded-full border border-lumora-purple/30 text-lumora-purple-light uppercase">
                  Nivel {level}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-black bg-lumora-gold/20 px-2 py-0.5 rounded-full border border-lumora-gold/30 text-lumora-gold uppercase">
                  <Coins className="h-2.5 w-2.5" />
                  {sanctuary?.lumensPerHour || 0} L/H
                </span>
              </div>
            </div>

            <Button 
              onClick={handleUpgrade}
              disabled={playerLumens < upgradeCost || isUpgrading}
              className="group h-10 rounded-2xl bg-gradient-to-br from-lumora-purple to-lumora-blue-dark border border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.4)] hover:scale-105 transition-all"
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[10px] font-black text-white/70 uppercase">Mejorar</span>
                <span className="text-[11px] font-bold text-lumora-gold">{upgradeCost.toLocaleString()} ✨</span>
              </div>
            </Button>
         </div>

         <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar px-4">
            {sanctuary && Object.entries(sanctuary.elements).map(([element, count]) => {
              const IconData = ELEMENT_ICONS[element];
              const Icon = IconData?.icon;
              const hasResonance = count >= 3;
              const hasMastery = count >= 5;

              return (
                <motion.div 
                  key={element} 
                  whileHover={{ scale: 1.1 }}
                  className={`
                    flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-xl border transition-all duration-500
                    ${hasMastery ? 'bg-lumora-gold/20 border-lumora-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 
                      hasResonance ? 'bg-white/10 border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 
                      'bg-black/40 border-white/5 shadow-lg'}
                  `}
                >
                  <div className={`
                    p-1 rounded-lg border transition-colors
                    ${hasResonance ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}
                  `}>
                    {Icon ? (
                      <Icon className={`h-3 w-3 ${IconData.color} ${hasResonance ? 'animate-pulse' : ''}`} />
                    ) : (
                      <span className="text-xs">{ELEMENT_EMOJIS[element]}</span>
                    )}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-black text-white">{count}</span>
                    {hasResonance && (
                      <span className={`text-[6px] font-black uppercase tracking-tighter ${hasMastery ? 'text-lumora-gold' : 'text-white/40'}`}>
                        {hasMastery ? 'Maestría' : 'Resonancia'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
         </div>
      </div>

      {/* Main Island Scene */}
      <div className="relative py-12">
        {/* Atmosphere: Cloud/Mist */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ x: [-100, 100], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-0 w-full h-32 bg-gradient-to-r from-transparent via-lumora-blue/10 to-transparent blur-3xl"
          />
        </div>

        {/* Floating Island Container */}
        <motion.div 
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-20"
        >
          {/* The Grid */}
          <div className="w-full overflow-visible flex justify-center">
            <div 
              className="relative"
              style={{ width: 'fit-content' }}
            >
              {/* Island Base (3D Effect) */}
              <div 
                className="absolute pointer-events-none z-0 transition-all duration-700"
                style={{
                  bottom: '-25%',
                  left: '-10%',
                  right: '-10%',
                  height: '70%',
                  clipPath: 'polygon(50% 100%, 100% 30%, 85% 0%, 15% 0%, 0% 30%)',
                  background: 'linear-gradient(180deg, rgba(80,60,100,0.4) 0%, rgba(40,30,60,0.8) 40%, rgba(10,5,30,0.95) 100%)',
                  boxShadow: 'inset 0 0 40px rgba(155,89,182,0.3)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
              
              <div 
                className="grid grid-cols-8 gap-0 relative z-10"
                style={{ 
                  transform: 'rotateX(45deg) rotateZ(-45deg)', 
                  transformStyle: 'preserve-3d',
                  width: 'fit-content'
                }}
              >
                {Array.from({ length: GRID_SIZE }).map((_, y) =>
                  Array.from({ length: GRID_SIZE }).map((_, x) => renderTile(x, y))
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Island Shadow on "ground" */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-12 bg-black/60 blur-3xl rounded-full scale-150 pointer-events-none" />
      </div>

      {/* Management Footer */}
      <div className="mt-4 px-4 pb-12">
        <div className="glass-card rounded-3xl border border-white/10 p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-lumora-emerald animate-pulse" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">
                   Espíritus en Armonía
                </h3>
             </div>
             <div className="flex items-center gap-1 text-[10px] font-black text-lumora-gold">
                <span>{sanctuary?.currentPlacedCount ?? 0}</span>
                <span className="text-white/20">/</span>
                <span>{sanctuary?.maxPlacedSpirits ?? 5}</span>
             </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {sanctuary?.placedSpirits.map((spirit) => (
              <motion.button
                key={spirit.id}
                onClick={() => onSpiritClick(spirit.id)}
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 relative w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group overflow-hidden"
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: `${ELEMENT_COLORS[spirit.spiritType.element as keyof typeof ELEMENT_COLORS]}20` }}
                />
                <img 
                  src={`/assets/symbols/sym_${spirit.spiritType.element}_${spirit.spiritType.rarity}.png`} 
                  className="w-10 h-10 object-contain relative z-10"
                  alt={spirit.spiritType.name}
                />
                <div className="absolute top-1 right-1 bg-black/60 text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-white/10 z-20">
                  L{spirit.level}
                </div>
              </motion.button>
            ))}
            
            {/* Empty Slots */}
            {sanctuary && Array.from({ length: Math.max(0, sanctuary.maxPlacedSpirits - sanctuary.currentPlacedCount) }).map((_, i) => (
              <motion.button 
                key={`empty-${i}`}
                onClick={onStartPlacing}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                className="flex-shrink-0 w-14 h-14 rounded-2xl border-2 border-dashed border-white/5 bg-white/2 flex items-center justify-center transition-colors"
              >
                <Plus className="h-5 w-5 text-white/10" />
              </motion.button>
            ))}
          </div>

          {/* Action Row */}
          <div className="mt-5 flex gap-3">
             <Button 
               onClick={onAutoPlace}
               className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-lumora-gold to-yellow-600 text-black text-[11px] font-black uppercase shadow-[0_4px_15px_rgba(200,150,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all border-none flex items-center justify-center gap-2"
             >
               <Wand2 className="h-4 w-4" />
               Auto-Optimizar
             </Button>
             <Button 
               onClick={onStartPlacing}
               className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-[11px] font-black uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2"
             >
               <Settings className="h-4 w-4" />
               Gestionar
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
