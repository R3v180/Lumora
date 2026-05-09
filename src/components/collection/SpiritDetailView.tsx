'use client';

import { motion } from 'framer-motion';
import { 
  X, 
  Zap, 
  TrendingUp, 
  ChevronRight,
  Shield,
  Star
} from 'lucide-react';
import { SymbolIcon } from '@/components/game/SymbolIcon';
import { ELEMENT_EMOJIS, ELEMENT_COLORS } from '@/game/engine/symbols';

interface SpiritDetailViewProps {
  spirit: any;
  onClose: () => void;
  isPreview?: boolean;
  nextSpirit?: any;
}

export function SpiritDetailView({ spirit, onClose, isPreview, nextSpirit }: SpiritDetailViewProps) {
  const rarityColors: Record<string, string> = {
    common: '#94a3b8',
    uncommon: '#10b981',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#eab308'
  };

  const color = rarityColors[spirit.spiritType.rarity] || '#fff';
  const elementColor = ELEMENT_COLORS[spirit.spiritType.element as keyof typeof ELEMENT_COLORS] || '#fff';

  const POWER_MAP: Record<string, number> = {
    common: 10,
    uncommon: 25,
    rare: 60,
    epic: 150,
    legendary: 400
  };

  const basePower = POWER_MAP[spirit.spiritType.rarity] || 0;
  const levelBonus = (spirit.level - 1) * 0.1;
  const totalPower = Math.floor(basePower * (1 + levelBonus));
  const multiplierBonus = totalPower / 10000;

  const expNeeded = spirit.level * 50;
  const expProgress = (spirit.experience / expNeeded) * 100;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-x-0 bottom-0 z-[60] bg-background/95 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] shadow-2xl p-6 pb-10 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xl">{ELEMENT_EMOJIS[spirit.spiritType.element as keyof typeof ELEMENT_EMOJIS]}</span>
          </div>
          <div>
            <h3 className="text-xl font-fantasy font-bold text-white capitalize">
              {spirit.spiritType.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-white/10" style={{ color }}>
                {spirit.spiritType.rarity.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground font-bold">NIVEL {spirit.level}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Main Stats Display */}
      <div className="grid grid-cols-1 gap-4">
        {/* Comparison if isPreview */}
        {isPreview && nextSpirit ? (
          <div className="flex items-center justify-between p-4 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden">
             <div className="flex flex-col items-center gap-2 flex-1">
                <SymbolIcon symbol={{...spirit.spiritType, symbolType: 'spirit'} as any} size="md" />
                <span className="text-[10px] font-bold text-muted-foreground">ACTUAL</span>
             </div>
             <ChevronRight className="h-6 w-6 text-lumora-purple animate-pulse" />
             <div className="flex flex-col items-center gap-2 flex-1">
                <SymbolIcon symbol={{...nextSpirit, symbolType: 'spirit'} as any} size="lg" />
                <span className="text-[10px] font-bold text-lumora-gold">EVOLUCIÓN</span>
             </div>
          </div>
        ) : (
          <div className="flex justify-center py-6 relative">
            <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent opacity-50" style={{ backgroundImage: `radial-gradient(circle, ${color}30 0%, transparent 70%)` }} />
            <SymbolIcon 
              symbol={{
                id: spirit.id,
                symbolType: 'spirit',
                element: spirit.spiritType.element,
                rarity: spirit.spiritType.rarity,
                emoji: spirit.spiritType.emoji || '👻'
              } as any} 
              size="xl" 
            />
          </div>
        )}

        {/* Level & XP */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-muted-foreground">EXPERIENCIA</span>
            <span>{spirit.experience} / {expNeeded} XP</span>
          </div>
          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${expProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center italic">
            Participa en giros de {spirit.spiritType.element} para ganar experiencia
          </p>
        </div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
             <div className="flex items-center gap-2 text-lumora-blue">
               <Zap className="h-4 w-4" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Poder de Colección</span>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold font-title">{totalPower}</span>
               {isPreview && (
                 <span className="text-xs text-lumora-emerald font-bold">➔ {POWER_MAP[nextSpirit?.rarity] || '???'}</span>
               )}
             </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
             <div className="flex items-center gap-2 text-lumora-pink">
               <TrendingUp className="h-4 w-4" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Bono de Giro</span>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold font-title">+{multiplierBonus.toFixed(4)}x</span>
             </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
             <div className="flex items-center gap-2 text-lumora-purple">
               <Shield className="h-4 w-4" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Defensa Raid</span>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-xl font-bold font-title">+{Math.floor(totalPower/10)}%</span>
             </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
             <div className="flex items-center gap-2 text-lumora-gold">
               <Star className="h-4 w-4" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Producción</span>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-xl font-bold font-title">{spirit.spiritType.lumensPerHour} L/h</span>
             </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {!isPreview && (
        <div className="mt-2">
          <p className="text-center text-xs text-muted-foreground leading-relaxed px-4">
            Este espíritu de tipo <span className="text-white font-bold">{spirit.spiritType.element}</span> fortalece tu nexo con el mundo onírico, aumentando los premios de la Slot Machine y protegiendo tus Lumens de ataques enemigos.
          </p>
        </div>
      )}
    </motion.div>
  );
}
