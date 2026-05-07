'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, TreePine, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';

export default function HomePage() {
  const t = useTranslations('home');
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center px-4 pt-6 pb-8 overflow-hidden">
      {/* Background atmospheric effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-lumora-purple/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-1/4 w-48 h-48 bg-lumora-gold/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-32 left-1/2 w-56 h-56 bg-lumora-blue/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* World Tree Section */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <motion.div
          className="relative w-48 h-48 flex items-center justify-center"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Glowing ring behind tree */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lumora-purple/20 via-lumora-gold/20 to-lumora-blue/20 blur-xl" />
          {/* Tree icon */}
          <TreePine className="h-32 w-32 text-lumora-emerald drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
          {/* Floating particles */}
          <motion.div
            className="absolute top-4 right-8"
            animate={{ y: [-4, 4, -4], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-4 w-4 text-lumora-gold" />
          </motion.div>
          <motion.div
            className="absolute bottom-8 left-6"
            animate={{ y: [4, -4, 4], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="h-3 w-3 text-lumora-pink" />
          </motion.div>
        </motion.div>

        <h2 className="text-lg font-fantasy font-bold bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple bg-clip-text text-transparent mt-2">
          {t('worldTree')}
        </h2>
        <p className="text-xs text-muted-foreground">Nivel 1 - Creciendo</p>
      </div>

      {/* Spin Dream Button */}
      <motion.button
        onClick={() => router.push('/spins')}
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

      {/* Event Widget */}
      <div className="relative z-10 w-full max-w-sm mb-6">
        <div className="rounded-2xl border border-lumora-purple/20 bg-card/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-lumora-pink" />
              <span className="text-sm font-semibold text-lumora-pink">{t('currentEvent')}</span>
            </div>
            <span className="text-xs text-muted-foreground">2:34:12</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Próximo Despertar en breve. Prepárate para multiplicadores.
          </p>
        </div>
      </div>

      {/* Friends Online Widget */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-lumora-blue/20 bg-card/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-lumora-blue" />
              <span className="text-sm font-semibold">{t('friendsOnline')}</span>
            </div>
            <span className="text-xs text-lumora-blue font-bold">3 conectados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
