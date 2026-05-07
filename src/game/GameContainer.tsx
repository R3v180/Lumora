'use client';

import { useEffect, useRef } from 'react';

interface GameContainerProps {
  gameConfig: Phaser.Types.Core.GameConfig;
}

export function GameContainer({ gameConfig }: GameContainerProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    import('phaser').then((Phaser) => {
      if (!containerRef.current) return;
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: containerRef.current,
      });
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameConfig]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl"
    />
  );
}
