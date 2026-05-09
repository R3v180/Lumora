'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Swords, Zap, ArrowRightLeft, Trash2, Plus, Info, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const [selectedToSwap, setSelectedToSwap] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    const success = await onRemove(id);
    if (success) toast.success('Espíritu retirado');
  };

  const handlePlace = async (spiritId: string) => {
    // If we have a swap target, we'd need a swap API, for now we place in first empty or manual
    await onPlace(spiritId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] p-0 bg-background/95 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem]">
        <div className="mx-auto w-12 h-1.5 bg-muted/30 rounded-full mt-3 mb-2" />
        
        <Tabs defaultValue="placed" className="w-full h-full flex flex-col" onValueChange={(v) => setActiveTab(v as any)}>
          <div className="px-6 pt-2 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-fantasy font-bold bg-gradient-to-r from-lumora-emerald to-lumora-blue bg-clip-text text-transparent">
                  Gestión de Espíritus
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  {placedSpirits.length} / {maxSlots} Espacios Ocupados
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/5">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 rounded-xl h-11">
              <TabsTrigger value="placed" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all gap-2">
                <LayoutGrid className="h-4 w-4" />
                Equipados
              </TabsTrigger>
              <TabsTrigger value="unplaced" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all gap-2">
                <List className="h-4 w-4" />
                Reserva ({unplacedSpirits.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 pb-20">
            <TabsContent value="placed" className="mt-0 space-y-3 outline-none">
              {placedSpirits.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Shield className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No tienes espíritus en la isla</p>
                  <Button onClick={() => setActiveTab('unplaced')} variant="outline" className="rounded-xl border-white/10">
                    Ir a Reserva
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {placedSpirits.map((spirit) => (
                    <motion.div
                      layout
                      key={spirit.id}
                      className="glass-card-subtle p-3 rounded-2xl border border-white/5 flex items-center gap-4 group"
                    >
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10`}>
                          <img 
                            src={`/assets/symbols/sym_${spirit.spiritType.element}_${spirit.spiritType.rarity}.png`} 
                            className="w-10 h-10 object-contain"
                            alt={spirit.spiritType.name}
                          />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-lumora-purple text-[10px] font-bold px-1.5 py-0.5 rounded-lg border border-white/20 shadow-lg">
                          {spirit.level}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate">{spirit.spiritType.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] uppercase border-white/5 bg-white/5 px-1.5 py-0">
                            {spirit.spiritType.element}
                          </Badge>
                          <span className="text-[10px] text-lumora-gold font-bold">
                            ✨ +{spirit.spiritType.lumensPerHour}/h
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          onClick={() => handleRemove(spirit.id)}
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="unplaced" className="mt-0 space-y-3 outline-none">
              {unplacedSpirits.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <p className="text-sm text-muted-foreground">No tienes espíritus en reserva</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pb-10">
                  {unplacedSpirits.map((spirit) => (
                    <motion.div
                      layout
                      key={spirit.id}
                      whileTap={{ scale: 0.98 }}
                      className="glass-card-subtle p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-2 relative group cursor-pointer"
                      onClick={() => handlePlace(spirit.id)}
                    >
                      <div className={`w-full aspect-square rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10`}>
                        <img 
                          src={`/assets/symbols/sym_${spirit.spiritType.element}_${spirit.spiritType.rarity}.png`} 
                          className="w-14 h-14 object-contain"
                          alt={spirit.spiritType.name}
                        />
                      </div>
                      <div className="absolute top-2 right-2 bg-lumora-purple text-[10px] font-bold px-1.5 py-0.5 rounded-lg border border-white/20">
                        {spirit.level}
                      </div>
                      
                      <div className="text-center w-full">
                        <h4 className="text-[11px] font-bold truncate">{spirit.spiritType.name}</h4>
                        <p className="text-[9px] text-lumora-gold font-bold">+{spirit.spiritType.lumensPerHour}/h</p>
                      </div>

                      <div className="absolute inset-0 bg-lumora-emerald/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center border-2 border-lumora-emerald/40">
                         <Plus className="h-6 w-6 text-lumora-emerald" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
