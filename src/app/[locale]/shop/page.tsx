'use client';

import { useTranslations } from 'next-intl';
import { ShopPanel } from '@/components/shop/ShopPanel';

export default function ShopPage() {
  const t = useTranslations('shop');

  return (
    <div className="flex flex-col px-4 pt-4 pb-24 relative min-h-screen overflow-hidden">
      {/* Immersive Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.35 }}
          transition={{ duration: 2 }}
          src="/assets/backgrounds/bg_shop.png" 
          alt="" 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <h1 className="relative z-10 text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-emerald bg-clip-text text-transparent mb-4 text-center">
        {t('title')}
      </h1>
      <div className="relative z-10">
        <ShopPanel />
      </div>
    </div>
  );
}
