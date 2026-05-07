'use client';

import { useTranslations } from 'next-intl';
import { ShopPanel } from '@/components/shop/ShopPanel';

export default function ShopPage() {
  const t = useTranslations('shop');

  return (
    <div className="flex flex-col px-4 pt-4 pb-2">
      <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-gold to-lumora-emerald bg-clip-text text-transparent mb-4 text-center">
        {t('title')}
      </h1>
      <ShopPanel />
    </div>
  );
}
