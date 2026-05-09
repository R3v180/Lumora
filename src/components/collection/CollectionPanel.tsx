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

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type Element = 'fire' | 'water' | 'dream' | 'nature' | 'star';

export function CollectionPanel() {
  const t = useTranslations('home');
  const { player, isLoading } = usePlayer();
  
  // Real-time stats from store
  const totalPower = useGameStore(s => s.totalPower);
  const collectionMultiplier = useGameStore(s => s.collectionMultiplier);
  
  const [filterElement, setFilterElement] = useState<Element | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [search, setSearch] = useState('');

  if (isLoading) return <div className="p-8 text-center animate-pulse">Cargando colección...</div>;
  if (!player) return null;

  // We fetch all spirits for the collection view
  const allSpirits = player.spirits || [];

  const filteredSpirits = allSpirits.filter(s => {
    const matchElement = filterElement === 'all' || s.spiritType.element === filterElement;
    const matchRarity = filterRarity === 'all' || s.spiritType.rarity === filterRarity;
    const matchSearch = s.spiritType.name.toLowerCase().includes(search.toLowerCase());
    return matchElement && matchRarity && matchSearch;
  });

  return (
    <div className="flex flex-col h-full bg-background/95">
      {/* Power Header */}
      <div className="p-4 bg-gradient-to-b from-lumora-purple/20 to-transparent border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-fantasy font-bold text-lumora-gold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Colección de Espíritus
            </h2>
            <p className="text-xs text-muted-foreground">Tu vínculo con el mundo onírico</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-lumora-pink">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-bold">x{collectionMultiplier.toFixed(3)}</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Bono de Giro</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="glass-card-subtle p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-lumora-blue" />
              <span className="text-xs font-semibold text-muted-foreground">Poder Total</span>
            </div>
            <span className="text-xl font-bold font-title">{totalPower.toLocaleString()}</span>
          </div>
          <div className="glass-card-subtle p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-3.5 w-3.5 text-lumora-purple" />
              <span className="text-xs font-semibold text-muted-foreground">Espíritus</span>
            </div>
            <span className="text-xl font-bold font-title">{allSpirits.length}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 space-y-3 sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Buscar espíritu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:border-lumora-purple/50"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setFilterElement('all')}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
              filterElement === 'all' 
                ? 'bg-lumora-purple/20 border-lumora-purple text-white font-bold' 
                : 'bg-white/5 border-white/10 text-muted-foreground'
            }`}
          >
            Todos
          </button>
          {(Object.keys(ELEMENT_EMOJIS) as Element[]).map(el => (
            <button 
              key={el}
              onClick={() => setFilterElement(el)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border flex items-center gap-1.5 transition-all ${
                filterElement === el 
                  ? 'bg-white/10 border-white/30 text-white font-bold' 
                  : 'bg-white/5 border-white/10 text-muted-foreground'
              }`}
              style={filterElement === el ? { borderColor: ELEMENT_COLORS[el], backgroundColor: `${ELEMENT_COLORS[el]}20` } : {}}
            >
              <span>{ELEMENT_EMOJIS[el]}</span>
              <span className="capitalize">{el}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spirit Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {filteredSpirits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2 opacity-20" />
            <p>No se encontraron espíritus</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            <AnimatePresence mode='popLayout'>
              {filteredSpirits.map((spirit) => (
                <motion.div
                  layout
                  key={spirit.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex flex-col items-center p-2 rounded-xl border aspect-square justify-center glass-card-subtle transition-all cursor-pointer group`}
                  style={{ 
                    borderColor: spirit.spiritType.rarity === 'legendary' ? '#F1C40F60' : 
                                 spirit.spiritType.rarity === 'epic' ? '#9B59B660' : 'rgba(255,255,255,0.05)'
                  }}
                >
                  <div className="relative">
                     <SymbolIcon 
                       symbol={{
                         id: `sym_${spirit.spiritType.element}_${spirit.spiritType.rarity}`,
                         symbolType: 'spirit',
                         element: spirit.spiritType.element as any,
                         rarity: spirit.spiritType.rarity as any,
                         emoji: spirit.spiritType.emoji || '👻'
                       } as any}
                       size="md"
                     />
                     <span className="absolute -bottom-1 -right-1 bg-background/80 border border-white/10 text-[8px] px-1 rounded-sm font-bold">
                       L{spirit.level}
                     </span>
                  </div>
                  
                  <span className="mt-2 text-[9px] font-bold truncate w-full text-center group-hover:text-white transition-colors">
                    {spirit.spiritType.name}
                  </span>
                  
                  <div className={`mt-1 h-0.5 w-full rounded-full opacity-50 ${
                    spirit.spiritType.rarity === 'legendary' ? 'bg-lumora-gold' :
                    spirit.spiritType.rarity === 'epic' ? 'bg-lumora-purple' :
                    spirit.spiritType.rarity === 'rare' ? 'bg-lumora-blue' :
                    spirit.spiritType.rarity === 'uncommon' ? 'bg-lumora-emerald' : 'bg-muted-foreground'
                  }`} />
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
    </div>
  );
}
