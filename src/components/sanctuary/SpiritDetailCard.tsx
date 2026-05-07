'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowUp, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

// === TYPES ===
interface SpiritDetail {
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

interface SpiritDetailCardProps {
  spirit: SpiritDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (spiritId: string) => Promise<boolean>;
}

const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  dream: '🌙',
  nature: '🌿',
  star: '⭐',
};

const ELEMENT_NAMES: Record<string, string> = {
  fire: 'Fuego',
  water: 'Agua',
  dream: 'Sueño',
  nature: 'Naturaleza',
  star: 'Estrella',
};

const RARITY_NAMES: Record<string, string> = {
  common: 'Común',
  uncommon: 'Poco Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

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

function getRarityBorder(rarity: string): string {
  switch (rarity) {
    case 'common': return 'border-muted-foreground/20';
    case 'uncommon': return 'border-lumora-emerald/30';
    case 'rare': return 'border-lumora-blue/30';
    case 'epic': return 'border-lumora-purple/30';
    case 'legendary': return 'border-lumora-gold/30';
    default: return 'border-border/20';
  }
}

export function SpiritDetailCard({
  spirit,
  isOpen,
  onClose,
  onRemove,
}: SpiritDetailCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  if (!spirit) return null;

  const handleRemove = async () => {
    setIsRemoving(true);
    const success = await onRemove(spirit.id);
    setIsRemoving(false);
    if (success) onClose();
  };

  const isPlaced = !!spirit.placedPosition;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xs bg-card/95 backdrop-blur-md rounded-3xl border-2 ${getRarityBorder(spirit.spiritType.rarity)} overflow-hidden`}
          >
            {/* Spirit visual */}
            <div className="relative pt-8 pb-4 px-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-background/50 border-2 border-border/20 flex items-center justify-center text-5xl mb-3">
                {ELEMENT_EMOJIS[spirit.spiritType.element]}
              </div>

              <h3 className="text-lg font-fantasy font-title font-bold text-foreground">
                {spirit.spiritType.name}
              </h3>

              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`text-xs capitalize ${getRarityColor(spirit.spiritType.rarity)}`}>
                  {RARITY_NAMES[spirit.spiritType.rarity]}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {ELEMENT_NAMES[spirit.spiritType.element]}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  Nv. {spirit.level}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-3 space-y-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/30">
                <span className="text-xs text-muted-foreground">Poder Base</span>
                <span className="text-sm font-semibold text-foreground">
                  ⚔️ {spirit.spiritType.basePower}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/30">
                <span className="text-xs text-muted-foreground">Generación</span>
                <span className="text-sm font-semibold text-lumora-gold">
                  ✨ {spirit.spiritType.lumensPerHour}/h
                </span>
              </div>
              {isPlaced && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-lumora-emerald/5 border border-lumora-emerald/10">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Posición
                  </span>
                  <span className="text-xs text-lumora-emerald font-medium">
                    ({spirit.placedPosition!.positionX}, {spirit.placedPosition!.positionY})
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex gap-2">
              {isPlaced && (
                <Button
                  onClick={handleRemove}
                  disabled={isRemoving}
                  variant="outline"
                  className="flex-1 rounded-xl gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  {isRemoving ? 'Quitando...' : 'Quitar del Santuario'}
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 rounded-xl border-border/50"
              >
                Cerrar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
