'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1 text-xs hover:bg-muted transition-colors"
      aria-label="Change language"
    >
      <Globe className="h-3 w-3" />
      <span className="uppercase font-semibold">{locale}</span>
    </button>
  );
}
