'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  Sparkles, 
  Zap, 
  ChevronUp, 
  Gift, 
  Star,
  TreePine,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// We reuse the ProceduralTree logic but simplified for the modal
function EvolutionPreview({ level, dominantElement, size = 120 }: { level: number; dominantElement: any, size?: number }) {
  // Re-implementing the core SVG logic from WorldTreeWidget to ensure consistency
  const ec = {
    fire:   { leaf: '#ff6b35', glow: '#ff4500', accent: '#ffd700' },
    water:  { leaf: '#3498db', glow: '#2980b9', accent: '#85e0ff' },
    dream:  { leaf: '#dda0dd', glow: '#9b59b6', accent: '#e8b4f8' },
    nature: { leaf: '#27ae60', glow: '#2ecc71', accent: '#a8e6cf' },
    star:   { leaf: '#f1c40f', glow: '#f39c12', accent: '#fff9c4' },
  }[dominantElement as 'fire'|'water'|'dream'|'nature'|'star'] || { leaf: '#27ae60', glow: '#2ecc71', accent: '#a8e6cf' };

  const branches = Math.min(Math.floor(level / 2) + 2, 12);
  const leafRadius = Math.min(20 + level * 3, 65);
  const trunkH = Math.min(30 + level * 2, 60);
  const leafClusters = Math.min(3 + Math.floor(level / 3), 10);

  return (
    <svg viewBox="0 0 200 200" style={{ width: size, height: size }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`coreGlow-${level}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={ec.glow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={ec.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy={100 - trunkH * 0.3} r={leafRadius + 15} fill={`url(#coreGlow-${level})`} />
      <path
        d={`M94,160 Q92,${160 - trunkH * 0.5} 96,${160 - trunkH} L104,${160 - trunkH} Q108,${160 - trunkH * 0.5} 106,160 Z`}
        fill="#3d2510"
      />
      {Array.from({ length: branches }).map((_, i) => {
        const angle = (i / branches) * Math.PI * 1.4 - Math.PI * 0.7;
        const len = 15 + level;
        const startY = 160 - trunkH * (0.3 + (i / branches) * 0.6);
        const endX = 100 + Math.cos(angle) * len;
        const endY = startY + Math.sin(angle) * len * 0.5 - 10;
        return (
          <path key={i} d={`M100,${startY} Q100,${startY-5} ${endX},${endY}`} fill="none" stroke="#3d2510" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        );
      })}
      {Array.from({ length: leafClusters }).map((_, i) => {
        const angle = (i / leafClusters) * Math.PI * 2;
        const dist = leafRadius * (0.4 + Math.random() * 0.4);
        const cx = 100 + Math.cos(angle) * dist;
        const cy = (100 - trunkH * 0.3) + Math.sin(angle) * dist * 0.7;
        return <circle key={i} cx={cx} cy={cy} r={8 + level * 0.5} fill={ec.leaf} opacity="0.4" />;
      })}
      {level >= 16 && <circle cx="100" cy={100 - trunkH * 0.3 - leafRadius * 0.5} r="5" fill={ec.accent} opacity="0.9" />}
    </svg>
  );
}

interface Milestone {
  level: number;
  name: string;
  benefits: { icon: any; label: string; value: string }[];
}

const MILESTONES: Milestone[] = [
  {
    level: 6,
    name: "Árbol Joven",
    benefits: [
      { icon: TrendingUp, label: "Multiplicador Lumens", value: "+5%" },
      { icon: Sparkles, label: "Aspecto", value: "Ramas más densas" }
    ]
  },
  {
    level: 11,
    name: "Árbol Crecido",
    benefits: [
      { icon: TrendingUp, label: "Multiplicador Lumens", value: "+10%" },
      { icon: Zap, label: "Regeneración Energía", value: "+1/tick" },
      { icon: TreePine, label: "Aspecto", value: "Raíces profundas" }
    ]
  },
  {
    level: 16,
    name: "Árbol Sagrado",
    benefits: [
      { icon: TrendingUp, label: "Multiplicador Lumens", value: "+15%" },
      { icon: Zap, label: "Regeneración Energía", value: "+2/tick" },
      { icon: Star, label: "Espíritus Raros", value: "+5% Prob." },
      { icon: Sparkles, label: "Aspecto", value: "Gema de la Copa" }
    ]
  },
  {
    level: 21,
    name: "Árbol Eterno",
    benefits: [
      { icon: TrendingUp, label: "Multiplicador Lumens", value: "+20%" },
      { icon: Zap, label: "Regeneración Energía", value: "+3/tick" },
      { icon: Star, label: "Espíritus Raros", value: "+10% Prob." },
      { icon: Gift, label: "Juegos Bonus", value: "+5% Prob." },
      { icon: Sparkles, label: "Aspecto", value: "Aura Ancestral" }
    ]
  }
];

export function TreeEvolutionModal({ isOpen, onClose, currentLevel, dominantElement }: {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  dominantElement: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[85vh] z-[210]"
          >
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-fantasy font-bold text-white flex items-center gap-2">
                  <TreePine className="h-6 w-6 text-lumora-emerald" />
                  Senda de la Evolución
                </h2>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">
                  Nivel Actual: <span className="text-lumora-gold">{currentLevel}</span>
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {MILESTONES.map((ms, idx) => {
                const isReached = currentLevel >= ms.level;
                const isNext = !isReached && (idx === 0 || currentLevel >= MILESTONES[idx-1].level);
                
                return (
                  <div key={ms.level} className="relative">
                    {/* Connection Line */}
                    {idx < MILESTONES.length - 1 && (
                      <div className="absolute left-[60px] top-[100px] bottom-[-40px] w-0.5 bg-gradient-to-b from-white/10 to-white/5" />
                    )}

                    <div className={`flex gap-6 p-4 rounded-3xl border transition-all duration-500 ${isReached ? 'bg-lumora-emerald/5 border-lumora-emerald/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : isNext ? 'bg-white/5 border-lumora-gold/30 shadow-[0_0_20px_rgba(234,179,8,0.05)]' : 'bg-white/5 border-white/5 opacity-40'}`}>
                      {/* Tree Preview */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        <div className={`w-[120px] h-[120px] rounded-2xl flex items-center justify-center relative ${isReached ? 'bg-lumora-emerald/10' : 'bg-black/40'}`}>
                          <EvolutionPreview level={ms.level} dominantElement={dominantElement} />
                          {!isReached && !isNext && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-2xl">
                               <X className="h-8 w-8 text-white/20" />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border ${isReached ? 'bg-lumora-emerald text-black border-transparent' : 'bg-background border-white/10 text-muted-foreground'}`}>
                          Nivel {ms.level}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className={`text-lg font-bold font-fantasy ${isReached ? 'text-lumora-emerald' : isNext ? 'text-lumora-gold' : 'text-white'}`}>
                            {ms.name}
                          </h3>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                            {isReached ? '✓ Hito Alcanzado' : isNext ? '✧ Próximo Objetivo' : '🔒 Bloqueado'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {ms.benefits.map((benefit, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5">
                               <div className="flex items-center gap-2">
                                  <benefit.icon className={`h-3 w-3 ${isReached ? 'text-lumora-emerald' : 'text-muted-foreground'}`} />
                                  <span className="text-[10px] font-medium text-muted-foreground">{benefit.label}</span>
                               </div>
                               <span className={`text-[10px] font-black ${isReached ? 'text-white' : 'text-muted-foreground'}`}>{benefit.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 bg-[#0f0f0f] border-t border-white/10 relative z-30">
               <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tu Contribución</p>
                     <p className="text-sm font-black text-white">Próxima Evolución: Nivel {MILESTONES.find(m => m.level > currentLevel)?.level || 'MAX'}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nivel {currentLevel}</p>
                     <p className="text-sm font-black text-lumora-gold">
                        {Math.floor((currentLevel / 21) * 100)}% Completado
                     </p>
                  </div>
               </div>
               <Button onClick={onClose} className="w-full py-6 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all">
                  Volver al Árbol
               </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
