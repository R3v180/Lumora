'use client';

import { motion } from 'framer-motion';

interface SymbolData {
  id: string;
  element: string;
  rarity: string;
  symbolType: string;
  glowColor: string;
  name?: string;
}

interface SymbolIconProps {
  symbol: SymbolData;
  size?: number | string;
  isWin?: boolean;
  isBonus?: boolean;
  isSpinning?: boolean;
}

// Rarity scale → detail intensity
const RARITY_INTENSITY: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

// ────────────────────────────────────────────────
// SVG definitions per element
// ────────────────────────────────────────────────

function FireIcon({ intensity, id }: { intensity: number; id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`fire-core-${id}`} cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="40%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#CC2200" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`fire-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
        </radialGradient>
        {intensity >= 3 && (
          <filter id={`fire-blur-${id}`}>
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        )}
      </defs>
      {/* Outer glow */}
      <ellipse cx="32" cy="48" rx="18" ry="8" fill={`url(#fire-glow-${id})`} />
      {/* Main flame body */}
      <path
        d="M32 8 C32 8 44 22 44 34 C44 44 38 50 32 50 C26 50 20 44 20 34 C20 22 32 8 32 8Z"
        fill={`url(#fire-core-${id})`}
      />
      {/* Inner flame */}
      <path
        d="M32 16 C32 16 40 26 40 34 C40 41 36 46 32 46 C28 46 24 41 24 34 C24 26 32 16 32 16Z"
        fill="#FFE066"
        opacity="0.7"
      />
      {/* Tip */}
      <ellipse cx="32" cy="12" rx="3" ry="5" fill="#FFFDE7" opacity="0.9" />
      {/* Side flickers for higher rarity */}
      {intensity >= 2 && (
        <path
          d="M22 30 C20 26 22 22 24 24 C22 28 24 32 22 30Z"
          fill="#FF8C00"
          opacity="0.6"
        />
      )}
      {intensity >= 2 && (
        <path
          d="M42 30 C44 26 42 22 40 24 C42 28 40 32 42 30Z"
          fill="#FF8C00"
          opacity="0.6"
        />
      )}
      {intensity >= 4 && (
        <>
          <path d="M26 18 C24 14 26 10 28 12 C26 16 27 20 26 18Z" fill="#FFE066" opacity="0.5" />
          <path d="M38 18 C40 14 38 10 36 12 C38 16 37 20 38 18Z" fill="#FFE066" opacity="0.5" />
        </>
      )}
      {/* Legendary crown sparks */}
      {intensity >= 5 && (
        <>
          <circle cx="20" cy="22" r="2" fill="#FFD700" opacity="0.8" />
          <circle cx="44" cy="22" r="2" fill="#FFD700" opacity="0.8" />
          <circle cx="32" cy="6" r="2.5" fill="#FFFFFF" opacity="0.9" />
        </>
      )}
    </g>
  );
}

function WaterIcon({ intensity, id }: { intensity: number; id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`water-core-${id}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#B3E5FC" />
          <stop offset="50%" stopColor="#29B6F6" />
          <stop offset="100%" stopColor="#0D47A1" />
        </radialGradient>
        <radialGradient id={`water-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3498DB" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3498DB" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer glow */}
      <ellipse cx="32" cy="50" rx="16" ry="6" fill={`url(#water-glow-${id})`} />
      {/* Main droplet */}
      <path
        d="M32 8 C32 8 48 30 48 40 C48 49 41 56 32 56 C23 56 16 49 16 40 C16 30 32 8 32 8Z"
        fill={`url(#water-core-${id})`}
      />
      {/* Shine highlight */}
      <ellipse cx="26" cy="30" rx="5" ry="8" fill="white" opacity="0.25" transform="rotate(-20 26 30)" />
      <ellipse cx="24" cy="27" rx="2" ry="3" fill="white" opacity="0.5" transform="rotate(-20 24 27)" />
      {/* Bubbles for higher rarity */}
      {intensity >= 2 && <circle cx="38" cy="36" r="3" fill="white" opacity="0.2" />}
      {intensity >= 3 && <circle cx="36" cy="44" r="2" fill="white" opacity="0.15" />}
      {intensity >= 4 && (
        <>
          <circle cx="22" cy="42" r="2.5" fill="#B3E5FC" opacity="0.4" />
          <circle cx="40" cy="28" r="2" fill="#B3E5FC" opacity="0.3" />
        </>
      )}
      {intensity >= 5 && (
        <>
          <circle cx="32" cy="18" r="3" fill="white" opacity="0.5" />
          <circle cx="44" cy="38" r="2" fill="#81D4FA" opacity="0.6" />
          <circle cx="20" cy="32" r="2" fill="#81D4FA" opacity="0.6" />
        </>
      )}
    </g>
  );
}

