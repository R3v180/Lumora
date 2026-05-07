'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Crown, Palette, Box, Zap, ShoppingBag, Check, X, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShopItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descEn: string;
  category: string;
  price: number;
  currency: string;
  content: any;
  imageUrl: string | null;
}

interface ShopCategory {
  key: string;
  items: ShopItem[];
}

const CATEGORY_META: Record<string, { icon: any; color: string; label: string; labelEn: string }> = {
  lumens: { icon: Sparkles, color: 'lumora-gold', label: 'Lumens', labelEn: 'Lumens' },
  pass: { icon: Crown, color: 'lumora-purple', label: 'Pase', labelEn: 'Pass' },
  cosmetic: { icon: Palette, color: 'lumora-pink', label: 'Cosméticos', labelEn: 'Cosmetics' },
  bundle: { icon: Box, color: 'lumora-emerald', label: 'Paquetes', labelEn: 'Bundles' },
  boost: { icon: Zap, color: 'lumora-blue', label: 'Impulsos', labelEn: 'Boosts' },
};

const ITEM_EMOJIS: Record<string, string> = {
  lumens: '✨',
  pass: '👑',
  cosmetic: '🎨',
  bundle: '📦',
  boost: '⚡',
};

export function ShopPanel() {
  const t = useTranslations('shop');
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lumens, setLumens] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseDialog, setPurchaseDialog] = useState<ShopItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const fetchShop = useCallback(async () => {
    try {
      const res = await fetch('/api/shop');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !activeCategory) {
          setActiveCategory(data.categories[0].key);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLumens = useCallback(async () => {
    try {
      const res = await fetch('/api/player');
      if (res.ok) {
        const data = await res.json();
        setLumens(data.lumens);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchShop();
    fetchLumens();
  }, [fetchShop, fetchLumens]);

  const handlePurchase = async (item: ShopItem) => {
    setIsPurchasing(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setPurchaseResult(data);
        setShowResult(true);
        fetchLumens();
      } else {
        setPurchaseResult({ error: data.error });
        setShowResult(true);
      }
    } catch {
      setPurchaseResult({ error: 'Error de conexión' });
      setShowResult(true);
    } finally {
      setIsPurchasing(false);
      setPurchaseDialog(null);
    }
  };

  const activeItems = categories.find((c) => c.key === activeCategory)?.items || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="h-5 w-5 text-lumora-gold" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lumens display */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-lumora-gold/10 border border-lumora-gold/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lumora-gold" />
          <span className="text-sm font-semibold text-lumora-gold">Tus Lumens</span>
        </div>
        <span className="text-lg font-bold text-lumora-gold">{lumens.toLocaleString()}</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat.key] || CATEGORY_META.lumens;
          const Icon = meta.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? `text-${meta.color} bg-card/60 border border-current/20`
                  : 'text-muted-foreground bg-card/30 border border-border/20 hover:bg-card/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(cat.key === 'lumens' ? 'lumenPacks' : cat.key === 'pass' ? 'seasonPass' : cat.key === 'cosmetic' ? 'cosmetics' : cat.key === 'bundle' ? 'bundles' : 'boosts')}
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="grid grid-cols-2 gap-2.5"
        >
          {activeItems.map((item) => {
            const canAfford = lumens >= item.price;
            const emoji = ITEM_EMOJIS[item.category] || '🎁';
            const meta = CATEGORY_META[item.category] || CATEGORY_META.lumens;

            return (
              <motion.button
                key={item.id}
                onClick={() => canAfford && setPurchaseDialog(item)}
                disabled={!canAfford}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  canAfford
                    ? 'border-border/30 bg-card/50 hover:border-lumora-gold/30 hover:bg-card/70 cursor-pointer'
                    : 'border-border/15 bg-card/20 opacity-60 cursor-not-allowed'
                }`}
                whileHover={canAfford ? { scale: 1.02 } : {}}
                whileTap={canAfford ? { scale: 0.98 } : {}}
              >
                {/* Emoji icon */}
                <div className={`w-12 h-12 rounded-xl bg-${meta.color}/10 flex items-center justify-center text-2xl border border-${meta.color}/20`}>
                  {emoji}
                </div>
                {/* Name */}
                <p className="text-xs font-semibold leading-tight">{item.name}</p>
                {/* Description */}
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                  {item.description}
                </p>
                {/* Price */}
                <div className={`flex items-center gap-1 mt-auto px-2 py-1 rounded-full ${
                  canAfford ? 'bg-lumora-gold/10' : 'bg-muted/20'
                }`}>
                  <Sparkles className={`h-3 w-3 ${canAfford ? 'text-lumora-gold' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-bold ${canAfford ? 'text-lumora-gold' : 'text-muted-foreground'}`}>
                    {item.price.toLocaleString()}
                  </span>
                </div>
                {!canAfford && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Purchase confirmation dialog */}
      <Dialog open={!!purchaseDialog} onOpenChange={() => setPurchaseDialog(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-fantasy">{t('confirmPurchase')}</DialogTitle>
          </DialogHeader>
          {purchaseDialog && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/20">
                <div className="w-14 h-14 rounded-xl bg-lumora-gold/10 flex items-center justify-center text-3xl border border-lumora-gold/20">
                  {ITEM_EMOJIS[purchaseDialog.category] || '🎁'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{purchaseDialog.name}</p>
                  <p className="text-xs text-muted-foreground">{purchaseDialog.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-lumora-gold/5 border border-lumora-gold/15">
                <span className="text-sm">{t('cost')}</span>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-lumora-gold" />
                  <span className="text-sm font-bold text-lumora-gold">{purchaseDialog.price.toLocaleString()}</span>
                </div>
              </div>
              <Button
                onClick={() => handlePurchase(purchaseDialog)}
                disabled={isPurchasing}
                className="w-full rounded-xl bg-gradient-to-r from-lumora-gold to-lumora-emerald text-white font-semibold"
              >
                {isPurchasing ? '...' : t('buy')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Purchase result dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-fantasy">
              {purchaseResult?.error ? t('purchaseFailed') : t('purchaseSuccess')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            {purchaseResult?.error ? (
              <p className="text-sm text-destructive">{purchaseResult.error}</p>
            ) : (
              <>
                <div className="text-center py-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-16 h-16 mx-auto rounded-full bg-lumora-emerald/20 flex items-center justify-center border-2 border-lumora-emerald/40"
                  >
                    <Check className="h-8 w-8 text-lumora-emerald" />
                  </motion.div>
                </div>
                <p className="text-sm font-semibold text-center">{purchaseResult?.itemName}</p>
                {purchaseResult?.rewards?.map((reward: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lumora-gold/5 border border-lumora-gold/15">
                    <Sparkles className="h-3.5 w-3.5 text-lumora-gold" />
                    <span className="text-xs font-medium">{reward}</span>
                  </div>
                ))}
              </>
            )}
            <Button
              onClick={() => setShowResult(false)}
              className="w-full rounded-xl"
              variant="outline"
            >
              {t('close') || 'Cerrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
