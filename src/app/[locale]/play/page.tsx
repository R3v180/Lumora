'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { Sparkles, Skull, Swords, Target, ChevronRight, HelpCircle, X, Zap, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { audioService } from '@/lib/audioService';

export default function PlayHubPage() {
  const t = useTranslations('home');
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();

  const handleNavigate = (path: string) => {
    audioService.playClick();
    router.push(path);
  };

  return (
    <div className="flex flex-col px-4 pt-6 pb-24 min-h-screen relative">
      <div className="flex items-center justify-center gap-2 mb-2 relative">
        <h1 className="text-3xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent text-center">
          {t('chooseAdventure')}
        </h1>
        <button 
          onClick={() => setShowHelp(true)}
          className="absolute right-0 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5"
        >
          <HelpCircle className="h-5 w-5 text-lumora-gold" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {t('exploreModes')}
      </p>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowHelp(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[80vh]">
              <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10"><X className="h-5 w-5 text-muted-foreground" /></button>
              
              <h2 className="text-2xl font-fantasy font-bold text-lumora-gold mb-6 flex items-center gap-2">
                <Sparkles className="h-6 w-6" /> El Camino del Viajero
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-lumora-blue/20 flex items-center justify-center border border-lumora-blue/30 text-lumora-blue font-bold">1</div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">Gira y Cosecha</h3>
                    <p className="text-xs text-muted-foreground">Usa tu <strong className="text-lumora-blue">Energía ⚡</strong> en el Giro Onírico para ganar <strong className="text-lumora-gold">Lumens ✨</strong> y experiencia.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-lumora-purple/20 flex items-center justify-center border border-lumora-purple/30 text-lumora-purple font-bold">2</div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">Mejora tu Santuario</h3>
                    <p className="text-xs text-muted-foreground">Sube de nivel tu <strong className="text-lumora-purple">Rango 🛡️</strong> para desbloquear nuevas zonas y aumentar tu energía máxima.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-lumora-pink/20 flex items-center justify-center border border-lumora-pink/30 text-lumora-pink font-bold">3</div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">Colecciona Espíritus</h3>
                    <p className="text-xs text-muted-foreground">Consigue <strong className="text-lumora-pink">Poder 📈</strong> derrotando Jefes y abriendo cofres. ¡Los espíritus multiplican tus ganancias en el Altar!</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30 text-red-400 font-bold">4</div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">Domina la Arena</h3>
                    <p className="text-xs text-muted-foreground">Enfréntate a otros jugadores para robar sus tesoros y subir en el ranking mundial.</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setShowHelp(false)} className="w-full mt-8 py-6 rounded-2xl bg-lumora-gold text-black font-black hover:scale-[1.02] transition-transform">¡EMPEZAR MI VIAJE!</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Giant Main Card - Spins */}
        <motion.button
          onClick={() => handleNavigate('/spins')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative group w-full text-left overflow-hidden rounded-3xl min-h-[180px] sm:min-h-[220px] shadow-lg border border-lumora-gold/30"
          style={{
            backgroundImage: 'url(/assets/backgrounds/bg_spin_adventure.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
          {/* Accent glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-lumora-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-lumora-gold/20 rounded-2xl backdrop-blur-sm border border-lumora-gold/30">
                <Sparkles className="h-7 w-7 text-lumora-gold" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Giro Onírico</h2>
                <p className="text-xs text-lumora-gold font-bold">RECOMPENSAS: ✨ Lumens | ⚡ Energía</p>
              </div>
            </div>
            <p className="text-sm text-white/80 mt-1 max-w-[90%] leading-relaxed">
              El corazón de Lumora. Gira para expandir tu santuario y ganar recursos infinitos.
            </p>
            
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-lumora-gold">
              <span>JUGAR AHORA</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
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
                  <h3 className="text-lg font-bold text-white drop-shadow-lg uppercase tracking-tight">Incursiones del Vacío</h3>
                  <p className="text-xs text-red-300 font-bold">RECOMPENSAS: ✨ Lumens | 📦 Cofres</p>
                </div>
              </div>
              <p className="text-xs text-white/70 mt-1">Derrota a titanes oníricos para obtener los tesoros más raros.</p>
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
                  <h3 className="text-lg font-bold text-white drop-shadow-lg uppercase tracking-tight">Arena Estelar</h3>
                  <p className="text-xs text-lumora-gold font-bold">RECOMPENSAS: 📦 Cofres | 🏆 Rango</p>
                </div>
              </div>
              <p className="text-xs text-white/70 mt-1">Enfréntate a otros viajeros y saquea sus recursos.</p>
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
                  <h3 className="text-lg font-bold text-white drop-shadow-lg uppercase tracking-tight">Saqueos Oníricos</h3>
                  <p className="text-xs text-lumora-pink font-bold">RECOMPENSAS: ✨ Lumens | 📦 Cofres</p>
                </div>
              </div>
              <p className="text-xs text-white/70 mt-1">Asalta santuarios enemigos y roba sus recursos inactivos.</p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/20 group-hover:text-white/50 transition-colors z-10" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
