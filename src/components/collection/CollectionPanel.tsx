'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Search, 
  Zap, 
  TrendingUp, 
  Info
} from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import { useGameStore } from '@/lib/store';
import { ELEMENT_EMOJIS, ELEMENT_COLORS } from '@/game/engine/symbols';
import { SymbolIcon } from '@/components/game/SymbolIcon';
import { SpiritDetailView } from './SpiritDetailView';
import { CollectionFilters, type ElementFilter, type SortOption } from './CollectionFilters';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type Element = 'fire' | 'water' | 'dream' | 'nature' | 'star';

export function CollectionPanel() {
  const t = useTranslations('home');
  const { player, isLoading } = usePlayer();
  
  // Real-time stats from store
  const totalPower = useGameStore(s => s.totalPower);
  const collectionMultiplier = useGameStore(s => s.collectionMultiplier);
  
  const [filterElement, setFilterElement] = useState<ElementFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [search, setSearch] = useState('');
  const [selectedSpirit, setSelectedSpirit] = useState<any | null>(null);

  if (isLoading) return <div className="p-8 text-center animate-pulse text-lumora-purple font-fantasy">Explorando el nexo onírico...</div>;
  if (!player) return null;

  const allSpirits = player.spirits || [];

  // Grouping Logic
  const groupedSpirits = allSpirits.reduce((acc: any, s: any) => {
    const typeId = s.spiritType.id;
    if (!acc[typeId]) {
      acc[typeId] = {
        id: typeId,
        type: s.spiritType,
        instances: [],
        representative: s,
        count: 0
      };
    }
    acc[typeId].instances.push(s);
    acc[typeId].count++;
    
    // Representative is the highest level/xp spirit
    const sExp = (s as any).experience || 0;
    const rExp = (acc[typeId].representative as any).experience || 0;

    if (s.level > acc[typeId].representative.level || 
       (s.level === acc[typeId].representative.level && sExp > rExp)) {
      acc[typeId].representative = s;
    }
    return acc;
  }, {});

  const spiritGroups = Object.values(groupedSpirits);

  // Filtering & Sorting Logic (Applied to Groups)
  const filteredGroups = spiritGroups
    .filter((g: any) => {
      const matchElement = filterElement === 'all' || g.type.element === filterElement;
      const matchSearch = g.type.name.toLowerCase().includes(search.toLowerCase());
      return matchElement && matchSearch;
    })
    .sort((a: any, b: any) => {
      if (sortOption === 'power') {
        const powerA = (a.type.basePower || 0) * (1 + (a.representative.level - 1) * 0.1);
        const powerB = (b.type.basePower || 0) * (1 + (b.representative.level - 1) * 0.1);
        return powerB - powerA;
      }
      if (sortOption === 'level') return b.representative.level - a.representative.level;
      if (sortOption === 'rarity') {
        const rarities = { legendary: 4, epic: 3, rare: 2, uncommon: 1, common: 0 };
        return rarities[b.type.rarity as keyof typeof rarities] - rarities[a.type.rarity as keyof typeof rarities];
      }
      return b.count - a.count; // Default to count if recent not available
    });

  return (
    <div className="flex flex-col h-full bg-background/95">
      {/* Header Info */}
      <div className="p-4 bg-gradient-to-b from-lumora-purple/10 to-transparent border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-fantasy font-bold text-lumora-gold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Tu Colección
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Nexo Espiritual</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-lumora-pink">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-bold">x{collectionMultiplier.toFixed(3)}</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Bono de Giro</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card-subtle p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-lumora-blue" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Poder Total</span>
            </div>
            <span className="text-xl font-bold font-title">{totalPower.toLocaleString()}</span>
          </div>
          <div className="glass-card-subtle p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-3.5 w-3.5 text-lumora-purple" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Santuario</span>
            </div>
            <span className="text-xl font-bold font-title">Lv. {player.level}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:outline-none focus:border-lumora-purple/50 transition-all focus:bg-white/10"
          />
        </div>

        <CollectionFilters 
          currentElement={filterElement}
          onElementChange={setFilterElement}
          currentSort={sortOption}
          onSortChange={setSortOption}
          totalCount={filteredGroups.length}
        />
      </div>

      {/* Spirit Grid */}
      <div className="flex-1 px-4 pb-24 overflow-y-auto no-scrollbar">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground opacity-20" />
            </div>
            <p className="text-sm text-muted-foreground font-fantasy">No se encontraron espíritus con estos filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 lg:gap-4">
            <AnimatePresence mode='popLayout'>
              {filteredGroups.map((group: any) => (
                <motion.div
                  layout
                  key={group.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                  onClick={() => setSelectedSpirit(group)}
                >
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden glass-card hover:border-white/20 transition-all">
                     <SymbolIcon 
                       symbol={{
                         ...group.type,
                         symbolType: 'spirit',
                       } as any}
                     />
                     
                     {/* Multiplier Badge */}
                     {group.count > 1 && (
                       <div className="absolute top-1.5 left-1.5 bg-lumora-gold/80 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/20 shadow-lg z-10">
                          <span className="text-[9px] font-black text-black">x{group.count}</span>
                       </div>
                     )}

                     <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10">
                        <span className="text-[8px] font-black text-white">L{group.representative.level}</span>
                     </div>
                     
                     {/* XP Progress Mini-Bar */}
                     <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                        <motion.div 
                          className="h-full bg-lumora-blue"
                          style={{ backgroundColor: ELEMENT_COLORS[group.type.element as keyof typeof ELEMENT_COLORS] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((group.representative.experience || 0) / (group.representative.level * 50)) * 100)}%` }}
                        />
                     </div>
                  </div>
                  
                  <span className="text-[10px] font-bold truncate w-full text-center text-muted-foreground group-hover:text-white transition-colors uppercase tracking-tighter">
                    {group.type.name}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Rarity Legend */}
      <div className="p-4 border-t border-white/5 bg-black/20 text-[10px] text-muted-foreground flex justify-around">
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" /> 10</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-lumora-emerald rounded-full" /> 25</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-lumora-blue rounded-full" /> 60</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-lumora-purple rounded-full" /> 150</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-lumora-gold rounded-full" /> 400</div>
            </div>

      {/* Spirit Detail Bottom Sheet */}
      <AnimatePresence>
        {selectedSpirit && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSpirit(null)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <SpiritDetailView 
              spirit={selectedSpirit} 
              onClose={() => setSelectedSpirit(null)} 
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
