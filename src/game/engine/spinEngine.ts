// Dream Spin Engine - Core game logic
// Handles reel generation, win detection, payout calculation, spirit rewards
// Enhanced with: Evolution Map, Wild Multipliers, Elemental Surge, Bonus Trigger, Lucky Spin

import { SYMBOLS, TOTAL_WEIGHT, GameSymbol, Element } from './symbols';

// === TYPES ===

export interface WinResult {
  symbol: GameSymbol;
  positions: { col: number; row: number }[];
  count: number; // 3, 4, or 5 matching symbols
  payout: number;
  isWild: boolean;
  wildMultiplier: number; // 1 (no wild), 2 (1 wild), 3 (2 wilds), or 5 (3+ wilds)
}

export interface ElementalSurge {
  element: Element;
  count: number;
  bonusLumens: number;
}

export interface ReelResult {
  grid: GameSymbol[][]; // 5 columns × 4 rows
  wins: WinResult[];
  totalPayout: number;
  spiritsWon: SpiritReward[];
  elementContributions: Record<Element, number>;
  isBigWin: boolean; // payout >= 50x bet
  isMegaWin: boolean; // payout >= 100x bet
  elementalSurges: ElementalSurge[];
  bonusTriggered: boolean;
  bonusCount: number;
  isLucky: boolean;
}

export interface SpiritReward {
  spiritTypeId: string;
  element: Element;
  rarity: string;
  name: string;
  nameEn: string;
}

// === CONSTANTS ===

export const REELS = 5;
export const ROWS = 4;
export const ENERGY_COST = 5; // energy per spin
export const BASE_BET = 1; // base bet multiplier

// Payline patterns (5 reels, positions per reel)
// We check 20 paylines on a 5×4 grid
export const PAYLINES: number[][] = [
  // Horizontal lines
  [0, 0, 0, 0, 0], // Row 0
  [1, 1, 1, 1, 1], // Row 1
  [2, 2, 2, 2, 2], // Row 2
  [3, 3, 3, 3, 3], // Row 3
  // V shapes
  [0, 1, 2, 1, 0],
  [3, 2, 1, 2, 3],
  // Inverted V
  [1, 0, 0, 0, 1],
  [2, 3, 3, 3, 2],
  // Zigzag
  [0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1],
  [2, 1, 2, 1, 2],
  [1, 2, 1, 2, 1],
  [3, 2, 3, 2, 3],
  [2, 3, 2, 3, 2],
  // Diagonal
  [0, 0, 1, 2, 3],
  [3, 3, 2, 1, 0],
  [0, 1, 2, 3, 3],
  [3, 2, 1, 0, 0],
  // W shape
  [1, 0, 1, 0, 1],
  [2, 3, 2, 3, 2],
];

// === EVOLUTION MAP ===
// Maps spirit symbol IDs to their evolved form (next rarity tier)
// Chain: common → uncommon → rare → epic → legendary
const RARITY_CHAIN: Record<string, string> = {
  common: 'uncommon',
  uncommon: 'rare',
  rare: 'epic',
  epic: 'legendary',
};

export const EVOLUTION_MAP: Record<string, string> = {};

// Build the evolution map from SYMBOLS: for each spirit, find the next rarity in the same element
(function buildEvolutionMap() {
  for (const symbol of SYMBOLS) {
    if (symbol.symbolType !== 'spirit') continue;

    const nextRarity = RARITY_CHAIN[symbol.rarity];
    if (!nextRarity) continue; // legendary has no evolution

    // Find the evolved form: same element, next rarity tier, spirit type
    const evolved = SYMBOLS.find(
      s =>
        s.symbolType === 'spirit' &&
        s.element === symbol.element &&
        s.rarity === nextRarity
    );

    if (evolved) {
      // Map spirit type ID format: sym_fire_common → spirit_fire_uncommon
      const inputSpiritId = symbol.id.replace('sym_', 'spirit_');
      const outputSpiritId = evolved.id.replace('sym_', 'spirit_');
      EVOLUTION_MAP[inputSpiritId] = outputSpiritId;
    }
  }
})();

// === RNG ===

// Weighted random symbol selection
function weightedRandomSymbol(): GameSymbol {
  let random = Math.random() * TOTAL_WEIGHT;
  for (const symbol of SYMBOLS) {
    random -= symbol.weight;
    if (random <= 0) {
      return symbol;
    }
  }
  return SYMBOLS[0]; // fallback
}

// === REEL GENERATION ===

export function generateReelGrid(): GameSymbol[][] {
  const grid: GameSymbol[][] = [];
  for (let col = 0; col < REELS; col++) {
    const column: GameSymbol[] = [];
    for (let row = 0; row < ROWS; row++) {
      column.push(weightedRandomSymbol());
    }
    grid.push(column);
  }
  return grid;
}

// === WIN DETECTION ===

function getSymbolAt(grid: GameSymbol[][], col: number, row: number): GameSymbol {
  return grid[col][row];
}

