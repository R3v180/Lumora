'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { signIn } from 'next-auth/react';
import { Sparkles, Mail, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === 'Configuration'
          ? 'Error de configuración. Inténtalo de nuevo.'
          : result.error
        );
      } else if (result?.ok) {
        router.push('/');
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
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-lumora-purple/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-lumora-gold/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-12 w-12 text-lumora-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.3)]" />
          </motion.div>
          <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent mt-4">
            {t('login')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vuelve al mundo de Lumora</p>
        </div>

        {/* Google Login */}
        <Button
          variant="outline"
          className="w-full mb-4 rounded-xl h-12 border-border/50"
          onClick={() => signIn('google', { callbackUrl: '/es' })}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t('loginWithGoogle')}
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t('orContinueWithEmail')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 rounded-xl h-12 bg-card/50 border-border/50"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder={t('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 rounded-xl h-12 bg-card/50 border-border/50"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-xs text-destructive text-center">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl h-12 bg-gradient-to-r from-lumora-gold to-lumora-pink text-white font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Ingresando...
              </span>
            ) : (
              t('login')
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-xs text-center text-muted-foreground">
            {t('noAccount')}{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="text-lumora-gold hover:underline font-semibold"
            >
              {t('register')}
            </button>
          </p>
          <div className="text-center">
            <button
              onClick={() => router.push('/onboarding')}
              className="text-xs text-lumora-pink hover:underline"
            >
              ¿Primera vez? Comienza la aventura
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
