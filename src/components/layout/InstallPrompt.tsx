'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectamos si es un dispositivo Apple (iOS no soporta instalación automática)
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Si la app ya está instalada (se ejecuta como standalone), no mostramos nada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Capturamos el evento nativo de Chrome/Android
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Evitamos que Chrome lo lance por su cuenta
      setDeferredPrompt(e); // Lo guardamos
      setShowPrompt(true); // Mostramos nuestro cartel bonito
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // En iOS, como no hay evento nativo, mostramos el cartel informacional a los 3 segundos
    if (isIosDevice) {
      const timer = setTimeout(() => {
        // Solo mostramos si no es standalone
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Lanzamos el aviso nativo de Android/Chrome
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 left-4 right-4 z-[200] md:left-auto md:w-96 md:bottom-24"
      >
        <div className="bg-black/60 backdrop-blur-2xl border border-lumora-gold/30 rounded-3xl p-5 shadow-[0_0_40px_rgba(255,215,0,0.2)] relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-lumora-gold/10 rounded-full blur-2xl" />
          
          <button 
            onClick={() => setShowPrompt(false)}
            className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-lumora-gold/20 rounded-2xl flex items-center justify-center border border-lumora-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
              <Download className="h-6 w-6 text-lumora-gold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-fantasy font-bold text-lg text-white">Instalar Lumora</h3>
                <Sparkles className="h-3 w-3 text-lumora-gold animate-pulse" />
              </div>
              <p className="text-[10px] text-white/60 font-medium leading-tight">
                Juega a pantalla completa, sin barras de navegación y con mejor rendimiento.
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-white/90 leading-relaxed">
                Para jugar en iPhone: Toca el botón de <Share className="inline h-4 w-4 mx-1 text-lumora-blue" /> **Compartir** y luego selecciona <strong>"Añadir a la pantalla de inicio"</strong> <PlusSquare className="inline h-4 w-4 mx-1 text-white" />
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleInstallClick}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-lumora-gold to-lumora-pink text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
            >
              Instalar App
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
