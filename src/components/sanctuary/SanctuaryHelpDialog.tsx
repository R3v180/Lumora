'use client';
import { HelpCircle, TreePine, Coins, Users, Clock, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

export function SanctuaryHelpDialog() {
  const t = useTranslations('help');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all">
          <HelpCircle className="h-5 w-5" />
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
            <div className="p-3 rounded-xl bg-background/50 border border-white/5">
              <Coins className="h-5 w-5 text-lumora-gold mb-1" />
              <h4 className="text-[10px] font-black uppercase text-white/60">Multiplicadores</h4>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[8px] font-bold"><span className="text-white/40">Común</span> <span className="text-lumora-gold">1.0x</span></div>
                <div className="flex justify-between text-[8px] font-bold"><span className="text-lumora-emerald">Raro</span> <span className="text-lumora-gold">1.5x</span></div>
                <div className="flex justify-between text-[8px] font-bold"><span className="text-lumora-blue">Épico</span> <span className="text-lumora-gold">2.2x</span></div>
                <div className="flex justify-between text-[8px] font-bold"><span className="text-lumora-gold">Legend.</span> <span className="text-lumora-gold">4.0x</span></div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-background/50 border border-white/5">
              <Sparkles className="h-5 w-5 text-lumora-blue mb-1" />
              <h4 className="text-[10px] font-black uppercase text-white/60">Niveles</h4>
              <p className="text-[9px] text-white/40 mt-1 leading-tight">
                Cada nivel del espíritu otorga un <span className="text-white font-bold">+10% de producción</span> base.
              </p>
            </div>
          </div>

          <section className="p-3 rounded-xl bg-lumora-purple/10 border border-lumora-purple/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-lumora-purple/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-lumora-purple" />
              </div>
              <h4 className="text-xs font-black uppercase text-lumora-purple-light">Resonancia Elemental</h4>
            </div>
            <p className="text-[9px] text-white/60 leading-relaxed">
              Agrupa espíritus del mismo elemento para activar potentes sinergias:
              <br/><span className="text-white font-bold">• 3 Espíritus</span>: +15% de Producción Elemental.
              <br/><span className="text-white font-bold">• 5+ Espíritus</span>: +30% de Producción Elemental.
            </p>
          </section>

          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-lumora-gold/5 border border-lumora-gold/10 text-[9px] font-bold text-white/40">
            Sube el nivel del Santuario para aumentar el límite de población.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
