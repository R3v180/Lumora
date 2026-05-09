'use client';

import { useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';

export function PlayerProfileEditor() {
  const { player, refetch } = usePlayer();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!player) return null;

  const handleSave = async () => {
    if (!newName.trim() || newName.trim() === player.displayName) {
      setIsEditing(false);
      return;
    }

    if (newName.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newName.trim() })
      });

      if (res.ok) {
        toast.success('Perfil actualizado');
        await refetch();
        setIsEditing(false);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al actualizar perfil');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 mb-4 rounded-xl bg-card/40 border border-border/30">
      <Avatar className="h-20 w-20 border-2 border-lumora-gold/40 shadow-lg">
        <AvatarImage src={player.avatar || undefined} seed={player.displayName} />
        <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-xl">
          {player.displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="w-full">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              className="bg-background/50 border-border/40"
              placeholder="Tu nombre..."
              disabled={isSaving}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="text-lumora-emerald shrink-0">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-destructive shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-lg font-bold text-center bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent">
              {player.displayName}
            </h3>
            <Button size="icon" variant="ghost" onClick={() => { setNewName(player.displayName); setIsEditing(true); }} className="h-6 w-6 text-muted-foreground hover:text-white">
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        {player.avatar ? 'Usando tu foto de Google' : 'Tu avatar SVG procedural'}
      </p>
    </div>
  );
}