// Check if two symbols match (wild matches anything)
function symbolsMatch(a: GameSymbol, b: GameSymbol): boolean {
  if (a.symbolType === 'wild' || b.symbolType === 'wild') return true;
  return a.id === b.id;
}

// Check if two symbols have same element for elemental combos
function sameElement(a: GameSymbol, b: GameSymbol): boolean {
  if (a.symbolType === 'wild' || b.symbolType === 'wild') return true;
  return a.element === b.element;
}

// Calculate wild multiplier based on number of wilds in a winning payline
function calculateWildMultiplier(wildCount: number): number {
  if (wildCount >= 3) return 5;
  if (wildCount === 2) return 3;
  if (wildCount === 1) return 2;
  return 1;
}

export function detectWins(grid: GameSymbol[][]): WinResult[] {
  const wins: WinResult[] = [];
  const matchedPositions = new Set<string>();

  for (const payline of PAYLINES) {
    // Get symbols along this payline
    const lineSymbols = payline.map((row, col) => ({
      symbol: getSymbolAt(grid, col, row),
      col,
      row,
    }));

    // Find the first non-wild symbol to determine the match target
    let matchSymbol = lineSymbols[0].symbol;
    for (const ls of lineSymbols) {
      if (ls.symbol.symbolType !== 'wild') {
        matchSymbol = ls.symbol;
        break;
      }
    }

    // Count consecutive matches from left to right
    let matchCount = 0;
    const matchPositions: { col: number; row: number }[] = [];

    for (const ls of lineSymbols) {
      if (symbolsMatch(ls.symbol, matchSymbol)) {
        matchCount++;
        matchPositions.push({ col: ls.col, row: ls.row });
      } else {
        break; // must be consecutive from left
      }
    }

    // Need at least 3 matching for a win
    if (matchCount >= 3) {
      const posKey = matchPositions.map(p => `${p.col},${p.row}`).join('|');

      // Avoid duplicate wins for the same positions
      if (!matchedPositions.has(posKey)) {
        matchedPositions.add(posKey);

        // Count wilds in the winning portion of the payline
        const wildCount = lineSymbols
          .slice(0, matchCount)
          .filter(ls => ls.symbol.symbolType === 'wild').length;

        const hasWild = wildCount > 0;
        const wildMultiplier = calculateWildMultiplier(wildCount);

        // Base payout from symbol paytable
        const basePayout = matchSymbol.payout[matchCount] || 0;

        // Apply wild multiplier to the payout
        const payout = basePayout * wildMultiplier;

        wins.push({
          symbol: matchSymbol,
          positions: matchPositions,
          count: matchCount,
          payout,
          isWild: hasWild,
          wildMultiplier,
        });
      }
    }
  }

  return wins;
}

// === ELEMENTAL COMBO DETECTION ===

// Count elements across all grid positions (wilds count toward every element)
export function countElements(grid: GameSymbol[][]): Record<Element, number> {
  const counts: Record<Element, number> = {
    fire: 0,
    water: 0,
    dream: 0,
    nature: 0,
    star: 0,
  };

  // Count how many wilds are on the grid (they contribute to all elements)
  let wildCount = 0;

  for (let col = 0; col < REELS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const sym = grid[col][row];
      if (sym.symbolType === 'wild') {
        wildCount++;
      } else if (sym.symbolType !== 'bonus') {
        counts[sym.element]++;
      }
    }
  }

  // Wilds count toward every element
  if (wildCount > 0) {
    for (const element of Object.keys(counts) as Element[]) {
      counts[element] += wildCount;
    }
  }

  return counts;
}

// === ELEMENTAL SURGE DETECTION ===

// If 6+ symbols of the same element (counting wilds), award Elemental Surge bonus
export function detectElementalSurges(
  elementCounts: Record<Element, number>
): ElementalSurge[] {
  const surges: ElementalSurge[] = [];

  for (const [element, count] of Object.entries(elementCounts)) {
    if (count >= 6) {
      let bonusLumens: number;

      if (count >= 10) {
        bonusLumens = 50;
      } else if (count >= 8) {
        bonusLumens = 25;
      } else {
        bonusLumens = 10;
      }

      surges.push({
        element: element as Element,
        count,
        bonusLumens,
      });
    }
  }

  return surges;
}

// === BONUS GAME TRIGGER DETECTION ===

// Count bonus symbols on the grid
export function detectBonusTrigger(grid: GameSymbol[][]): {
  bonusTriggered: boolean;
  bonusCount: number;
} {
  let bonusCount = 0;

  for (let col = 0; col < REELS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[col][row].id === 'sym_bonus') {
        bonusCount++;
      }
    }
  }

  return {
    bonusTriggered: bonusCount >= 3,
    bonusCount,
  };
}

// === LUCKY SPIN MECHANIC ===

const LUCKY_SPIN_CHANCE = 0.02; // 2% chance

// Roll for Lucky Spin
function rollLuckySpin(): boolean {
  return Math.random() < LUCKY_SPIN_CHANCE;
}

