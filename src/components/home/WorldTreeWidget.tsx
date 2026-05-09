'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TreePine, Flame, Droplets, Moon, Leaf, Star, Gift, Zap, Heart, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { usePlayer } from '@/hooks/usePlayer';
import { toast } from 'sonner';
import { useGameStore, PlayerState } from '@/lib/store';

type ElementKey = 'fire' | 'water' | 'dream' | 'nature' | 'star';

interface WorldTreeData {
  treeLevel: number;
  progress: {
    current: number;
    needed: number;
    percent: number;
    spinsRemaining: number;
  };
  totalSpins: number;
  elements: Record<ElementKey, number>;
  dominantElement: ElementKey;
  milestones: { level: number; reached: boolean }[];
  buffs: {
    lumensMultiplier: number;
    energyRegenBonus: number;
    rareSpiritBonus: number;
    bonusGameChance: number;
  };
  activeBuffs: { type: string; value: number; label: string }[];
  totalPlayers: number;
  communityGoal: number;
}

const ELEMENT_CONFIG: Record<ElementKey, { emoji: string; color: string; bgClass: string; borderClass: string; glowClass: string; icon: typeof Flame }> = {
  fire: {
    emoji: '🔥',
    color: 'text-lumora-fire',
    bgClass: 'bg-lumora-fire/20',
    borderClass: 'border-lumora-fire/40',
    glowClass: 'glow-gold',
    icon: Flame,
  },
  water: {
    emoji: '💧',
    color: 'text-lumora-water',
    bgClass: 'bg-lumora-water/20',
    borderClass: 'border-lumora-water/40',
    glowClass: 'shadow-[0_0_20px_rgba(52,152,219,0.4)]',
    icon: Droplets,
  },
  dream: {
    emoji: '🌙',
    color: 'text-lumora-dream',
    bgClass: 'bg-lumora-dream/20',
    borderClass: 'border-lumora-dream/40',
    glowClass: 'shadow-[0_0_20px_rgba(221,160,221,0.4)]',
    icon: Moon,
  },
  nature: {
    emoji: '🌿',
    color: 'text-lumora-nature',
    bgClass: 'bg-lumora-nature/20',
    borderClass: 'border-lumora-nature/40',
    glowClass: 'glow-emerald',
    icon: Leaf,
  },
  star: {
    emoji: '⭐',
    color: 'text-lumora-star',
    bgClass: 'bg-lumora-star/20',
    borderClass: 'border-lumora-star/40',
    glowClass: 'shadow-[0_0_20px_rgba(241,196,15,0.4)]',
    icon: Star,
  },
};

// Floating leaf/sparkle particle component
function TreeParticle({ delay, x, duration }: { delay: number; x: number; duration: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: '30%' }}
      initial={{ opacity: 0, y: 0, scale: 1 }}
      animate={{
        opacity: [0, 0.8, 0.5, 0],
        y: [-10, -60, -120],
        x: [0, (Math.random() - 0.5) * 40],
        scale: [0.5, 1, 0.3],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    >
      <span className="text-xs">
        {Math.random() > 0.5 ? '✨' : '🍃'}
      </span>
    </motion.div>
  );
}

// ─── Procedural SVG Tree ───────────────────────────────────────────
const ELEMENT_COLORS: Record<ElementKey, { leaf: string; glow: string; accent: string }> = {
  fire:   { leaf: '#ff6b35', glow: '#ff4500', accent: '#ffd700' },
  water:  { leaf: '#3498db', glow: '#2980b9', accent: '#85e0ff' },
  dream:  { leaf: '#dda0dd', glow: '#9b59b6', accent: '#e8b4f8' },
  nature: { leaf: '#27ae60', glow: '#2ecc71', accent: '#a8e6cf' },
  star:   { leaf: '#f1c40f', glow: '#f39c12', accent: '#fff9c4' },
};

