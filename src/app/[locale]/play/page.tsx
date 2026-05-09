'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { Sparkles, Skull, Swords, Target, ChevronRight } from 'lucide-react';
import { audioService } from '@/lib/audioService';

export default function PlayHubPage() {
  const t = useTranslations('home');
  const router = useRouter();

  const handleNavigate = (path: string) => {
    audioService.playClick();
    router.push(path);
  };

  return (
    <div className="flex flex-col px-4 pt-6 pb-24 min-h-screen">
      <h1 className="text-3xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent mb-2 text-center">
        {t('chooseAdventure')}
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {t('exploreModes')}
      </p>

      <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Giant Main Card - Spins */}
        <motion.button
          onClick={() => handleNavigate('/spins')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative group w-full text-left overflow-hidden rounded-3xl border border-lumora-gold/30 bg-card/60 backdrop-blur-md p-6 shadow-[0_0_20px_rgba(255,215,0,0.1)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-lumora-gold/10 via-transparent to-lumora-pink/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="absolute right-[-20px] top-[-20px] opacity-20 group-hover:scale-110 transition-transform duration-500">
            <Sparkles className="h-40 w-40 text-lumora-gold" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-lumora-gold/20 rounded-2xl">
                <Sparkles className="h-8 w-8 text-lumora-gold" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Giro Onírico</h2>
                <p className="text-xs text-lumora-gold font-semibold">Modo Principal</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground/80 mt-2 max-w-[80%]">
              Gira la máquina para obtener Lumens, Energía y ganar premios.
            </p>
          </div>
        </motion.button>

        <div className="flex flex-col gap-4 mt-2">
          {/* Boss Banner */}
          <motion.button
            onClick={() => handleNavigate('/play/boss')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative group w-full text-left overflow-hidden rounded-2xl min-h-[160px] sm:min-h-[200px] shadow-lg"
            style={{
              backgroundImage: 'url(/assets/bosses/boss_void.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            {/* Accent glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-red-500/30 rounded-xl border border-red-500/30 backdrop-blur-sm">
                  <Skull className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow-lg">Incursiones del Vacío</h3>
                  <p className="text-xs text-red-300/80">Jefe Mundial PvE</p>
                </div>
              </div>
              <p className="text-xs text-white/50 mt-1">Ataca al boss mundial con tus mejores giros elementales.</p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/20 group-hover:text-white/50 transition-colors z-10" />
          </motion.button>

          {/* Arena Banner */}
          <motion.button
            onClick={() => handleNavigate('/play/arena')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative group w-full text-left overflow-hidden rounded-2xl min-h-[160px] sm:min-h-[200px] shadow-lg"
            style={{
              backgroundImage: 'url(/assets/backgrounds/bg_arena.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-lumora-gold/30 rounded-xl border border-lumora-gold/30 backdrop-blur-sm">
                  <Swords className="h-6 w-6 text-lumora-gold" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow-lg">El Coliseo</h3>
                  <p className="text-xs text-lumora-gold/80">Arena PvP Asíncrona</p>
                </div>
              </div>
              <p className="text-xs text-white/50 mt-1">Desafía a otros viajeros y sube en el ranking.</p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/20 group-hover:text-white/50 transition-colors z-10" />
          </motion.button>

          {/* Raid Banner */}
          <motion.button
            onClick={() => handleNavigate('/play/raid')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative group w-full text-left overflow-hidden rounded-2xl min-h-[160px] sm:min-h-[200px] shadow-lg"
            style={{
              backgroundImage: 'url(/assets/backgrounds/bg_raid.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-lumora-pink/30 rounded-xl border border-lumora-pink/30 backdrop-blur-sm">
                  <Target className="h-6 w-6 text-lumora-pink" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow-lg">Saqueos</h3>
                  <p className="text-xs text-lumora-pink/80">Robar Lumens a rivales</p>
                </div>
              </div>
              <p className="text-xs text-white/50 mt-1">Asalta santuarios enemigos y roba sus Lumens idle.</p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/20 group-hover:text-white/50 transition-colors z-10" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
