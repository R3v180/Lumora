'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { signIn } from 'next-auth/react';
import { Sparkles, Flame, Droplets, Moon, Leaf, Star, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SPIRIT_CHOICES = [
  { id: 'fire', icon: Flame, color: 'lumora-fire', nameEs: 'Ignis', nameEn: 'Ignis', descEs: 'Espíritu de fuego', descEn: 'Fire spirit' },
  { id: 'water', icon: Droplets, color: 'lumora-water', nameEs: 'Aqua', nameEn: 'Aqua', descEs: 'Espíritu de agua', descEn: 'Water spirit' },
  { id: 'dream', icon: Moon, color: 'lumora-dream', nameEs: 'Somnus', nameEn: 'Somnus', descEs: 'Espíritu de sueño', descEn: 'Dream spirit' },
  { id: 'nature', icon: Leaf, color: 'lumora-nature', nameEs: 'Verdis', nameEn: 'Verdis', descEs: 'Espíritu de naturaleza', descEn: 'Nature spirit' },
  { id: 'star', icon: Star, color: 'lumora-star', nameEs: 'Astra', nameEn: 'Astra', descEs: 'Espíritu estelar', descEn: 'Star spirit' },
] as const;

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [selectedSpirit, setSelectedSpirit] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const locale = typeof window !== 'undefined'
    ? window.location.pathname.split('/')[1] || 'es'
    : 'es';

  const handleComplete = async () => {
    if (!displayName || !selectedSpirit) return;

    setIsLoading(true);
    setError('');

    try {
      // For demo: auto-register and sign in
      const email = `${displayName.toLowerCase().replace(/\s+/g, '')}@lumora.dream`;
      const password = 'lumora123';

      // Try to register
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
        }),
      });

      if (!registerRes.ok) {
        const data = await registerRes.json();
        setError(data.error || 'Error al crear cuenta');
        setIsLoading(false);
        return;
      }

      // Sign in
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/');
      } else {
        setError('Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lumora-purple/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-lumora-gold/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-8"
              >
                <Sparkles className="h-20 w-20 text-lumora-gold mx-auto drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]" />
              </motion.div>
              <h1 className="text-3xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold via-lumora-pink to-lumora-purple bg-clip-text text-transparent mb-3">
                {t('welcome')}
              </h1>
              <p className="text-muted-foreground mb-8">{t('subtitle')}</p>
              <Button
                onClick={() => setStep(1)}
                className="rounded-full px-8 h-12 bg-gradient-to-r from-lumora-gold to-lumora-pink text-white font-semibold"
              >
                Comenzar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 1: Choose Name */}
          {step === 1 && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Sparkles className="h-12 w-12 text-lumora-pink mx-auto mb-4" />
              <h2 className="text-xl font-fantasy font-bold text-foreground mb-2">
                {t('chooseName')}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Este será tu nombre en el mundo de Lumora
              </p>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre de viajero..."
                className="rounded-xl h-14 text-center text-lg font-fantasy mb-4"
                maxLength={20}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mb-6">
                {displayName.length}/20 caracteres
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="rounded-xl h-12 flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={() => displayName.length >= 2 && setStep(2)}
                  disabled={displayName.length < 2}
                  className="rounded-xl h-12 flex-1 bg-gradient-to-r from-lumora-pink to-lumora-purple text-white"
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Choose Spirit */}
          {step === 2 && (
            <motion.div
              key="spirit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Sparkles className="h-12 w-12 text-lumora-purple mx-auto mb-4" />
              <h2 className="text-xl font-fantasy font-bold text-foreground mb-2">
                {t('chooseSpirit')}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Tu primer espíritu guardián te acompañará en la aventura
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {SPIRIT_CHOICES.map((spirit) => {
                  const Icon = spirit.icon;
                  const isSelected = selectedSpirit === spirit.id;
                  return (
                    <motion.button
                      key={spirit.id}
                      onClick={() => setSelectedSpirit(spirit.id)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                        isSelected
                          ? `border-${spirit.color} bg-${spirit.color}/10 scale-105`
                          : 'border-border/30 bg-card/40 hover:bg-card/60'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className={`h-8 w-8 text-${spirit.color}`} />
                      <span className="text-xs font-semibold">
                        {locale === 'en' ? spirit.nameEn : spirit.nameEs}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {locale === 'en' ? spirit.descEn : spirit.descEs}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {error && (
                <p className="text-sm text-destructive mb-4">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-12 flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!selectedSpirit || isLoading}
                  className="rounded-xl h-12 flex-1 bg-gradient-to-r from-lumora-purple to-lumora-blue text-white"
                >
                  {isLoading ? 'Creando...' : t('start')}
                  {!isLoading && <Sparkles className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
