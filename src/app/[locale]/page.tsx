'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, TreePine, Clock, Users, LogIn, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useSession } from 'next-auth/react';
import { usePlayer } from '@/hooks/usePlayer';
import { Button } from '@/components/ui/button';
import { BlessingWidget } from '@/components/blessing/BlessingWidget';
import { DailyChallengesPanel } from '@/components/progression/DailyChallengesPanel';
import { OfflineRewardsDialog } from '@/components/home/OfflineRewardsDialog';
import { WorldTreeWidget } from '@/components/home/WorldTreeWidget';
import { ChestPanel } from '@/components/progression/ChestPanel';
import { toast } from 'sonner';
import { audioService } from '@/lib/audioService';

// Event Widget component — shows active/upcoming world events
function EventWidget() {
  const t = useTranslations('home');
  const [events, setEvents] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.active || []);
          setUpcoming(data.upcoming || []);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
        toast.error('Error al cargar eventos');
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const activeEvent = events[0];
  const nextEvent = upcoming[0];

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="rounded-2xl border border-lumora-purple/20 bg-card/60 backdrop-blur-sm p-4">
      {activeEvent ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-lumora-pink" />
              <span className="text-sm font-semibold text-lumora-pink">{activeEvent.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{formatTime(activeEvent.timeLeftMs)}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{activeEvent.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-lumora-gold">x{activeEvent.multiplier} multiplicador</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lumora-emerald/10 text-lumora-emerald border border-lumora-emerald/20">
              ACTIVO
            </span>
          </div>
        </>
      ) : nextEvent ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-lumora-purple" />
              <span className="text-sm font-semibold text-lumora-purple">{t('currentEvent')}</span>
            </div>
            <span className="text-xs text-muted-foreground">En {formatTime(nextEvent.startsInMs)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {nextEvent.name} — x{nextEvent.multiplier} multiplicador
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">{t('currentEvent')}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            No hay eventos activos ahora. ¡Próximamente más!
          </p>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations('home');
  const router = useRouter();
  const { data: session } = useSession();
  const { player, isLoading } = usePlayer();

  const isAuthenticated = !!session?.user;

  return (
    <div className="relative flex flex-col items-center px-4 pt-6 pb-8 overflow-hidden">
      {/* Background atmospheric effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-lumora-purple/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-1/4 w-48 h-48 bg-lumora-gold/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-32 left-1/2 w-56 h-56 bg-lumora-blue/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* World Tree Widget */}
      <WorldTreeWidget />

      {isAuthenticated ? (
        <>
          {/* Player greeting */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 text-center mb-4"
          >
            <p className="text-sm text-muted-foreground">
              {isLoading ? t('welcome') : `Hola, ${player?.displayName || 'Viajero'}`}
            </p>
            {player && (
              <p className="text-xs text-lumora-purple">
                Nivel {player.level} - {player.experience}/{player.level * 100} XP
              </p>
            )}
          </motion.div>

          {/* Spin Dream Button */}
          <motion.button
            onClick={() => router.push('/play')}
            className="relative z-10 group mb-8"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple opacity-60 blur-lg group-hover:opacity-80 transition-opacity" />
            <div className="relative flex items-center gap-3 rounded-full bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple px-10 py-5 text-white font-fantasy font-bold text-xl shadow-2xl">
              <Sparkles className="h-6 w-6" />
              {t('spinDream')}
              <Sparkles className="h-6 w-6" />
            </div>
          </motion.button>
        </>
      ) : (
        <>
          {/* Not logged in - show entry buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex flex-col items-center gap-4 mb-8"
          >
            <Button
              onClick={() => {
                audioService.playClick();
                router.push('/onboarding');
              }}
              className="rounded-full px-10 py-6 h-auto text-lg bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple text-white font-fantasy font-bold shadow-2xl"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Comenzar Aventura
            </Button>
            <Button
              onClick={() => {
                audioService.playClick();
                router.push('/auth/login');
              }}
              variant="ghost"
              className="rounded-full gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogIn className="h-4 w-4" />
              Ya tengo cuenta
            </Button>
          </motion.div>
        </>
      )}

      {/* Event Widget */}
      <div className="relative z-10 w-full max-w-sm mb-6">
        <EventWidget />
      </div>

      {isAuthenticated && (
        <div className="relative z-10 w-full max-w-sm">
          <ChestPanel />
        </div>
      )}


      {/* Daily Blessing Widget (when logged in) */}
      {isAuthenticated && (
        <div className="relative z-10 w-full max-w-sm mt-3">
          <BlessingWidget />
        </div>
      )}

      {/* Offline Rewards Dialog */}
      {isAuthenticated && <OfflineRewardsDialog />}

      {/* Daily Challenges Widget (when logged in) */}
      {isAuthenticated && (
        <div className="relative z-10 w-full max-w-sm mt-3">
          <DailyChallengesPanel />
        </div>
      )}
    </div>
  );
}
