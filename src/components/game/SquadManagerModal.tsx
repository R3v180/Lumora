'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Zap, Trophy, HelpCircle, Filter, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { audioService } from '@/lib/audioService';

interface Spirit {
  id: string;
  name: string;
  element: string;
  rarity: string;
  level: number;
  power: number;
}

interface SquadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spirits: Spirit[];
  initialSelectedIds: string[];
  onSave: (newIds: string[]) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export function SquadManagerModal({
  isOpen,
  onClose,
  spirits,
  initialSelectedIds,
  onSave,
  title = "Gestión de Escuadrón",
  subtitle = "Selecciona 3 espíritus para ataque y defensa"
}: SquadManagerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [filterElement, setFilterElement] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'power' | 'rarity'>('power');
  const [isSaving, setIsSaving] = useState(false);

  const toggleSpirit = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      if (prev.length < 3) {
        return [...prev, id];
      }
      return [prev[1], prev[2], id];
    });
    audioService.playClick();
  };

  const filteredSpirits = useMemo(() => {
    return spirits
      .filter(s => !filterElement || s.element === filterElement)
      .sort((a, b) => {
        if (sortBy === 'power') return b.power - a.power;
        const rarities: any = { legendary: 4, epic: 3, rare: 2, common: 1 };
        return (rarities[b.rarity] || 0) - (rarities[a.rarity] || 0);
      });
  }, [spirits, filterElement, sortBy]);

  const synergy = useMemo(() => {
    if (selectedIds.length < 3) return { label: null, bonus: 0 };
    const selected = selectedIds.map(id => spirits.find(s => s.id === id)).filter(Boolean);
    const elements = selected.map(s => s!.element);
    const unique = new Set(elements);
    
    if (unique.size === 1) return { label: `TRIPLE ${elements[0].toUpperCase()}`, bonus: 0.25 };
    if (unique.size === 2) {
      const counts: any = {};
      elements.forEach(e => counts[e] = (counts[e] || 0) + 1);
      const duo = Object.keys(counts).find(k => counts[k] === 2);
      return { label: `DUO ${duo?.toUpperCase()}`, bonus: 0.10 };
    }
    return { label: 'VERSATILIDAD', bonus: 0.05 };
  }, [selectedIds, spirits]);

  const stats = useMemo(() => {
    const RARITY_MULTIPLIERS: any = { legendary: 1.6, epic: 1.3, rare: 1.15, common: 1.0 };
    const selected = selectedIds.map(id => spirits.find(s => s.id === id)).filter(Boolean);
    const baseSum = selected.reduce((acc, s) => acc + (s?.power || 0), 0);
    const rarityBonus = Math.round(selected.reduce((acc, s) => {
      const mult = RARITY_MULTIPLIERS[s!.rarity] || 1.0;
      return acc + (s!.power * mult - s!.power);
    }, 0));
    const totalPower = Math.round((baseSum + rarityBonus) * (1 + synergy.bonus));
    
    return { baseSum, rarityBonus, totalPower };
  }, [selectedIds, spirits, synergy]);

  const handleSave = async () => {
    if (selectedIds.length !== 3) {
      toast.error("Debes seleccionar 3 espíritus");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(selectedIds);
      audioService.playClaimReward();
      onClose();
    } catch (err) {
      toast.error("Error al guardar escuadrón");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          className="relative w-full max-w-lg bg-[#0a0a0c] border-2 border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{title}</h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{subtitle}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <X className="h-6 w-6 text-white/40" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* Selected Pedestals */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => {
                const spiritId = selectedIds[idx];
                const spirit = spirits.find(s => s.id === spiritId);
                return (
                  <motion.div
                    key={idx}
                    layoutId={`pedestal-${idx}`}
                    onClick={() => spirit && toggleSpirit(spirit.id)}
                    className={`relative aspect-square rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${
                      spirit 
                        ? spirit.rarity === 'legendary' ? 'border-lumora-gold/60 bg-black' :
                          spirit.rarity === 'epic' ? 'border-lumora-purple/60 bg-black' :
                          spirit.rarity === 'rare' ? 'border-lumora-blue/60 bg-black' :
                          'border-white/20 bg-black'
                        : 'border-dashed border-white/10 bg-black/20'
                    }`}
                  >
                    {spirit ? (
                      <>
                        <div className="absolute top-1.5 right-1.5 z-20 px-1 py-0.5 rounded-md bg-black/80 border border-white/10 text-[7px] font-black text-lumora-gold">
                          LV.{spirit.level}
                        </div>
                        <img 
                          src={`/assets/symbols/sym_${spirit.element}_${spirit.rarity}.png`} 
                          className="w-full h-full object-cover opacity-80" 
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 flex flex-col items-center">
                          <span className="text-[8px] font-black text-white uppercase truncate w-full text-center">{spirit.name}</span>
                          <span className="text-[7px] font-bold text-lumora-gold">⚔ {spirit.power}</span>
                        </div>
                      </>
                    ) : <Shield className="h-6 w-6 opacity-10" />}
                  </motion.div>
                );
              })}
            </div>

            {synergy.label && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                <div className="px-3 py-1 rounded-full bg-lumora-gold/10 border border-lumora-gold/30 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-lumora-gold" />
                  <span className="text-[9px] font-black text-lumora-gold uppercase">{synergy.label} +{Math.round(synergy.bonus * 100)}%</span>
                </div>
              </motion.div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                {['fire', 'water', 'nature', 'dream', 'star'].map((el) => (
                  <button 
                    key={el} 
                    onClick={() => setFilterElement(filterElement === el ? null : el)} 
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                      filterElement === el ? 'bg-white/20 border-white/40 scale-110 shadow-lg' : 'bg-white/5 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <img src={`/assets/symbols/sym_${el}_common.png`} className="w-5 h-5" />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setSortBy(sortBy === 'power' ? 'rarity' : 'power')}
                className="flex items-center gap-1.5 text-[9px] font-black text-lumora-gold uppercase tracking-widest bg-lumora-gold/10 px-3 py-2 rounded-xl border border-lumora-gold/20"
              >
                <SortDesc className="h-3 w-3" />
                {sortBy === 'power' ? 'Poder' : 'Rareza'}
              </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-4 gap-2 min-h-[200px]">
              {filteredSpirits.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSpirit(s.id)}
                  className={`group relative aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center overflow-hidden ${
                    selectedIds.includes(s.id)
                      ? 'border-lumora-gold scale-95 shadow-lg'
                      : s.rarity === 'legendary' ? 'border-lumora-gold/30 bg-black/40' :
                        s.rarity === 'epic' ? 'border-lumora-purple/30 bg-black/40' :
                        s.rarity === 'rare' ? 'border-lumora-blue/30 bg-black/40' :
                        'border-white/5 bg-black/40'
                  }`}
                >
                  <img src={`/assets/symbols/sym_${s.element}_${s.rarity}.png`} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/80 py-0.5">
                    <span className="text-[7px] font-black text-white">⚔{s.power}</span>
                  </div>
                  {selectedIds.includes(s.id) && (
                    <div className="absolute inset-0 bg-lumora-gold/20 flex items-center justify-center border-2 border-lumora-gold">
                      <Shield className="h-4 w-4 text-lumora-gold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Stats & Save */}
          <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Poder de Combate</span>
                <span className="text-3xl font-black text-white tracking-tighter">{stats.totalPower.toLocaleString()}</span>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[8px] font-bold text-white/40 uppercase">Base</p>
                  <p className="text-[10px] font-black text-white/60">{stats.baseSum}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-lumora-gold uppercase">Bono</p>
                  <p className="text-[10px] font-black text-lumora-gold">+{stats.rarityBonus}</p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={selectedIds.length !== 3 || isSaving} 
              className="w-full h-14 rounded-3xl bg-gradient-to-r from-lumora-blue via-lumora-purple to-lumora-pink text-white font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? "GUARDANDO..." : "GUARDAR FORMACIÓN"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
