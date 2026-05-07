'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

// === TYPES ===
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

interface SpiritPlacementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  spirits: UnplacedSpirit[];
  onSelectSpirit: (spiritId: string) => void;
  selectedSpiritId?: string | null;
}

// Element emoji mapping
const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  dream: '🌙',
  nature: '🌿',
  star: '⭐',
};

// Rarity color
function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'text-muted-foreground';
    case 'uncommon': return 'text-lumora-emerald';
    case 'rare': return 'text-lumora-blue';
    case 'epic': return 'text-lumora-purple';
    case 'legendary': return 'text-lumora-gold';
    default: return 'text-muted-foreground';
  }
}

function getRarityBg(rarity: string): string {
  switch (rarity) {
    case 'common': return 'bg-muted/20 border-border/30';
    case 'uncommon': return 'bg-lumora-emerald/10 border-lumora-emerald/30';
    case 'rare': return 'bg-lumora-blue/10 border-lumora-blue/30';
    case 'epic': return 'bg-lumora-purple/10 border-lumora-purple/30';
    case 'legendary': return 'bg-lumora-gold/10 border-lumora-gold/30';
    default: return 'bg-muted/20 border-border/30';
  }
}

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

export function SpiritPlacementPanel({
  isOpen,
  onClose,
  spirits,
  onSelectSpirit,
  selectedSpiritId,
}: SpiritPlacementPanelProps) {
  const [filterElement, setFilterElement] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rarity' | 'power' | 'lumens'>('rarity');

  // Filter and sort spirits
  const filteredSpirits = useMemo(() => {
    let result = [...spirits];

    if (filterElement) {
      result = result.filter(s => s.spiritType.element === filterElement);
    }

    result.sort((a, b) => {
      if (sortBy === 'rarity') {
        return RARITY_ORDER.indexOf(a.spiritType.rarity) - RARITY_ORDER.indexOf(b.spiritType.rarity);
      }
      if (sortBy === 'power') {
        return b.spiritType.basePower - a.spiritType.basePower;
      }
      return b.spiritType.lumensPerHour - a.spiritType.lumensPerHour;
    });

    return result;
  }, [spirits, filterElement, sortBy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[80vh] bg-card/95 backdrop-blur-md rounded-t-3xl sm:rounded-3xl border border-border/30 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-lumora-emerald" />
                <h2 className="text-lg font-fantasy font-title font-bold bg-gradient-to-r from-lumora-emerald to-lumora-blue bg-clip-text text-transparent">
                  Colocar Espíritu
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="px-4 py-3 border-b border-border/10 space-y-2">
              {/* Element filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Elemento:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setFilterElement(null)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      !filterElement ? 'bg-lumora-gold/20 text-lumora-gold border border-lumora-gold/30' : 'bg-muted/30 text-muted-foreground border border-transparent'
                    }`}
                  >
                    Todos
                  </button>
                  {Object.entries(ELEMENT_EMOJIS).map(([element, emoji]) => (
                    <button
                      key={element}
                      onClick={() => setFilterElement(element === filterElement ? null : element)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors flex items-center gap-0.5 ${
                        filterElement === element ? 'bg-lumora-gold/20 text-lumora-gold border border-lumora-gold/30' : 'bg-muted/30 text-muted-foreground border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Orden:</span>
                <div className="flex gap-1.5">
                  {(['rarity', 'power', 'lumens'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        sortBy === s ? 'bg-lumora-purple/20 text-lumora-purple border border-lumora-purple/30' : 'bg-muted/30 text-muted-foreground border border-transparent'
                      }`}
                    >
                      {s === 'rarity' ? 'Rareza' : s === 'power' ? 'Poder' : 'Lumens/h'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Spirit list */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {filteredSpirits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    {filterElement
                      ? 'No tienes espíritus de este elemento sin colocar'
                      : '¡Todos tus espíritus están colocados!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSpirits.map((spirit) => (
                    <motion.button
                      key={spirit.id}
                      onClick={() => onSelectSpirit(spirit.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        selectedSpiritId === spirit.id
                          ? 'border-lumora-gold/50 bg-lumora-gold/10 ring-1 ring-lumora-gold/30'
                          : getRarityBg(spirit.spiritType.rarity)
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Spirit icon */}
                      <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center text-2xl border border-border/20">
                        {ELEMENT_EMOJIS[spirit.spiritType.element]}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{spirit.spiritType.name}</span>
                          <span className={`text-xs capitalize ${getRarityColor(spirit.spiritType.rarity)}`}>
                            {spirit.spiritType.rarity}
                          </span>
                          <span className="text-xs text-muted-foreground">Nv.{spirit.level}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            ⚔️ {spirit.spiritType.basePower}
                          </span>
                          <span className="text-[10px] text-lumora-gold flex items-center gap-0.5">
                            ✨ {spirit.spiritType.lumensPerHour}/h
                          </span>
                        </div>
                      </div>

                      {/* Select indicator */}
                      {selectedSpiritId === spirit.id && (
                        <div className="px-2 py-1 rounded-full bg-lumora-gold/20 text-[10px] text-lumora-gold font-semibold">
                          Seleccionado
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {selectedSpiritId && (
              <div className="p-3 border-t border-border/20 bg-lumora-gold/5">
                <p className="text-xs text-center text-lumora-gold">
                  Toca una casilla vacía en el santuario para colocar el espíritu
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
