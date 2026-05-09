'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RaidPanel } from '@/components/community/RaidPanel';
import { audioService } from '@/lib/audioService';

export default function RaidPage() {
  const router = useRouter();

  useEffect(() => {
    audioService.playBGM('battle');
  }, []);

  return (
    <div className="flex flex-col min-h-screen px-4 pt-4 pb-24">
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/play')}
          className="mr-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-fantasy font-bold bg-gradient-to-r from-lumora-pink to-purple-600 bg-clip-text text-transparent">
          Saqueos
        </h1>
      </div>
      <RaidPanel />
    </div>
  );
}
