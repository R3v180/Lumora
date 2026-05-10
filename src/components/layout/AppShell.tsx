'use client';

import { usePathname } from '@/i18n/navigation';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { GlobalChat } from './GlobalChat';
import { InstallPrompt } from './InstallPrompt';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show nav on auth/onboarding pages
  const isAuthPage = pathname.includes('/auth') || pathname.includes('/onboarding');

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      {!isAuthPage && <TopBar />}
      <main className={`flex-1 overflow-x-hidden ${!isAuthPage ? 'pb-20' : ''}`}>
        {children}
      </main>
      {!isAuthPage && <BottomNav />}
      {!isAuthPage && <GlobalChat />}
      {!isAuthPage && <InstallPrompt />}
    </div>
  );
}
