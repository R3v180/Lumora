'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { audioService } from '@/lib/audioService';

interface RewardedVideoAdProps {
  isOpen: boolean;
  onClose: () => void;
  onReward: () => void;
  rewardText: string;
}

export function RewardedVideoAd({ isOpen, onClose, onReward, rewardText }: RewardedVideoAdProps) {
  const [timeLeft, setTimeLeft] = useState(5); // Simulate 5s ad for prototype
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(5);
      setIsFinished(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleClaim = () => {
    audioService.playClaimReward();
    onReward();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
      <div className="absolute top-4 right-4 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          disabled={!isFinished}
          className={`rounded-full bg-card/50 ${isFinished ? 'text-white' : 'text-muted-foreground opacity-50 cursor-not-allowed'}`}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="w-full max-w-md flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 rounded-2xl bg-lumora-blue/20 flex items-center justify-center border border-lumora-blue/50"
          >
            <Video className="h-10 w-10 text-lumora-blue" />
          </motion.div>
          {!isFinished && (
            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center font-bold text-sm">
              {timeLeft}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-fantasy font-bold text-white">Anuncio Patrocinado</h2>
          <p className="text-muted-foreground">
            {isFinished 
              ? "¡Gracias por tu apoyo! Tu recompensa está lista." 
              : "La recompensa estará disponible en breve..."}
          </p>
        </div>

        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button 
                onClick={handleClaim}
                className="rounded-xl bg-gradient-to-r from-lumora-blue to-lumora-purple text-white font-bold h-12 px-8 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
              >
                Reclamar {rewardText}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
