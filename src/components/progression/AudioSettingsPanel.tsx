'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  VolumeX, 
  Music, 
  Zap, 
  Volume1,
  Settings2,
  Play
} from 'lucide-react';
import { audioService } from '@/lib/audioService';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export function AudioSettingsPanel() {
  const [settings, setSettings] = useState(() => audioService.getSettings());

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    audioService.setVolumes(newSettings);
  };

  const handleTestSFX = () => {
    audioService.playClick();
  };

  return (
    <div className="w-full space-y-6 p-6 rounded-2xl bg-card/40 border border-border/30 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <Settings2 className="h-5 w-5 text-lumora-gold" />
        <h3 className="text-lg font-fantasy font-bold text-white tracking-wide">
          Ajustes de Sonido
        </h3>
      </div>

      <div className="space-y-8">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border transition-colors ${settings.muted ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-lumora-emerald/10 border-lumora-emerald/20 text-lumora-emerald'}`}>
              {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-bold text-white">Sonido Global</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Activar/Desactivar todo</p>
            </div>
          </div>
          <Switch 
            checked={!settings.muted} 
            onCheckedChange={(val) => updateSetting('muted', !val)}
          />
        </div>

        {/* Master Volume */}
        <div className={`space-y-3 transition-opacity duration-300 ${settings.muted ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Volume1 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Volumen Maestro</span>
            </div>
            <span className="text-xs font-mono text-lumora-gold">{Math.round(settings.master * 100)}%</span>
          </div>
          <Slider
            value={[settings.master * 100]}
            max={100}
            step={1}
            onValueChange={(val) => updateSetting('master', val[0] / 100)}
            className="[&_[role=slider]]:bg-lumora-gold"
          />
        </div>

        {/* Music Volume */}
        <div className={`space-y-3 transition-opacity duration-300 ${settings.muted ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Music className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Música de Ambiente</span>
            </div>
            <span className="text-xs font-mono text-lumora-blue">{Math.round(settings.music * 100)}%</span>
          </div>
          <Slider
            value={[settings.music * 100]}
            max={100}
            step={1}
            onValueChange={(val) => updateSetting('music', val[0] / 100)}
            className="[&_[role=slider]]:bg-lumora-blue"
          />
        </div>

        {/* SFX Volume */}
        <div className={`space-y-3 transition-opacity duration-300 ${settings.muted ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Efectos de Sonido</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleTestSFX}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                title="Probar sonido"
              >
                <Play className="h-3 w-3 text-lumora-pink" />
              </button>
              <span className="text-xs font-mono text-lumora-pink">{Math.round(settings.sfx * 100)}%</span>
            </div>
          </div>
          <Slider
            value={[settings.sfx * 100]}
            max={100}
            step={1}
            onValueChange={(val) => updateSetting('sfx', val[0] / 100)}
            className="[&_[role=slider]]:bg-lumora-pink"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        <p className="text-[9px] text-muted-foreground text-center italic">
          Los ajustes se guardan automáticamente en tu dispositivo.
        </p>
      </div>
    </div>
  );
}
