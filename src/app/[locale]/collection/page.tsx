'use client';

import { AppShell } from '@/components/layout/AppShell';
import { motion } from 'framer-motion';
import { CollectionPanel } from '@/components/collection/CollectionPanel';

export default function CollectionPage() {
  return (
    <div className="flex flex-col px-4 pt-4 pb-32 relative min-h-screen overflow-hidden">
       {/* Immersive Background Layer */}
       <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 2 }}
          src="/assets/backgrounds/bg_collection.png" 
          alt="" 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <header className="relative z-10 mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">Mi Colección</h1>
        <p className="text-muted-foreground">Gestiona tus espíritus, fusiona duplicados y aumenta tu poder.</p>
      </header>
      
      <div className="relative z-10">
        <CollectionPanel />
      </div>
    </div>
  );
}