function DreamIcon({ intensity, id }: { intensity: number; id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`dream-core-${id}`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F3E5F5" />
          <stop offset="50%" stopColor="#CE93D8" />
          <stop offset="100%" stopColor="#6A1B9A" />
        </radialGradient>
        <radialGradient id={`dream-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DDA0DD" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#DDA0DD" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer glow */}
      <circle cx="32" cy="32" r="22" fill={`url(#dream-glow-${id})`} />
      {/* Crescent moon main shape */}
      <path
        d="M32 10 A22 22 0 1 0 32 54 A14 14 0 1 1 32 10Z"
        fill={`url(#dream-core-${id})`}
      />
      {/* Stars */}
      <circle cx="44" cy="18" r={intensity >= 2 ? 2.5 : 1.5} fill="#F3E5F5" opacity="0.9" />
      <circle cx="50" cy="28" r={intensity >= 3 ? 2 : 1} fill="#CE93D8" opacity="0.8" />
      {intensity >= 2 && <circle cx="46" cy="38" r="1.5" fill="#F3E5F5" opacity="0.7" />}
      {intensity >= 3 && (
        <>
          <path d="M44 16 L46 18 L44 20 L42 18Z" fill="white" opacity="0.8" />
          <circle cx="38" cy="12" r="1.5" fill="#CE93D8" opacity="0.6" />
        </>
      )}
      {intensity >= 4 && (
        <>
          <path d="M50 24 L52 28 L50 32 L48 28Z" fill="#F3E5F5" opacity="0.7" />
          <circle cx="52" cy="20" r="2" fill="white" opacity="0.5" />
        </>
      )}
      {intensity >= 5 && (
        <>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 48 + Math.cos(rad) * 8;
            const y = 20 + Math.sin(rad) * 8;
            return <circle key={i} cx={x} cy={y} r="1.5" fill="#E1BEE7" opacity="0.7" />;
          })}
        </>
      )}
    </g>
  );
}

function NatureIcon({ intensity, id }: { intensity: number; id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`nature-core-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="50%" stopColor="#43A047" />
          <stop offset="100%" stopColor="#1B5E20" />
        </linearGradient>
        <radialGradient id={`nature-glow-${id}`} cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#27AE60" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#27AE60" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Ground glow */}
      <ellipse cx="32" cy="54" rx="16" ry="5" fill={`url(#nature-glow-${id})`} />
      {/* Trunk */}
      <rect x="29" y="40" width="6" height="14" rx="2" fill="#5D4037" />
      {/* Main foliage layers */}
      <ellipse cx="32" cy="36" rx="16" ry="12" fill={`url(#nature-core-${id})`} />
      <ellipse cx="32" cy="26" rx="13" ry="10" fill="#43A047" />
      <ellipse cx="32" cy="18" rx="9" ry="8" fill="#66BB6A" />
      {/* Highlights */}
      <ellipse cx="28" cy="22" rx="4" ry="3" fill="#A5D6A7" opacity="0.4" />
      {/* Leaves for rarity */}
      {intensity >= 2 && (
        <>
          <ellipse cx="20" cy="32" rx="6" ry="4" fill="#43A047" transform="rotate(-30 20 32)" />
          <ellipse cx="44" cy="32" rx="6" ry="4" fill="#43A047" transform="rotate(30 44 32)" />
        </>
      )}
      {intensity >= 3 && (
        <>
          <circle cx="26" cy="18" r="3" fill="#81C784" opacity="0.7" />
          <circle cx="38" cy="20" r="2.5" fill="#81C784" opacity="0.6" />
        </>
      )}
      {intensity >= 4 && (
        <>
          <path d="M32 10 L35 16 L29 16Z" fill="#A5D6A7" opacity="0.8" />
          <circle cx="18" cy="28" r="4" fill="#388E3C" opacity="0.7" />
          <circle cx="46" cy="28" r="4" fill="#388E3C" opacity="0.7" />
        </>
      )}
      {intensity >= 5 && (
        <>
          {[0, 72, 144, 216, 288].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 32 + Math.cos(rad) * 20;
            const y = 30 + Math.sin(rad) * 8;
            return <circle key={i} cx={x} cy={y} r="2" fill="#C8E6C9" opacity="0.6" />;
          })}
        </>
      )}
    </g>
  );
}

