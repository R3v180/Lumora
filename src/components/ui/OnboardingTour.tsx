'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, X } from 'lucide-react';
import { useGameStore } from '@/lib/store';

interface Step {
  title: string;
  content: string;
  image?: string;
}

const STEPS: Step[] = [
  {
    title: "¡Bienvenido a Lumora!",
    content: "Has despertado en un mundo de sueños y magia. Como Viajero, tu destino es restaurar el equilibrio de estas islas flotantes.",
  },
  {
    title: "El Giro Onírico",
    content: "Tu principal fuente de poder. Gira la rueda para obtener Lumens, Energía y descubrir nuevos Espíritus Guardianes.",
  },
  {
    title: "Tu Santuario",
    content: "Aquí es donde tus espíritus descansan y generan recursos para ti. Mejóralo para expandir tu dominio.",
  },
  {
    title: "Un Regalo de Inicio",
    content: "Para comenzar tu viaje, te hemos otorgado 500 Lumens y 150 de Energía. ¡Úsalos con sabiduría!",
  }
];

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const syncPlayerStats = useGameStore(s => s.syncPlayerStats);

  useEffect(() => {
    // Check if onboarding is needed (this could be triggered from a parent component)
    const hasSeen = localStorage.getItem('lumora_onboarding_seen');
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      const res = await fetch('/api/player/onboarding', { method: 'POST' });
      if (res.ok) {
        localStorage.setItem('lumora_onboarding_seen', 'true');
        setIsVisible(false);
        // Refresh stats to show the starter spirit if given
        const statsRes = await fetch('/api/player');
        if (statsRes.ok) {
          const data = await statsRes.json();
          syncPlayerStats(data);
        }
      }
    } catch (e) {
      console.error(e);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative max-w-sm w-full bg-card border border-lumora-gold/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(255,215,0,0.2)] overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-lumora-gold/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-lumora-pink/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-lumora-gold/20 rounded-full">
                <Sparkles className="h-10 w-10 text-lumora-gold animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-white mb-4 font-fantasy">
              {STEPS[currentStep].title}
            </h2>
            
            <p className="text-center text-muted-foreground leading-relaxed mb-8">
              {STEPS[currentStep].content}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-lumora-gold' : 'w-1.5 bg-white/20'}`} 
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lumora-gold to-lumora-pink rounded-xl font-bold text-black hover:opacity-90 transition-opacity"
              >
                {currentStep === STEPS.length - 1 ? 'EMPEZAR' : 'SIGUIENTE'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
