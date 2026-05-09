'use client';

import { motion } from 'framer-motion';
import { Filter, SortAsc, LayoutGrid, List } from 'lucide-react';
import { ELEMENT_EMOJIS, ELEMENT_COLORS } from '@/game/engine/symbols';

export type SortOption = 'recent' | 'power' | 'level' | 'rarity';
export type ElementFilter = 'all' | 'fire' | 'water' | 'nature' | 'dream' | 'star';

interface CollectionFiltersProps {
  currentElement: ElementFilter;
  onElementChange: (element: ElementFilter) => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
}

export function CollectionFilters({ 
  currentElement, 
  onElementChange, 
  currentSort, 
  onSortChange,
  totalCount
}: CollectionFiltersProps) {
  const elements: ElementFilter[] = ['all', 'fire', 'water', 'nature', 'dream', 'star'];

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Top row: Summary and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-lumora-purple" />
          <span className="text-sm font-fantasy font-bold text-white">
            {totalCount} Espíritus
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['recent', 'power', 'level', 'rarity'] as SortOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => onSortChange(opt)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                currentSort === opt 
                ? 'bg-lumora-purple text-white shadow-lg' 
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              {opt === 'recent' && 'NUEVO'}
              {opt === 'power' && 'PODER'}
              {opt === 'level' && 'LVL'}
              {opt === 'rarity' && 'RAR'}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom row: Element chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {elements.map((el) => {
          const isActive = currentElement === el;
          const color = el === 'all' ? '#FFF' : ELEMENT_COLORS[el as keyof typeof ELEMENT_COLORS];
          
          return (
            <button
              key={el}
              onClick={() => onElementChange(el)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all whitespace-nowrap ${
                isActive 
                ? 'bg-white/10 border-white/20' 
                : 'bg-transparent border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-white/5'
              }`}
            >
              <span className="text-sm">
                {el === 'all' ? '🌈' : ELEMENT_EMOJIS[el as keyof typeof ELEMENT_EMOJIS]}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isActive ? color : undefined }}>
                {el === 'all' ? 'Todos' : el}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="active-chip"
                  className="h-1 w-1 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
