'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, Mail, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const t = useTranslations('auth');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <Sparkles className="h-12 w-12 text-lumora-gold" />
          </div>
          <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent">
            {t('login')}
          </h1>
        </div>

        {/* Google Login */}
        <Button
          variant="outline"
          className="w-full mb-4 rounded-xl h-12"
        >
          {t('loginWithGoogle')}
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t('orContinueWithEmail')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email Login */}
        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t('email')}
              className="pl-10 rounded-xl h-12"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder={t('password')}
              className="pl-10 rounded-xl h-12"
            />
          </div>
          <Button className="w-full rounded-xl h-12 bg-gradient-to-r from-lumora-gold to-lumora-pink text-white font-semibold">
            {t('login')}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          {t('noAccount')}{' '}
          <span className="text-lumora-gold cursor-pointer hover:underline">
            {t('register')}
          </span>
        </p>
      </div>
    </div>
  );
}
