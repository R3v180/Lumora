import { create } from 'zustand';

export interface SpiritItem {
  id: string;
  name: string;
  element: 'fire' | 'water' | 'dream' | 'nature' | 'star';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  level: number;
  power: number;
}

export interface PlayerState {
  // Player info
  displayName: string;
  level: number;
  experience: number;
  lumens: number;
  energy: number;
  maxEnergy: number;
  sanctuaryLevel: number;

  // Game state
  isSpinning: boolean;
  autoSpin: boolean;
  spinCount: number;

  // Collection
  spirits: SpiritItem[];

  // World contribution
  globalWater: number;
  globalFire: number;
  globalNature: number;
  globalDream: number;
  globalStar: number;

  // Offline rewards
  offlineRewardsClaimed: boolean;

  // Refresh signal for cross-component player data updates
  refreshKey: number;

  // Actions
  setDisplayName: (name: string) => void;
  addLumens: (amount: number) => void;
  spendLumens: (amount: number) => boolean;
  useEnergy: (amount: number) => boolean;
  refillEnergy: () => void;
  setSpinning: (spinning: boolean) => void;
  toggleAutoSpin: () => void;
  addSpirit: (spirit: SpiritItem) => void;
  addExperience: (amount: number) => void;
  contributeToElement: (element: string, amount: number) => void;
  setOfflineRewardsClaimed: () => void;
  triggerRefresh: () => void;
}

export const useGameStore = create<PlayerState>((set, get) => ({
  // Initial state
  displayName: 'Viajero',
  level: 1,
  experience: 0,
  lumens: 100,
  energy: 100,
  maxEnergy: 100,
  sanctuaryLevel: 1,

  isSpinning: false,
  autoSpin: false,
  spinCount: 0,

  spirits: [],

  globalWater: 0,
  globalFire: 0,
  globalNature: 0,
  globalDream: 0,
  globalStar: 0,

  offlineRewardsClaimed: false,
  refreshKey: 0,

  // Actions
  setDisplayName: (name) => set({ displayName: name }),

  addLumens: (amount) =>
    set((state) => ({ lumens: state.lumens + amount })),

  spendLumens: (amount) => {
    const { lumens } = get();
    if (lumens >= amount) {
      set({ lumens: lumens - amount });
      return true;
    }
    return false;
  },

  useEnergy: (amount) => {
    const { energy } = get();
    if (energy >= amount) {
      set({ energy: energy - amount });
      return true;
    }
    return false;
  },

  refillEnergy: () => set({ energy: get().maxEnergy }),

  setSpinning: (spinning) => set({ isSpinning: spinning }),

  toggleAutoSpin: () => set((state) => ({ autoSpin: !state.autoSpin })),

  addSpirit: (spirit) =>
    set((state) => ({ spirits: [...state.spirits, spirit] })),

  addExperience: (amount) =>
    set((state) => {
      const newExp = state.experience + amount;
      const expForLevel = state.level * 100;
      if (newExp >= expForLevel) {
        return {
          experience: newExp - expForLevel,
          level: state.level + 1,
        };
      }
      return { experience: newExp };
    }),

  contributeToElement: (element, amount) =>
    set((state) => {
      const key = `global${element.charAt(0).toUpperCase() + element.slice(1)}` as keyof PlayerState;
      const current = (state[key] as number) || 0;
      return { [key]: current + amount } as Partial<PlayerState>;
    }),

  setOfflineRewardsClaimed: () => set({ offlineRewardsClaimed: true }),

  triggerRefresh: () =>
    set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
