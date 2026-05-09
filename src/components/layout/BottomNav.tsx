'use client';

import { useEffect } from 'react';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Home, Compass, TreePine, Users, ShoppingBag, Sparkles } from 'lucide-react';
import { audioService } from '@/lib/audioService';

const navItems = [
  { key: 'home', href: '/', icon: Home },
  { key: 'play', href: '/play', icon: Compass },
  { key: 'collection', href: '/collection', icon: Sparkles },
  { key: 'sanctuary', href: '/sanctuary', icon: TreePine },
  { key: 'community', href: '/community', icon: Users },
  { key: 'shop', href: '/shop', icon: ShoppingBag },
] as const;

export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    let scene: 'home' | 'spins' | 'sanctuary' | 'community' | 'shop' | 'battle' = 'home';
    if (pathname.includes('/spins')) scene = 'spins';
    else if (pathname.includes('/sanctuary')) scene = 'sanctuary';
    else if (pathname.includes('/community')) scene = 'community';
    else if (pathname.includes('/shop')) scene = 'shop';
    else if (pathname.includes('/play/boss') || pathname.includes('/play/arena') || pathname.includes('/play/raid')) scene = 'battle';
    else if (pathname.includes('/play')) scene = 'home';

    audioService.playBGM(scene as any);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-background/70 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => {
                audioService.playClick();
                router.push(item.href as '/');
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                active
                  ? 'text-lumora-gold scale-105'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]' : ''}`} />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>
                {t(item.key)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
