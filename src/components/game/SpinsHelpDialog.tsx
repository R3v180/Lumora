'use client';
import { HelpCircle, Zap, Star, Sparkles, MoveRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

export function SpinsHelpDialog() {
  const t = useTranslations('help');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lumora-purple/20 text-lumora-purple border border-lumora-purple/30 hover:bg-lumora-purple/30 transition-all text-xs font-bold">
          <HelpCircle className="h-3.5 w-3.5" /> Ayuda
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-lumora-purple/30">
        <DialogHeader>
          <DialogTitle className="font-fantasy text-xl text-lumora-gold flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> {t('spinsTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto max-h-[70vh] pr-2">
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-lumora-pink flex items-center gap-2">
              <MoveRight className="h-4 w-4" /> {t('paylines')}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('paylinesDesc')}</p>
          </section>
          
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-lumora-blue flex items-center gap-2">
              <Zap className="h-4 w-4" /> {t('elementalSurge')}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('elementalSurgeDesc')}</p>
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-bold text-lumora-emerald flex items-center gap-2">
              <Star className="h-4 w-4" /> {t('spiritUnlock')}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('spiritUnlockDesc')}</p>
          </section>

          <div className="p-3 rounded-xl bg-lumora-gold/10 border border-lumora-gold/20">
            <p className="text-[11px] text-lumora-gold italic">
              <strong>Tip:</strong> {t('wildSymbolDesc')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
