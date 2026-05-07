'use client';

import { useTranslations } from 'next-intl';
import { Users, MessageCircle, Trophy, Shield } from 'lucide-react';

export default function CommunityPage() {
  const t = useTranslations('community');

  return (
    <div className="flex flex-col items-center px-4 pt-6">
      <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-blue to-lumora-purple bg-clip-text text-transparent mb-6">
        {t('title')}
      </h1>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        <button className="flex flex-col items-center gap-2 rounded-2xl border border-lumora-blue/20 bg-card/60 backdrop-blur-sm p-6 hover:border-lumora-blue/40 transition-colors">
          <Users className="h-8 w-8 text-lumora-blue" />
          <span className="text-sm font-semibold">{t('friends')}</span>
        </button>
        <button className="flex flex-col items-center gap-2 rounded-2xl border border-lumora-purple/20 bg-card/60 backdrop-blur-sm p-6 hover:border-lumora-purple/40 transition-colors">
          <Shield className="h-8 w-8 text-lumora-purple" />
          <span className="text-sm font-semibold">{t('guild')}</span>
        </button>
        <button className="flex flex-col items-center gap-2 rounded-2xl border border-lumora-pink/20 bg-card/60 backdrop-blur-sm p-6 hover:border-lumora-pink/40 transition-colors">
          <MessageCircle className="h-8 w-8 text-lumora-pink" />
          <span className="text-sm font-semibold">{t('chat')}</span>
        </button>
        <button className="flex flex-col items-center gap-2 rounded-2xl border border-lumora-gold/20 bg-card/60 backdrop-blur-sm p-6 hover:border-lumora-gold/40 transition-colors">
          <Trophy className="h-8 w-8 text-lumora-gold" />
          <span className="text-sm font-semibold">{t('leaderboard')}</span>
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Social features coming in Phase 4
      </p>
    </div>
  );
}
