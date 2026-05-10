'use client';

import { useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AVATARS } from '@/lib/avatars';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export function PlayerProfileEditor() {
  const { player, refetch } = usePlayer();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!player) return null;

  const currentAvatarId = player.avatar;
  const currentAvatar = AVATARS.find(a => a.id === currentAvatarId);

  const handleSave = async () => {
    if (isSaving) return;

    if (!newName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          displayName: newName.trim(),
          avatar: selectedAvatar
        })
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

  const openEditor = () => {
    setNewName(player.displayName);
    setSelectedAvatar(player.avatar || '');
    setIsEditing(true);
  };

  return (
    <div className="relative group">
      <div className="flex flex-col items-center gap-4 p-6 rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl transition-all hover:border-lumora-gold/30">
        {/* Current Avatar Display */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-r from-lumora-gold to-lumora-pink animate-gradient-xy">
            <div className="w-full h-full rounded-full bg-background overflow-hidden border-2 border-black flex items-center justify-center">
              {currentAvatar ? (
                <div 
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: currentAvatar.svg }} 
                />
              ) : (
                <Avatar className="h-full w-full">
                  <AvatarImage src={player.avatar || undefined} />
                  <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-2xl font-black italic">
                    {player.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
          
          <Button 
            size="icon" 
            onClick={openEditor}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-lumora-gold text-black hover:scale-110 transition-transform shadow-lg border-2 border-black"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-lumora-gold to-lumora-pink bg-clip-text text-transparent">
            {player.displayName}
          </h3>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Viajero Dimensional</p>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[450px] bg-[#0f0f12] border-lumora-gold/20 rounded-[2.5rem] overflow-hidden p-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.1)_0%,transparent_70%)] pointer-events-none" />
          
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-black text-white uppercase italic tracking-tighter">Editar Perfil</DialogTitle>
            <DialogDescription className="text-xs text-white/40 font-bold uppercase tracking-widest">Personaliza tu identidad en Lumora</DialogDescription>
          </DialogHeader>

          <div className="p-8 pt-0 space-y-8">
            {/* Name input */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-lumora-gold uppercase tracking-widest ml-1">Nombre de Usuario</label>
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white placeholder:text-white/20 focus:border-lumora-gold/50 transition-colors"
                placeholder="Escribe tu nombre..."
              />
            </div>

            {/* Avatar Grid */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-lumora-gold uppercase tracking-widest ml-1 flex justify-between">
                <span>Elegir Avatar</span>
                <span className="text-white/20 italic">Próximamente más en la tienda</span>
              </label>
              
              <ScrollArea className="h-48 rounded-2xl bg-black/40 border border-white/5 p-4">
                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`
                        aspect-square rounded-xl p-1 transition-all relative group overflow-hidden
                        ${selectedAvatar === av.id ? 'bg-lumora-gold ring-2 ring-lumora-gold ring-offset-2 ring-offset-black' : 'bg-white/5 hover:bg-white/10'}
                      `}
                    >
                      <div 
                        className="w-full h-full rounded-lg overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: av.svg }} 
                      />
                      {selectedAvatar === av.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-lumora-gold/20 backdrop-blur-[1px]">
                          <Check className="h-6 w-6 text-black drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 flex flex-row gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setIsEditing(false)}
              className="flex-1 h-12 rounded-xl text-white/40 font-black hover:bg-white/5"
            >
              CANCELAR
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-lumora-gold to-lumora-pink text-black font-black shadow-lg shadow-lumora-gold/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