function ProceduralTree({ level, dominantElement }: { level: number; dominantElement: ElementKey }) {
  const ec = ELEMENT_COLORS[dominantElement];
  const branches = Math.min(Math.floor(level / 2) + 2, 12);
  const leafRadius = Math.min(20 + level * 3, 65);
  const glowRadius = leafRadius + 15;
  const trunkH = Math.min(30 + level * 2, 60);
  const leafClusters = Math.min(3 + Math.floor(level / 3), 10);
  const sparkles = Math.min(Math.floor(level / 4), 8);

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="treeGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="leafGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="coreGlow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={ec.glow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={ec.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a3a1a" />
          <stop offset="50%" stopColor="#3d2510" />
          <stop offset="100%" stopColor="#2a1a08" />
        </linearGradient>
      </defs>

      {/* Ambient glow */}
      <circle cx="100" cy={100 - trunkH * 0.3} r={glowRadius} fill="url(#coreGlow)" />

      {/* Trunk */}
      <path
        d={`M94,${160} Q92,${160 - trunkH * 0.5} 96,${160 - trunkH} L104,${160 - trunkH} Q108,${160 - trunkH * 0.5} 106,${160} Z`}
        fill="url(#trunkGrad)"
        stroke="#4a2a0a"
        strokeWidth="0.5"
      />

      {/* Roots */}
      {level >= 3 && (
        <>
          <path d={`M94,160 Q80,162 72,168`} fill="none" stroke="#3d2510" strokeWidth="3" strokeLinecap="round" />
          <path d={`M106,160 Q120,162 128,168`} fill="none" stroke="#3d2510" strokeWidth="3" strokeLinecap="round" />
          {level >= 10 && <path d={`M98,162 Q85,170 78,174`} fill="none" stroke="#3d2510" strokeWidth="2" strokeLinecap="round" />}
        </>
      )}

      {/* Branches */}
      {Array.from({ length: branches }).map((_, i) => {
        const angle = (i / branches) * Math.PI * 1.4 - Math.PI * 0.7;
        const len = 15 + Math.random() * 20 + level;
        const startY = 160 - trunkH * (0.3 + (i / branches) * 0.6);
        const endX = 100 + Math.cos(angle) * len;
        const endY = startY + Math.sin(angle) * len * 0.5 - 10;
        const cpX = 100 + Math.cos(angle) * len * 0.5;
        const cpY = startY - 5;
        return (
          <path
            key={`b${i}`}
            d={`M100,${startY} Q${cpX},${cpY} ${endX},${endY}`}
            fill="none"
            stroke="#4a2a0a"
            strokeWidth={Math.max(1, 3 - i * 0.2)}
            strokeLinecap="round"
            opacity={0.8}
          />
        );
      })}

      {/* Leaf clusters */}
      {Array.from({ length: leafClusters }).map((_, i) => {
        const angle = (i / leafClusters) * Math.PI * 2;
        const dist = leafRadius * (0.4 + Math.random() * 0.6);
        const cx = 100 + Math.cos(angle) * dist;
        const cy = (100 - trunkH * 0.3) + Math.sin(angle) * dist * 0.7;
        const r = 8 + Math.random() * 12 + level * 0.5;
        return (
          <circle
            key={`l${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill={ec.leaf}
            opacity={0.25 + Math.random() * 0.2}
            filter="url(#leafGlow)"
          />
        );
      })}

      {/* Main canopy */}
      <ellipse
        cx="100"
        cy={100 - trunkH * 0.3}
        rx={leafRadius}
        ry={leafRadius * 0.8}
        fill={ec.leaf}
        opacity="0.18"
        filter="url(#leafGlow)"
      />

      {/* Sparkle orbs */}
      {Array.from({ length: sparkles }).map((_, i) => {
        const angle = (i / sparkles) * Math.PI * 2 + 0.3;
        const dist = leafRadius * 0.6;
        const cx = 100 + Math.cos(angle) * dist;
        const cy = (100 - trunkH * 0.3) + Math.sin(angle) * dist * 0.7;
        return (
          <circle
            key={`s${i}`}
            cx={cx}
            cy={cy}
            r={2 + Math.random() * 2}
            fill={ec.accent}
            opacity={0.6 + Math.random() * 0.4}
            filter="url(#treeGlow)"
          />
        );
      })}

      {/* Crown gem for high levels */}
      {level >= 16 && (
        <>
          <circle cx="100" cy={100 - trunkH * 0.3 - leafRadius * 0.5} r="5" fill={ec.accent} filter="url(#treeGlow)" opacity="0.9" />
          <circle cx="100" cy={100 - trunkH * 0.3 - leafRadius * 0.5} r="2" fill="white" opacity="0.8" />
        </>
      )}
    </svg>
  );
}

// Element Orb component orbiting the tree
function ElementOrb({
  element,
  amount,
  isDominant,
  angle,
  radius,
}: {
  element: ElementKey;
  amount: number;
  isDominant: boolean;
  angle: number;
  radius: number;
}) {
  const config = ELEMENT_CONFIG[element];
  const size = Math.min(40, Math.max(24, 16 + Math.log10(Math.max(1, amount)) * 8));

  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * 0.6; // Elliptical orbit

  return (
    <motion.div
      className="absolute top-1/2 left-1/2"
      style={{
        marginLeft: x - size / 2,
        marginTop: y - size / 2,
      }}
      animate={{
        marginLeft: [x - size / 2, x - size / 2 + 3, x - size / 2],
        marginTop: [y - size / 2, y - size / 2 - 5, y - size / 2],
      }}
      transition={{ duration: 1.5 + Math.random(), repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className={`rounded-full flex items-center justify-center border-2 ${config.borderClass} ${config.bgClass} ${isDominant ? config.glowClass : ''}`}
        style={{ width: size, height: size }}
        animate={isDominant ? { scale: [1, 1.2, 1] } : { scale: [1, 1.08, 1] }}
        transition={{ duration: isDominant ? 1.2 : 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
      </motion.div>
      {amount > 0 && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[8px] text-muted-foreground font-medium">
            {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function WorldTreeWidget() {
  const t = useTranslations('worldTree');
  const tHome = useTranslations('home');
  const { player } = usePlayer();
  const [treeData, setTreeData] = useState<WorldTreeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContributeDialog, setShowContributeDialog] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementKey>('fire');
  const [contributeAmount, setContributeAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isContributing, setIsContributing] = useState(false);
  const [contributeResult, setContributeResult] = useState<{
    success: boolean;
    element: string;
    amount: number;
  } | null>(null);

  // Correctly fetch all element points at once to follow Hook rules
  const allPoints = useGameStore(s => ({
    fire: s.globalFire,
    water: s.globalWater,
    dream: s.globalDream,
    nature: s.globalNature,
    star: s.globalStar,
  }));

  const fetchTreeData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/world-tree');
      if (res.ok) {
        const data = await res.json();
        setTreeData(data);
      }
    } catch (err) {
      console.error('Failed to fetch world tree:', err);
      setError('Error al cargar Árbol del Mundo');
      toast.error('Error al cargar Árbol del Mundo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTreeData();
    const interval = setInterval(fetchTreeData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchTreeData]);

  const handleContribute = async () => {
    if (!selectedElement || !contributeAmount || contributeAmount < 1) return;

    setIsContributing(true);
    try {
      const res = await fetch('/api/world-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'contribute',
          element: selectedElement,
          amount: contributeAmount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setContributeResult({
          success: true,
          element: selectedElement,
          amount: contributeAmount,
        });
        fetchTreeData();
        useGameStore.getState().triggerRefresh();
      } else {
        const data = await res.json();
        setContributeResult({
          success: false,
          element: selectedElement,
          amount: contributeAmount,
        });
      }
    } catch (err) {
      console.error('Failed to contribute to world tree:', err);
      setContributeResult({
        success: false,
        element: selectedElement,
        amount: contributeAmount,
      });
      toast.error('Error al contribuir');
    } finally {
      setIsContributing(false);
    }
  };

  const handlePresetAmount = (amount: number) => {
    setContributeAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setContributeAmount(parsed);
    }
  };

  const getTreeImage = (level: number) => {
    if (level >= 21) return '/assets/world_tree/tree_lvl_max.png';
    if (level >= 11) return '/assets/world_tree/tree_lvl3.png';
    if (level >= 6) return '/assets/world_tree/tree_lvl2.png';
    return '/assets/world_tree/tree_lvl1.png';
  };

  const getTreeSize = (level: number) => {
    if (level >= 21) return 'h-40 w-40';
    if (level >= 16) return 'h-36 w-36';
    if (level >= 11) return 'h-32 w-32';
    if (level >= 6) return 'h-28 w-28';
    if (level >= 3) return 'h-24 w-24';
    return 'h-20 w-20';
  };

  const getGlowIntensity = (level: number) => {
    if (level >= 21) return 'from-lumora-gold/30 via-lumora-purple/30 to-lumora-emerald/30';
    if (level >= 16) return 'from-lumora-gold/25 via-lumora-purple/25 to-lumora-emerald/25';
    if (level >= 11) return 'from-lumora-gold/20 via-lumora-purple/20 to-lumora-emerald/20';
    if (level >= 6) return 'from-lumora-gold/15 via-lumora-purple/15 to-lumora-emerald/15';
    return 'from-lumora-purple/10 via-lumora-gold/10 to-lumora-blue/10';
  };

  if (error) {
    return (
      <div className="relative z-10 flex flex-col items-center mb-8">
        <TreePine className="h-16 w-16 text-lumora-emerald/30 mb-4" />
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" onClick={() => { setIsLoading(true); fetchTreeData(); }} className="rounded-xl">
          Reintentar
        </Button>
      </div>
    );
  }

  if (isLoading || !treeData) {
    return (
      <div className="relative z-10 flex flex-col items-center mb-8 animate-pulse">
        <div className="w-48 h-48 rounded-full bg-muted/20 flex items-center justify-center">
          <TreePine className="h-24 w-24 text-lumora-emerald/30" />
        </div>
        <div className="h-5 w-32 rounded bg-muted/20 mt-2" />
        <div className="h-3 w-20 rounded bg-muted/20 mt-1" />
      </div>
    );
  }

  const level = treeData.treeLevel;
  const dominant = treeData.dominantElement;

  return (
    <div className="relative z-10 flex flex-col items-center mb-8">
      {/* Tree Visual Container */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: 240, height: 240 }}
      >
        {/* Glowing ring behind tree */}
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${getGlowIntensity(level)} blur-xl`}
          animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.8, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Element Orbs orbiting the tree */}
        {(['fire', 'water', 'dream', 'nature', 'star'] as ElementKey[]).map(
          (element, index) => {
            const baseAngle = (index / 5) * Math.PI * 2 - Math.PI / 2;
            const orbRadius = 90 + (level >= 10 ? 10 : 0);
            return (
              <ElementOrb
                key={element}
                element={element}
                amount={treeData.elements[element]}
                isDominant={dominant === element}
                angle={baseAngle}
                radius={orbRadius}
              />
            );
          }
        )}

        {/* Central tree */}
        <motion.div
          className="relative flex items-center justify-center"
          animate={{ y: [0, -8, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className={`${getTreeSize(level)} flex items-center justify-center relative`}>
            {/* Tree trunk glow */}
            <motion.div
              className="absolute inset-0 rounded-full blur-md"
              style={{
                background: `radial-gradient(circle, ${
                  dominant === 'fire' ? 'rgba(255,107,53,0.15)' :
                  dominant === 'water' ? 'rgba(52,152,219,0.15)' :
                  dominant === 'dream' ? 'rgba(221,160,221,0.15)' :
                  dominant === 'nature' ? 'rgba(39,174,96,0.15)' :
                  'rgba(241,196,15,0.15)'
                }, transparent)`,
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Procedural SVG Tree */}
            <ProceduralTree level={level} dominantElement={dominant} />

            {/* Branch sparkles for higher levels */}
            {level >= 10 && (
              <>
                <motion.div
                  className="absolute top-0 right-0"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                >
                  <Sparkles className="h-4 w-4 text-lumora-gold" />
                </motion.div>
                <motion.div
                  className="absolute top-4 left-0"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                >
                  <Sparkles className="h-3 w-3 text-lumora-pink" />
                </motion.div>
                {level >= 16 && (
                  <motion.div
                    className="absolute bottom-2 right-2"
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.7, 1.3, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1.2 }}
                  >
                    <Sparkles className="h-5 w-5 text-lumora-star" />
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Floating particles */}
        {level >= 3 &&
          Array.from({ length: Math.min(level, 8) }).map((_, i) => (
            <TreeParticle
              key={i}
              delay={i * 0.8}
              x={20 + (i * 60) / Math.min(level, 8)}
              duration={3 + Math.random() * 2}
            />
          ))}
      </motion.div>

      {/* Level badge */}
      <div className="flex flex-col items-center mt-2 mb-2">
        <Badge
          variant="outline"
          className="text-sm font-fantasy font-bold border-lumora-gold/30 text-lumora-gold px-3 py-1"
        >
          {t('level', { level })}
        </Badge>
      </div>

      {/* XP Progress */}
      <div className="w-56 flex flex-col items-center gap-1 mb-3">
        <div className="w-full flex justify-between text-[10px] text-muted-foreground px-1">
          <span>{t('progress')}</span>
          <span>{treeData.progress.percent}%</span>
        </div>
        <Progress value={treeData.progress.percent} className="h-2 w-full" />
        <span className="text-[10px] text-muted-foreground">
          {t('spinsToNext', { count: treeData.progress.spinsRemaining.toLocaleString() })}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-lg font-fantasy font-bold bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple bg-clip-text text-transparent">
        {tHome('worldTree')}
      </h2>

      {/* Dominant Element */}
      <div className="flex items-center gap-1.5 mt-1 mb-2">
        <span className="text-xs text-muted-foreground">{t('dominantElement')}:</span>
        <span className="text-sm">{ELEMENT_CONFIG[dominant].emoji}</span>
        <span className={`text-xs font-medium ${ELEMENT_CONFIG[dominant].color}`}>
          {t(`elements.${dominant}`)}
        </span>
      </div>

      {/* Active Buffs */}
      {treeData.activeBuffs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 justify-center max-w-xs">
          {treeData.activeBuffs.map((buff) => (
            <Badge
              key={buff.type}
              variant="secondary"
              className="text-[10px] gap-1 px-2 py-0.5 bg-lumora-purple/10 border border-lumora-purple/20 text-lumora-purple"
            >
              {buff.type === 'lumensBonus' && <Zap className="h-2.5 w-2.5" />}
              {buff.type === 'energyRegen' && <ChevronUp className="h-2.5 w-2.5" />}
              {buff.type === 'rareSpiritBonus' && <Sparkles className="h-2.5 w-2.5" />}
              {buff.type === 'bonusChance' && <Gift className="h-2.5 w-2.5" />}
              {buff.type === 'lumensBonus' && t('lumensBonus', { percent: buff.value })}
              {buff.type === 'energyRegen' && t('energyRegen', { amount: buff.value })}
              {buff.type === 'rareSpiritBonus' && t('rareSpiritBonus', { percent: buff.value })}
              {buff.type === 'bonusChance' && t('bonusChance', { percent: buff.value })}
            </Badge>
          ))}
        </div>
      )}

      {/* No buffs message */}
      {treeData.activeBuffs.length === 0 && (
        <p className="text-[10px] text-muted-foreground mb-3">{t('noBuffs')}</p>
      )}

      {/* Altar Button */}
      {player && (
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => {
              setShowContributeDialog(true);
              setContributeResult(null);
            }}
            variant="outline"
            className="rounded-full gap-2 border-lumora-emerald/30 text-lumora-emerald hover:bg-lumora-emerald/10 hover:text-lumora-emerald text-xs px-4 py-2 bg-lumora-emerald/5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            ALTAR DE OFRENDAS
          </Button>
        </motion.div>
      )}

      {/* Total Contributions */}
      <div className="flex items-center gap-1 mt-2">
        <span className="text-[10px] text-muted-foreground">{t('totalContributions')}:</span>
        <span className="text-[10px] font-medium text-foreground">
          {Object.values(treeData.elements).reduce((sum, v) => sum + v, 0).toLocaleString()}
        </span>
      </div>

      {/* Community Goal */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground">{t('globalGoal')}:</span>
        <span className="text-[10px] font-medium text-lumora-purple">
          {treeData.communityGoal.toLocaleString()} {t('spinsToNext', { count: '' }).replace(/ /g, '')}
        </span>
      </div>

      {/* Contribute Dialog */}
      <Dialog open={showContributeDialog} onOpenChange={setShowContributeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-fantasy text-xl flex items-center gap-2">
              <TreePine className="h-5 w-5 text-lumora-emerald" />
              Altar del Árbol del Mundo
            </DialogTitle>
            <DialogDescription>
              Ofrece tus puntos elementales al Árbol para recibir bendiciones y Lumens.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {contributeResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center py-6 gap-3"
              >
                {contributeResult.success ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                      className="text-4xl"
                    >
                      {ELEMENT_CONFIG[contributeResult.element as ElementKey].emoji}
                    </motion.div>
                    <p className="text-sm text-foreground font-medium text-center">
                      {t('contributePreview', {
                        amount: contributeResult.amount.toLocaleString(),
                        element: t(`elements.${contributeResult.element}`),
                      })}
                    </p>
                    <p className="text-xs text-lumora-emerald font-medium">✓</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">💫</span>
                    <p className="text-sm text-muted-foreground text-center">
                      Error
                    </p>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Element Selector */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-3 block text-center">
                    ¿Qué elemento deseas ofrecer hoy?
                  </label>
                  <div className="grid grid-cols-5 gap-2 justify-center">
                    {(['fire', 'water', 'dream', 'nature', 'star'] as ElementKey[]).map(
                      (element) => {
                        const config = ELEMENT_CONFIG[element];
                        const isSelected = selectedElement === element;
                        const points = allPoints[element] || 0;
                        
                        return (
                          <motion.button
                            key={element}
                            onClick={() => setSelectedElement(element)}
                            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                              isSelected
                                ? `${config.borderClass} ${config.bgClass} ${config.glowClass}`
                                : 'border-transparent bg-white/5 hover:bg-white/10'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span className="text-xl">{config.emoji}</span>
                            <span className="text-[10px] font-bold text-white">
                              {points}
                            </span>
                          </motion.button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Amount Selector */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    {t('contributeAmount')}
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[100, 500, 1000].map((preset) => (
                      <Button
                        key={preset}
                        variant={contributeAmount === preset && !customAmount ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={() => handlePresetAmount(preset)}
                      >
                        {preset} ✨
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Custom"
                      value={customAmount}
                      onChange={(e) => handleCustomAmount(e.target.value)}
                      className="flex-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-lumora-gold/50"
                      min="1"
                    />
                  </div>
                </div>

                {/* Preview Recompensa */}
                <div className="rounded-2xl bg-lumora-emerald/10 border border-lumora-emerald/30 p-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-lumora-emerald font-bold">
                    <Zap className="h-4 w-4" />
                    <span>RECOMPENSA ESTIMADA</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-fantasy font-bold text-lumora-gold">
                      ✨ +{(contributeAmount * 10).toLocaleString()} Lumens
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      +{Math.floor(contributeAmount * 2)} EXP de Jugador
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter className="gap-2 sm:gap-0">
            {contributeResult ? (
              <DialogClose asChild>
                <Button variant="outline" className="rounded-full">
                  OK
                </Button>
              </DialogClose>
            ) : (
              <>
                <DialogClose asChild>
                  <Button variant="ghost" className="rounded-full text-xs">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleContribute}
                  disabled={
                    isContributing ||
                    contributeAmount < 1 ||
                    (player ? player.lumens < contributeAmount : true)
                  }
                  className="rounded-full gap-2 bg-gradient-to-r from-lumora-gold to-lumora-pink text-white text-xs"
                >
                  {isContributing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </motion.div>
                  ) : (
                    <Heart className="h-3.5 w-3.5" />
                  )}
                  {t('contribute')} {contributeAmount} ✨
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
