export type ElementKey = 'fire' | 'water' | 'dream' | 'nature' | 'star';

export interface TreeBuff {
  lumensMultiplier: number;
  energyRegenBonus: number;
  rareSpiritBonus: number;
  bonusGameChance: number;
}

export function getBuffsForLevel(level: number): TreeBuff {
  if (level >= 21) {
    return { lumensMultiplier: 1.2, energyRegenBonus: 3, rareSpiritBonus: 0.1, bonusGameChance: 0.05 };
  } else if (level >= 16) {
    return { lumensMultiplier: 1.15, energyRegenBonus: 2, rareSpiritBonus: 0.05, bonusGameChance: 0 };
  } else if (level >= 11) {
    return { lumensMultiplier: 1.1, energyRegenBonus: 1, rareSpiritBonus: 0, bonusGameChance: 0 };
  } else if (level >= 6) {
    return { lumensMultiplier: 1.05, energyRegenBonus: 0, rareSpiritBonus: 0, bonusGameChance: 0 };
  }
  return { lumensMultiplier: 1, energyRegenBonus: 0, rareSpiritBonus: 0, bonusGameChance: 0 };
}

export function getDominantElement(state: {
  totalFire: number;
  totalWater: number;
  totalDream: number;
  totalNature: number;
  totalStar: number;
}): ElementKey {
  const elements: { key: ElementKey; value: number }[] = [
    { key: 'fire', value: state.totalFire },
    { key: 'water', value: state.totalWater },
    { key: 'dream', value: state.totalDream },
    { key: 'nature', value: state.totalNature },
    { key: 'star', value: state.totalStar },
  ];
  elements.sort((a, b) => b.value - a.value);
  return elements[0].key;
}

export interface AuraBonus {
  type: string;
  value: number; // Decimal multiplier or percentage
  label: string;
}

// Calculates the global Aura bonus based on dominant element and tree level
export function getDominantAura(dominant: ElementKey, level: number): AuraBonus | null {
  // Base 5% + 0.5% per level
  const bonusPercent = 5 + (level * 0.5);
  const decimalBonus = bonusPercent / 100;
  
  switch(dominant) {
    case 'fire':
      return { type: 'combatDamage', value: decimalBonus, label: `+${bonusPercent.toFixed(1)}% Poder de Combate` };
    case 'water':
      return { type: 'rareSymbolChance', value: decimalBonus, label: `+${bonusPercent.toFixed(1)}% Prob. Símbolos Raros` };
    case 'nature':
      return { type: 'sanctuaryProduction', value: decimalBonus, label: `+${bonusPercent.toFixed(1)}% Prod. Santuario` };
    case 'dream':
      return { type: 'chestTimeReduction', value: decimalBonus, label: `-${bonusPercent.toFixed(1)}% Tiempo Cofres` };
    case 'star':
      return { type: 'experienceGain', value: decimalBonus, label: `+${bonusPercent.toFixed(1)}% Exp. Obtenida` };
    default:
      return null;
  }
}

export function spinsForLevel(level: number): number {
  return level * 1000;
}

export function totalSpinsForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += spinsForLevel(i);
  }
  return total;
}
