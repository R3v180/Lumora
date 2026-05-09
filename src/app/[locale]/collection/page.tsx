'use client';

import { AppShell } from '@/components/layout/AppShell';
import { CollectionPanel } from '@/components/collection/CollectionPanel';

export default function CollectionPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">MI COLECCIÓN</h1>
          <p className="text-muted-foreground">Gestiona tus espíritus, fusiona duplicados y aumenta tu poder.</p>
        </header>
        
        <CollectionPanel />
      </div>
    </AppShell>
  );
}
