'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Swords, Zap, ArrowRightLeft, Trash2, Plus, Info, LayoutGrid, List, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface SpiritType {
  id: string;
  name: string;
  element: string;
  rarity: string;
  basePower: number;
  lumensPerHour: number;
}

interface PlacedSpirit {
  id: string;
  level: number;
  spiritType: SpiritType;
  placedPosition?: {
    positionX: number;
    positionY: number;
  };
}

interface UnplacedSpirit {
  id: string;
  level: number;
  spiritType: SpiritType;
}

interface SanctuaryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  placedSpirits: PlacedSpirit[];
  unplacedSpirits: UnplacedSpirit[];
  maxSlots: number;
  onRemove: (id: string) => Promise<boolean>;
  onPlace: (spiritId: string, x?: number, y?: number) => Promise<void>;
  onSwap?: (oldId: string, newId: string) => Promise<void>;
}

export function SanctuaryManager({
  isOpen,
  onClose,
  placedSpirits,
  unplacedSpirits,
  maxSlots,
  onRemove,
  onPlace,
}: SanctuaryManagerProps) {
  const [activeTab, setActiveTab] = useState<'placed' | 'unplaced'>('placed');
  const [sortBy, setSortBy] = useState<'power' | 'level' | 'element'>('power');
  const [filterElement, setFilterElement] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    const success = await onRemove(id);
    if (success) toast.success('Espíritu retirado');
  };

  const handlePlace = async (spiritId: string) => {
    await onPlace(spiritId);
  };

  const calculateProduction = (spirit: any) => {
    const rarityMult: Record<string, number> = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2.2, legendary: 4 };
    const base = spirit.spiritType.lumensPerHour;
    const mult = rarityMult[spirit.spiritType.rarity] || 1;
    const levelBonus = 1 + (spirit.level - 1) * 0.1;
    return Math.floor(base * mult * levelBonus);
  };

  const groupedSpirits = useMemo(() => {
    const list = activeTab === 'placed' ? [...placedSpirits] : [...unplacedSpirits];
    
    // Filtering
    let filtered = filterElement 
      ? list.filter(s => s.spiritType.element === filterElement)
      : list;

    // Grouping only for unplaced spirits
    if (activeTab === 'unplaced') {
      const groups: Record<string, any> = {};
      filtered.forEach(s => {
        const key = `${s.spiritType.id}-${s.level}`;
        if (!groups[key]) {
          groups[key] = { ...s, count: 1, ids: [s.id] };
        } else {
          groups[key].count++;
          groups[key].ids.push(s.id);
        }
      });
      filtered = Object.values(groups);
    }

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'power') return calculateProduction(b) - calculateProduction(a);
      if (sortBy === 'level') return b.level - a.level;
      if (sortBy === 'element') return a.spiritType.element.localeCompare(b.spiritType.element);
      return 0;
    });
  }, [activeTab, placedSpirits, unplacedSpirits, sortBy, filterElement]);

  const elements = ['fire', 'water', 'dream', 'nature', 'star'];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] p-0 bg-[#0a0a0c]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[3rem] overflow-hidden flex flex-col">
        <div className="mx-auto w-12 h-1.5 bg-white/10 rounded-full mt-3 mb-2 shrink-0" />
        
        <Tabs defaultValue="placed" className="w-full h-full flex flex-col overflow-hidden" onValueChange={(v) => setActiveTab(v as any)}>
          <div className="px-6 pt-2 pb-4 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-black text-white uppercase italic tracking-tighter">
                  Gestión de Isla
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-lumora-emerald font-black uppercase tracking-widest">
                    {placedSpirits.length} / {maxSlots} OCUPADOS
                  </span>
                </SheetDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/5 border border-white/10 h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Sorting & Filtering HUD */}
            <div className="space-y-3">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFilterElement(null)}
                  className={`h-7 px-3 rounded-full text-[8px] font-black uppercase border transition-all ${!filterElement ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                >
                  TODOS
                </Button>
                {elements.map(el => (
                  <Button 
                    key={el}
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFilterElement(el)}
                    className={`h-7 px-3 rounded-full text-[8px] font-black uppercase border transition-all ${filterElement === el ? 'bg-lumora-blue text-white border-lumora-blue' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    {el}
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-white/5 p-1 rounded-xl">
                <TabsList className="grid w-full grid-cols-2 bg-transparent">
                  <TabsTrigger value="placed" className="rounded-lg text-[10px] font-black uppercase data-[state=active]:bg-white/10">EQUIPADOS</TabsTrigger>
                  <TabsTrigger value="unplaced" className="rounded-lg text-[10px] font-black uppercase data-[state=active]:bg-white/10">RESERVA</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex items-center gap-2 px-1">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">ORDENAR POR:</span>
                <div className="flex gap-2">
                  {['power', 'level', 'element'].map((s: any) => (
                    <button 
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`text-[8px] font-black uppercase tracking-tight ${sortBy === s ? 'text-lumora-gold underline underline-offset-4' : 'text-white/40'}`}
                    >
                      {s === 'power' ? 'Poder' : s === 'level' ? 'Nivel' : 'Elemento'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full px-6">
              <div className="grid grid-cols-1 gap-3 pb-32">
              <AnimatePresence mode="popLayout">
                {groupedSpirits.map((spirit: any) => {
                  const production = calculateProduction(spirit);
                  return (
                    <motion.div
                      layout
                      key={spirit.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => activeTab === 'unplaced' && handlePlace(spirit.id)}
                      className={`
                        relative glass-card-subtle p-3 rounded-2xl border border-white/5 flex items-center gap-4 group cursor-pointer overflow-hidden
                        ${activeTab === 'unplaced' ? 'hover:border-lumora-emerald/40 shadow-lg' : ''}
                      `}
                    >
                      {activeTab === 'unplaced' && (
                        <div className="absolute inset-0 bg-lumora-emerald/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      )}

                      <div className="relative shrink-0">
                        <div className={`
                          w-16 h-16 rounded-2xl bg-black/60 flex items-center justify-center border-2 shadow-2xl relative overflow-hidden
                          ${spirit.spiritType.rarity === 'legendary' ? 'border-lumora-gold/50 shadow-lumora-gold/10' : 
                            spirit.spiritType.rarity === 'epic' ? 'border-lumora-purple/50 shadow-lumora-purple/10' : 
                            spirit.spiritType.rarity === 'rare' ? 'border-lumora-blue/50 shadow-lumora-blue/10' : 'border-white/10'}
                        `}>
                           {/* Glow background based on rarity */}
                           <div className={`absolute inset-0 bg-gradient-to-br opacity-20
                              ${spirit.spiritType.rarity === 'legendary' ? 'from-lumora-gold' : 
                                spirit.spiritType.rarity === 'epic' ? 'from-lumora-purple' : 
                                spirit.spiritType.rarity === 'rare' ? 'from-lumora-blue' : 'from-white/20'}
                           `} />
                          
                          <img 
                            src={`/assets/symbols/sym_${spirit.spiritType.element}_${spirit.spiritType.rarity}.png`} 
                            className="w-12 h-12 object-contain relative z-10 drop-shadow-lg"
                            alt={spirit.spiritType.name}
                          />

                          {/* Level Badge Over Image */}
                          <div className="absolute top-1 right-1 bg-black/80 backdrop-blur-sm border border-white/20 text-[8px] font-black px-1.5 py-0.5 rounded-md text-white z-20 italic">
                            L.{spirit.level}
                          </div>
                          
                          {/* Count Badge Over Image */}
                          {spirit.count > 1 && (
                            <div className="absolute bottom-1 left-1 bg-lumora-blue border border-white/20 text-[8px] font-black px-1.5 py-0.5 rounded-md text-white z-20 shadow-lg">
                              x{spirit.count}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase italic tracking-tighter truncate">{spirit.spiritType.name}</h4>
                          <span className="text-[8px] font-black text-white/20 uppercase">{spirit.spiritType.rarity}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1.5">
                            <Coins className="h-3 w-3 text-lumora-gold" />
                            <span className="text-xs font-black text-lumora-gold">+{production} L/H</span>
                          </div>
                          <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">{spirit.spiritType.element}</span>
                        </div>
                      </div>

                      {activeTab === 'placed' && (
                        <Button 
                          onClick={(e) => { e.stopPropagation(); handleRemove(spirit.id); }}
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {activeTab === 'unplaced' && (
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lumora-emerald bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                          <Plus className="h-5 w-5" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {groupedSpirits.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <LayoutGrid className="h-8 w-8 text-white/10" />
                   </div>
                   <p className="text-xs font-black text-white/20 uppercase tracking-widest">No hay espíritus que coincidan</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