// Force a guaranteed minimum win of 3+ match by replacing symbols
// This ensures at least one payline has a 3+ match
function forceLuckyWin(grid: GameSymbol[][]): GameSymbol[][] {
  // Pick a random payline
  const paylineIndex = Math.floor(Math.random() * PAYLINES.length);
  const payline = PAYLINES[paylineIndex];

  // Pick a random spirit symbol for the match (prefer higher rarity for excitement)
  const spiritSymbols = SYMBOLS.filter(s => s.symbolType === 'spirit');
  const matchSymbol = spiritSymbols[Math.floor(Math.random() * spiritSymbols.length)];

  // Replace the first 3 positions on the payline with the chosen symbol
  const newGrid = grid.map(col => [...col]); // deep copy
  for (let i = 0; i < 3; i++) {
    const col = i;
    const row = payline[i];
    newGrid[col][row] = { ...matchSymbol };
  }

  return newGrid;
}

// === SPIRIT REWARD DETERMINATION ===

// Determine which spirits are won based on element counts and RNG
export function determineSpiritRewards(
  elementCounts: Record<Element, number>,
  totalPayout: number
): SpiritReward[] {
  const rewards: SpiritReward[] = [];

  // High payout = chance for better spirits
  const isBigWin = totalPayout >= 50;

  // For each element with 3+ symbols on the grid, chance to win a spirit
  for (const [element, count] of Object.entries(elementCounts)) {
    if (count >= 3) {
      // Base 30% chance for spirit, +10% per extra symbol, +20% for big win
      const chance = 0.3 + (count - 3) * 0.1 + (isBigWin ? 0.2 : 0);

      if (Math.random() < chance) {
        // Determine rarity based on count and big win
        let rarity = 'common';
        const roll = Math.random();

        if (count >= 5 && isBigWin && roll < 0.05) {
          rarity = 'epic';
        } else if (count >= 4 && roll < 0.15) {
          rarity = 'rare';
        } else if (count >= 3 && roll < 0.35) {
          rarity = 'uncommon';
        }

        // Find matching spirit type
        const matchingSpirits = SYMBOLS.filter(
          s => s.element === element &&
          s.symbolType === 'spirit' &&
          mapRarity(s.rarity) === rarity
        );

        if (matchingSpirits.length > 0) {
          const spirit = matchingSpirits[0];
          rewards.push({
            spiritTypeId: spirit.id.replace('sym_', 'spirit_'),
            element: element as Element,
            rarity,
            name: spirit.name,
            nameEn: spirit.nameEn,
          });
        }
      }
    }
  }

  return rewards;
}

function mapRarity(symbolRarity: string): string {
  return symbolRarity;
}

// === MAIN SPIN FUNCTION ===

export function executeSpin(): ReelResult {
  // Roll for Lucky Spin
  const isLucky = rollLuckySpin();

  // Generate the reel grid
  let grid = generateReelGrid();

  // If Lucky Spin, force a guaranteed minimum 3+ match win
  if (isLucky) {
    grid = forceLuckyWin(grid);
  }

  // Detect wins (includes wild multiplier in payouts)
  const wins = detectWins(grid);

  // Calculate total payout from payline wins
  let totalPayout = wins.reduce((sum, w) => sum + w.payout, 0);

  // Count elements for spirit rewards, world contribution, and surge detection
  const elementContributions = countElements(grid);

  // Detect Elemental Surges and add bonus lumens
  const elementalSurges = detectElementalSurges(elementContributions);
  const surgeBonus = elementalSurges.reduce((sum, s) => sum + s.bonusLumens, 0);
  totalPayout += surgeBonus;

  // Detect bonus game trigger
  const { bonusTriggered, bonusCount } = detectBonusTrigger(grid);

  // Determine spirit rewards
  const spiritsWon = determineSpiritRewards(elementContributions, totalPayout);

  // Determine win tier
  const isBigWin = totalPayout >= 50;
  const isMegaWin = totalPayout >= 100;

  return {
    grid,
    wins,
    totalPayout,
    spiritsWon,
    elementContributions,
    isBigWin,
    isMegaWin,
    elementalSurges,
    bonusTriggered,
    bonusCount,
    isLucky,
  };
}

// === MERGE & EVOLVE LOGIC ===

export interface MergeResult {
  canMerge: boolean;
  inputSpiritIds: string[];
  outputSpiritTypeId: string;
  outputName: string;
  outputNameEn: string;
  outputElement: Element;
  outputRarity: string;
}

// Check if spirits can be merged (3+ identical spirits)
export function checkMerge(
  playerSpiritIds: string[],
  spiritTypeId: string
): boolean {
  const matching = playerSpiritIds.filter(id => id === spiritTypeId);
  return matching.length >= 3;
}

// Get the evolved form of a spirit using the EVOLUTION_MAP
export function getEvolvedForm(spiritTypeId: string): string | null {
  return EVOLUTION_MAP[spiritTypeId] ?? null;
}