function StarIcon({ intensity, id }: { intensity: number; id: string }) {
  const points = (cx: number, cy: number, outer: number, inner: number, numPoints: number) => {
    const pts: string[] = [];
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i * Math.PI) / numPoints - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  };

  return (
    <g>
      <defs>
        <radialGradient id={`star-core-${id}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFDE7" />
          <stop offset="50%" stopColor="#FFD600" />
          <stop offset="100%" stopColor="#F57F17" />
        </radialGradient>
        <radialGradient id={`star-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F1C40F" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F1C40F" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer glow */}
      <circle cx="32" cy="32" r="24" fill={`url(#star-glow-${id})`} />
      {/* Main star */}
      <polygon
        points={points(32, 32, intensity >= 3 ? 22 : 20, intensity >= 3 ? 9 : 10, 5)}
        fill={`url(#star-core-${id})`}
      />
      {/* Inner shine */}
      <ellipse cx="28" cy="25" rx="5" ry="4" fill="white" opacity="0.3" transform="rotate(-20 28 25)" />
      {/* Secondary stars for rarity */}
      {intensity >= 2 && (
        <polygon points={points(50, 18, 5, 2, 5)} fill="#FFD600" opacity="0.8" />
      )}
      {intensity >= 3 && (
        <>
          <polygon points={points(14, 16, 4, 1.8, 5)} fill="#FFE082" opacity="0.7" />
          <polygon points={points(50, 46, 4, 1.8, 5)} fill="#FFE082" opacity="0.7" />
        </>
      )}
      {intensity >= 4 && (
        <>
          <polygon points={points(32, 32, 26, 11, 5)} fill="none" stroke="#FFFDE7" strokeWidth="0.5" opacity="0.4" />
          <circle cx="32" cy="32" r="4" fill="white" opacity="0.5" />
        </>
      )}
      {intensity >= 5 && (
        <>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 32 + Math.cos(rad) * 28;
            const y = 32 + Math.sin(rad) * 28;
            return <circle key={i} cx={x} cy={y} r="1.5" fill="#FFD600" opacity="0.6" />;
          })}
        </>
      )}
    </g>
  );
}

function WildIcon({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`wild-core-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFDE7" />
          <stop offset="40%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FF8F00" />
        </radialGradient>
        <radialGradient id={`wild-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer glow ring */}
      <circle cx="32" cy="32" r="26" fill={`url(#wild-glow-${id})`} />
      {/* Spiral arms */}
      {[0, 90, 180, 270].map((angle, i) => (
        <path
          key={i}
          d={`M32 32 Q${32 + 20 * Math.cos((angle * Math.PI) / 180)} ${32 + 20 * Math.sin((angle * Math.PI) / 180)} ${32 + 14 * Math.cos(((angle + 45) * Math.PI) / 180)} ${32 + 14 * Math.sin(((angle + 45) * Math.PI) / 180)}`}
          stroke="#FFD700"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
      ))}
      {/* Central gem */}
      <circle cx="32" cy="32" r="10" fill={`url(#wild-core-${id})`} />
      <circle cx="28" cy="28" r="3" fill="white" opacity="0.5" />
      {/* Sparkle dots */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 32 + Math.cos(rad) * 20;
        const y = 32 + Math.sin(rad) * 20;
        return <circle key={i} cx={x} cy={y} r={i % 2 === 0 ? 2 : 1.2} fill="#FFE082" opacity="0.7" />;
      })}
      {/* W text */}
      <text x="32" y="36" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#FF8F00" fontFamily="system-ui">W</text>
    </g>
  );
}

