'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Trophy, MessageCircle, Award } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { FriendsPanel } from '@/components/community/FriendsPanel';
import { GuildPanel } from '@/components/community/GuildPanel';
import { LeaderboardPanel } from '@/components/community/LeaderboardPanel';
import { ChatPanel } from '@/components/community/ChatPanel';
import { AchievementsPanel } from '@/components/progression/AchievementsPanel';

type Tab = 'friends' | 'guild' | 'leaderboard' | 'chat' | 'achievements';

const TABS: { key: Tab; icon: any; color: string }[] = [
  { key: 'friends', icon: Users, color: 'text-lumora-blue' },
  { key: 'guild', icon: Shield, color: 'text-lumora-purple' },
  { key: 'leaderboard', icon: Trophy, color: 'text-lumora-gold' },
  { key: 'chat', icon: MessageCircle, color: 'text-lumora-pink' },
  { key: 'achievements', icon: Award, color: 'text-lumora-emerald' },
];

export default function CommunityPage() {
  const t = useTranslations('community');
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  // Redirect to login if not authenticated
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center px-4 pt-12">
        <Users className="h-16 w-16 text-lumora-blue/20 mb-4" />
        <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-blue to-lumora-purple bg-clip-text text-transparent mb-3">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
          {t('loginRequired')}
        </p>
        <button
          onClick={() => router.push('/auth/login')}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-lumora-blue to-lumora-purple text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          {t('loginToConnect')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-4 pb-2">
      {/* Header */}
      <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-blue to-lumora-purple bg-clip-text text-transparent mb-4 text-center">
        {t('title')}
      </h1>

      {/* Tab navigation */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? `${tab.color} bg-card/60 border border-current/20 shadow-sm`
                  : 'text-muted-foreground bg-card/30 border border-border/20 hover:bg-card/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(tab.key)}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'friends' && <FriendsPanel />}
          {activeTab === 'guild' && <GuildPanel />}
          {activeTab === 'leaderboard' && <LeaderboardPanel />}
          {activeTab === 'chat' && <ChatPanel />}
          {activeTab === 'achievements' && <AchievementsPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
