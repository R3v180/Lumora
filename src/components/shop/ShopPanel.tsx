'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { useGameStore } from '@/lib/store';
import { audioService } from '@/lib/audioService';
import { ShopItemIcon } from './ShopItemIcon';

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
  all: { icon: ShoppingBag, color: 'lumora-gold', label: 'Todo', labelEn: 'All' },
  energy: { icon: Zap, color: 'lumora-blue', label: 'Energía', labelEn: 'Energy' },
  shields: { icon: Lock, color: 'lumora-emerald', label: 'Escudos', labelEn: 'Shields' },
  chests: { icon: Box, color: 'lumora-purple', label: 'Cofres', labelEn: 'Chests' },
  pass: { icon: Crown, color: 'lumora-gold', label: 'Pase', labelEn: 'Pass' },
};

const ITEM_EMOJIS: Record<string, string> = {
  energy: '⚡',
  shields: '🛡️',
  chests: '🎁',
  pass: '👑',
};

export function ShopPanel() {
  const t = useTranslations('shop');
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [purchaseDialog, setPurchaseDialog] = useState<ShopItem | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const { data: shopData = { categories: [], allItems: [] }, isLoading, error: shopError } = useQuery({
    queryKey: ['shopCategories'],
    queryFn: async () => {
      const res = await fetch('/api/shop');
      if (!res.ok) throw new Error(t('fetchError'));
      return await res.json();
    },
  });

  const categories = shopData.categories || [];
  const allItems = shopData.allItems || [];

  const { data: lumens = 0 } = useQuery({
    queryKey: ['playerLumens'],
    queryFn: async () => {
      const res = await fetch('/api/player');
      if (!res.ok) throw new Error('Error al cargar Lumens');
      const data = await res.json();
      return data.lumens;
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de conexión');
      return data;
    },
    onSuccess: (data) => {
      audioService.playClaimReward();
      setPurchaseResult(data);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: ['playerLumens'] });

      // Instant update for the TopBar
      if (data.newLumens !== undefined) {
        useGameStore.getState().syncPlayerStats({
          lumens: data.newLumens,
          energy: useGameStore.getState().energy,
          maxEnergy: useGameStore.getState().maxEnergy,
        });
        useGameStore.getState().triggerRefresh();
      }
    },
    onError: (error: Error) => {
      audioService.playError();
      setPurchaseResult({ error: error.message });
      setShowResult(true);
      toast.error(error.message);
    },
    onSettled: () => {
      setPurchaseDialog(null);
    }
  });

  const handlePurchase = (item: ShopItem) => {
    purchaseMutation.mutate(item.id);
  };
  
  const isPurchasing = purchaseMutation.isPending;
  const error = shopError ? shopError.message : null;

  const activeItems = (activeCategory === 'all' 
    ? allItems 
    : categories.find((c: any) => c.key === activeCategory)?.items || []).map((item: any) => {
      // Dynamic fix for energy items display
      if (item.category === 'energy' || item.id.includes('energy')) {
        const energyValue = item.content.energy;
        const isRefill = item.content.energyRefill;
        
        return {
          ...item,
          name: item.id.includes('small') ? 'Poción de Energía (P)' : 
                item.id.includes('medium') ? 'Elixir de Energía (M)' : 'Esencia de Energía (G)',
          description: isRefill ? 'Restaura TODA tu energía al máximo.' : 
                       `Restaura +${energyValue} puntos de energía.`,
          category: 'energy' // Ensure category is strictly 'energy'
        };
      }
      return item;
    });

  if (error) {
    return (
      <div className="flex flex-col items-center py-12">
        <ShoppingBag className="h-12 w-12 text-lumora-gold/20 mb-4" />
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" onClick={() => { queryClient.invalidateQueries({ queryKey: ['shopCategories'] }); queryClient.invalidateQueries({ queryKey: ['playerLumens'] }); }} className="rounded-xl">
          Reintentar
        </Button>
      </div>
    );
  }

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
    <div className="flex flex-col gap-4 pb-24">
      {/* Lumens display */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl glass-card-subtle">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lumora-gold" />
          <span className="text-sm font-semibold text-lumora-gold">Tus Lumens</span>
        </div>
        <span className="text-lg font-bold text-lumora-gold">{lumens.toLocaleString()}</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x">
        {/* All tab */}
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeCategory === 'all'
              ? 'text-lumora-gold bg-card/60 border border-current/20'
              : 'text-muted-foreground bg-card/30 border border-border/20 hover:bg-card/50'
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Todo
        </button>

        {categories.map((cat: any) => {
          const meta = CATEGORY_META[cat.key] || CATEGORY_META.energy;
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
              {meta.label}
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {activeItems.map((item) => {
            const canAfford = lumens >= item.price;
            const emoji = ITEM_EMOJIS[item.category] || '🎁';
            const meta = CATEGORY_META[item.category] || CATEGORY_META.energy;

            return (
              <motion.button
                key={item.id}
                onClick={() => canAfford && setPurchaseDialog(item)}
                disabled={!canAfford}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all glass-card-subtle ${
                  canAfford
                    ? 'hover:border-lumora-gold/30 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)] cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                whileHover={canAfford ? { scale: 1.02 } : {}}
                whileTap={canAfford ? { scale: 0.98 } : {}}
              >
                {/* Shop Item Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-card/40 flex items-center justify-center border border-${meta.color}/20 shadow-inner group-hover:scale-110 transition-transform`}>
                  <ShopItemIcon 
                    type={item.content.type || item.id.replace('shop_', '')} 
                    category={item.category} 
                    className="h-8 w-8"
                  />
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
                className="w-full rounded-xl btn-lumora-emerald font-semibold"
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