function BonusIcon({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`bonus-core-${id}`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#CCFF90" />
          <stop offset="50%" stopColor="#43A047" />
          <stop offset="100%" stopColor="#1B5E20" />
        </radialGradient>
        <radialGradient id={`bonus-glow-${id}`} cx="50%" cy="70%" r="50%">
          <stop offset="0%" stopColor="#2ECC71" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2ECC71" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Ground glow */}
      <ellipse cx="32" cy="54" rx="14" ry="5" fill={`url(#bonus-glow-${id})`} />
      {/* Stem */}
      <path d="M32 52 Q26 44 24 36" stroke="#388E3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M32 52 Q38 44 40 36" stroke="#388E3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Main seed pod */}
      <ellipse cx="32" cy="30" rx="12" ry="16" fill={`url(#bonus-core-${id})`} />
      {/* Leaf */}
      <path d="M32 22 Q16 18 14 10 Q26 14 32 22Z" fill="#43A047" />
      {/* Highlights on seed */}
      <ellipse cx="27" cy="24" rx="4" ry="5" fill="#CCFF90" opacity="0.4" transform="rotate(-15 27 24)" />
      {/* Sparkles */}
      <circle cx="42" cy="20" r="2.5" fill="#A5D6A7" opacity="0.8" />
      <circle cx="44" cy="30" r="1.5" fill="#69F0AE" opacity="0.7" />
      <circle cx="20" cy="28" r="2" fill="#B9F6CA" opacity="0.6" />
      {/* B text overlay */}
      <text x="32" y="35" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1B5E20" fontFamily="system-ui" opacity="0.8">B</text>
    </g>
  );
}

function ArtifactIcon({ intensity, id }: { intensity: number; id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`artifact-core-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E1BEE7" />
          <stop offset="50%" stopColor="#9C27B0" />
          <stop offset="100%" stopColor="#4A148C" />
        </linearGradient>
        <radialGradient id={`artifact-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9B59B6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#9B59B6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer glow */}
      <circle cx="32" cy="32" r="22" fill={`url(#artifact-glow-${id})`} />
      {/* Diamond gem shape */}
      <polygon points="32,10 50,28 32,54 14,28" fill={`url(#artifact-core-${id})`} />
      {/* Facets */}
      <polygon points="32,10 50,28 32,32" fill="#CE93D8" opacity="0.4" />
      <polygon points="32,10 14,28 32,32" fill="#7B1FA2" opacity="0.3" />
      {/* Inner shine */}
      <polygon points="32,14 44,28 32,30" fill="white" opacity="0.2" />
      <ellipse cx="26" cy="22" rx="4" ry="6" fill="white" opacity="0.15" transform="rotate(-20 26 22)" />
      {intensity >= 2 && (
        <>
          <circle cx="14" cy="14" r="2.5" fill="#E1BEE7" opacity="0.7" />
          <circle cx="50" cy="14" r="2" fill="#CE93D8" opacity="0.6" />
        </>
      )}
    </g>
  );
}

// Spinning placeholder icon
export function SpinningSymbol({ size = 64 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
    >
      <defs>
        <radialGradient id="spin-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#9B59B6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="20" fill="none" stroke="url(#spin-grad)" strokeWidth="3" strokeDasharray="12 6" />
      <circle cx="32" cy="32" r="6" fill="#FFD700" opacity="0.6" />
    </motion.svg>
  );
}

// Main export — 80% image size gives room for scale:1.15 pulse without clipping.
export function SymbolIcon({ symbol, isWin = false, isBonus = false }: SymbolIconProps) {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <motion.div
        animate={isWin ? {
          scale: [1, 1.12, 1], // Un poco menos de 1.15 para asegurar que no toque bordes
          filter: [
            'brightness(1) saturate(1)',
            'brightness(1.7) saturate(1.4)', // Incremento de luz interna
            'brightness(1) saturate(1)',
          ],
        } : isBonus ? {
          scale: [1, 1.08, 1],
          filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'],
        } : {}}
        transition={isWin || isBonus ? {
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        } : {}}
        className="w-full h-full flex items-center justify-center"
      >
        <img
          src={`/assets/symbols/${symbol.id}.png`}
          alt={symbol.name ?? symbol.id}
          className="w-[80%] h-[80%] object-contain pointer-events-none select-none"
        />
      </motion.div>
    </div>
  );
}


