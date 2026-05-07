// Dream Spin Engine - Core game logic
// Handles reel generation, win detection, payout calculation, spirit rewards

import { SYMBOLS, TOTAL_WEIGHT, GameSymbol, Element } from './symbols';

// === TYPES ===

export interface ReelResult {
  grid: GameSymbol[][]; // 5 columns × 4 rows
  wins: WinResult[];
  totalPayout: number;
  spiritsWon: SpiritReward[];
  elementContributions: Record<Element, number>;
  isBigWin: boolean; // payout >= 50x bet
  isMegaWin: boolean; // payout >= 100x bet
}

export interface WinResult {
  symbol: GameSymbol;
  positions: { col: number; row: number }[];
  count: number; // 3, 4, or 5 matching symbols
  payout: number;
  isWild: boolean;
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

        const payout = matchSymbol.payout[matchCount] || 0;
        const hasWild = lineSymbols.slice(0, matchCount).some(ls => ls.symbol.symbolType === 'wild');

        wins.push({
          symbol: matchSymbol,
          positions: matchPositions,
          count: matchCount,
          payout,
          isWild: hasWild,
        });
      }
    }
  }

  return wins;
}

// === ELEMENTAL COMBO DETECTION ===

// Count elements across all grid positions
export function countElements(grid: GameSymbol[][]): Record<Element, number> {
  const counts: Record<Element, number> = {
    fire: 0,
    water: 0,
    dream: 0,
    nature: 0,
    star: 0,
  };

  for (let col = 0; col < REELS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const sym = grid[col][row];
      if (sym.symbolType !== 'wild' && sym.symbolType !== 'bonus') {
        counts[sym.element]++;
      }
    }
  }

  return counts;
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
            spiritTypeId: spirit.id.replace('sym_', 'spirit_').replace(/_common|_uncommon|_rare/, (match) => {
              // Map symbol ID to spirit type ID format
              return match;
            }),
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
  // Generate the reel grid
  const grid = generateReelGrid();

  // Detect wins
  const wins = detectWins(grid);

  // Calculate total payout
  const totalPayout = wins.reduce((sum, w) => sum + w.payout, 0);

  // Count elements for spirit rewards and world contribution
  const elementContributions = countElements(grid);

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

// Get the evolved form of a spirit
export function getEvolvedForm(spiritTypeId: string): string | null {
  // Look for a spirit whose evolveFrom matches this one
  // This would query the database in production
  // For now, we use the SYMBOLS data
  const evolver = SYMBOLS.find(s => {
    const spiritId = s.id.replace('sym_', 'spirit_');
    // Check if any spirit evolves from the given type
    return false; // Placeholder - actual logic will query DB
  });
  return null;
}
