'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BossPanel } from '@/components/community/BossPanel';
import { audioService } from '@/lib/audioService';

import { motion } from 'framer-motion';

export default function BossPage() {
  const router = useRouter();

  useEffect(() => {
    audioService.playBGM('battle');
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Full Screen Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 2 }}
          src="/assets/backgrounds/bg_boss.png" 
          alt="" 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen px-4 pt-4 pb-24">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/play')}
            className="mr-2 bg-black/20 backdrop-blur-md rounded-full border border-white/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            Incursiones del Vacío
          </h1>
        </div>
        <BossPanel />
      </div>
    </div>
  );
}
