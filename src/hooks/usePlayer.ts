'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';

interface PlayerData {
  id: string;
  displayName: string;
  level: number;
  experience: number;
  lumens: number;
  energy: number;
  maxEnergy: number;
  sanctuaryLevel: number;
  language: string;
  sanctuary: {
    id: string;
    name: string;
    lumensPerHour: number;
    globalWater: number;
    globalFire: number;
    globalNature: number;
    globalDream: number;
    globalStar: number;
  } | null;
  spirits: Array<{
    id: string;
    level: number;
    spiritType: {
      name: string;
      nameEn: string;
      element: string;
      rarity: string;
      basePower: number;
    };
  }>;
  blessings: Array<{
    id: string;
    day: number;
    claimed: boolean;
    lastClaimAt: string;
  }>;
  guild: {
    id: string;
    guildId: string;
    role: string;
    guild: {
      id: string;
      name: string;
      description: string | null;
      emblem: string | null;
      level: number;
    };
  } | null;
}

export function usePlayer() {
  const { data: session, status } = useSession();
  const refreshKey = useGameStore((s) => s.refreshKey);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayer = useCallback(async () => {
    if (status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/player');
      if (!res.ok) {
        throw new Error('Failed to fetch player');
      }
      const data = await res.json();
      setPlayer(data);
      setError(null);

      // Sync server data to Zustand so all components see it instantly
      useGameStore.getState().syncPlayerStats({
        lumens: data.lumens,
        energy: data.energy,
        maxEnergy: data.maxEnergy,
        level: data.level,
        experience: data.experience,
        sanctuaryLevel: data.sanctuaryLevel,
      });
      // Also sync display name
      useGameStore.getState().setDisplayName(data.displayName);
    } catch (err) {
      console.error('Failed to fetch player:', err);
      setError('Error al cargar perfil');
      toast.error('Error al cargar perfil');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer, refreshKey]);

  return {
    player,
    isLoading,
    error,
    isAuthenticated: status === 'authenticated',
    session,
    refetch: fetchPlayer,
  };
}
