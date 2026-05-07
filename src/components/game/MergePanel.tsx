'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ELEMENT_EMOJIS } from '@/game/engine/symbols';
import { useGameStore } from '@/lib/store';
import { toast } from 'sonner';

interface PlayerSpirit {
  id: string;
  level: number;
  experience: number;
  spiritType: {
    id: string;
    name: string;
    nameEn: string;
    element: string;
    rarity: string;
    basePower: number;
    lumensPerHour: number;
    evolveFrom: string | null;
  };
}

interface MergeGroup {
  spiritTypeId: string;
  name: string;
  element: string;
  rarity: string;
  count: number;
  spirits: PlayerSpirit[];
  canMerge: boolean;
  evolvedName?: string;
  evolvedRarity?: string;
}

// Rarity order for evolution
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// Next rarity after merge
function getNextRarity(rarity: string): string | null {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx < RARITY_ORDER.length - 1) return RARITY_ORDER[idx + 1];
  return null;
}

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
    case 'common': return 'bg-muted/30 border-border/30';
    case 'uncommon': return 'bg-lumora-emerald/10 border-lumora-emerald/30';
    case 'rare': return 'bg-lumora-blue/10 border-lumora-blue/30';
    case 'epic': return 'bg-lumora-purple/10 border-lumora-purple/30';
    case 'legendary': return 'bg-lumora-gold/10 border-lumora-gold/30';
    default: return 'bg-muted/30 border-border/30';
  }
}

interface MergePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MergePanel({ isOpen, onClose }: MergePanelProps) {
  const t = useTranslations('spins');
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MergeGroup | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);

  const fetchSpirits = useCallback(async () => {
    try {
      const res = await fetch('/api/player');
      if (res.ok) {
        const data = await res.json();
        const spirits: PlayerSpirit[] = data.spirits || [];

        // Group spirits by type
        const groupMap = new Map<string, MergeGroup>();
        for (const spirit of spirits) {
          const typeId = spirit.spiritType.id;
          if (!groupMap.has(typeId)) {
            const nextRarity = getNextRarity(spirit.spiritType.rarity);
            groupMap.set(typeId, {
              spiritTypeId: typeId,
              name: spirit.spiritType.name,
              element: spirit.spiritType.element,
              rarity: spirit.spiritType.rarity,
              count: 0,
              spirits: [],
              canMerge: false,
              evolvedRarity: nextRarity || undefined,
            });
          }
          const group = groupMap.get(typeId)!;
          group.count++;
          group.spirits.push(spirit);
          group.canMerge = group.count >= 3;
        }

        setMergeGroups(Array.from(groupMap.values()).sort((a, b) => {
          if (a.canMerge !== b.canMerge) return a.canMerge ? -1 : 1;
          return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
        }));
      }
    } catch (err) {
      console.error('Failed to fetch spirits:', err);
      toast.error('Error al cargar espíritus');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => fetchSpirits(), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchSpirits]);

  const handleMerge = async (group: MergeGroup) => {
    setIsMerging(true);
    try {
      const res = await fetch('/api/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spiritTypeId: group.spiritTypeId,
          spiritIds: group.spirits.slice(0, 3).map(s => s.id),
        }),
      });

      if (res.ok) {
        setMergeSuccess(true);
        useGameStore.getState().triggerRefresh();
        setTimeout(() => {
          setMergeSuccess(false);
          setSelectedGroup(null);
          fetchSpirits();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to merge spirits:', err);
      toast.error('Error al fusionar espíritus');
    }
    setIsMerging(false);
  };

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
                <Sparkles className="h-5 w-5 text-lumora-purple" />
                <h2 className="text-lg font-fantasy font-bold bg-gradient-to-r from-lumora-purple to-lumora-pink bg-clip-text text-transparent">
                  {t('merge')} & {t('evolve')}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[65vh]">
              {mergeGroups.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    ¡Gira para conseguir espíritus que fusionar!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mergeGroups.map((group) => (
                    <motion.button
                      key={group.spiritTypeId}
                      onClick={() => setSelectedGroup(group)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        selectedGroup?.spiritTypeId === group.spiritTypeId
                          ? 'border-lumora-purple/50 bg-lumora-purple/10'
                          : getRarityBg(group.rarity)
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Spirit icon */}
                      <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center text-2xl">
                        {ELEMENT_EMOJIS[group.element as keyof typeof ELEMENT_EMOJIS] || '✨'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{group.name}</span>
                          <span className={`text-xs capitalize ${getRarityColor(group.rarity)}`}>
                            {group.rarity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            ×{group.count}
                          </span>
                          {group.canMerge && (
                            <>
                              <ArrowRight className="h-3 w-3 text-lumora-purple" />
                              <span className={`text-xs capitalize ${getRarityColor(group.evolvedRarity || 'uncommon')}`}>
                                {group.evolvedRarity || 'uncommon'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Merge badge */}
                      {group.canMerge && (
                        <div className="px-2 py-1 rounded-full bg-lumora-purple/20 text-xs text-lumora-purple font-semibold">
                          ¡Fusionar!
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Merge action */}
            {selectedGroup && selectedGroup.canMerge && (
              <div className="p-4 border-t border-border/20">
                <Button
                  onClick={() => handleMerge(selectedGroup)}
                  disabled={isMerging || mergeSuccess}
                  className="w-full rounded-xl h-12 bg-gradient-to-r from-lumora-purple to-lumora-pink text-white font-semibold"
                >
                  {mergeSuccess ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> ¡Espíritu evolucionado!
                    </span>
                  ) : isMerging ? (
                    'Fusionando...'
                  ) : (
                    <span className="flex items-center gap-2">
                      Fusionar 3× {selectedGroup.name}
                      <ArrowRight className="h-4 w-4" />
                      {selectedGroup.evolvedRarity || 'Evolucionado'}
                    </span>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
