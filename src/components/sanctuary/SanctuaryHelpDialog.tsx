'use client';
import { HelpCircle, TreePine, Coins, Users, Clock, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

export function SanctuaryHelpDialog() {
  const t = useTranslations('help');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lumora-emerald/20 text-lumora-emerald border border-lumora-emerald/30 hover:bg-lumora-emerald/30 transition-all text-xs font-bold">
          <HelpCircle className="h-3.5 w-3.5" /> ¿Cómo funciona?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-lumora-emerald/30">
        <DialogHeader>
          <DialogTitle className="font-fantasy text-xl text-lumora-emerald flex items-center gap-2">
            <TreePine className="h-5 w-5" /> {t('sanctuaryTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-background/50 border border-border/20">
              <Coins className="h-5 w-5 text-lumora-gold mb-1" />
              <h4 className="text-xs font-bold">{t('generation')}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{t('generationDesc')}</p>
            </div>
            <div className="p-3 rounded-xl bg-background/50 border border-border/20">
              <Users className="h-5 w-5 text-lumora-blue mb-1" />
              <h4 className="text-xs font-bold">{t('limit')}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{t('limitDesc')}</p>
            </div>
          </div>

          <section className="flex gap-3 p-3 rounded-xl bg-lumora-pink/5 border border-lumora-pink/20">
            <Clock className="h-6 w-6 text-lumora-pink shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-lumora-pink">{t('collect')}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{t('collectDesc')}</p>
            </div>
          </section>

          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-lumora-gold/10 text-lumora-gold text-[10px] font-bold">
            <Sparkles className="h-3 w-3" />
            Sube el nivel del Santuario para colocar más espíritus.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
