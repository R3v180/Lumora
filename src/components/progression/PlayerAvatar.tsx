'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AVATARS } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  avatarId?: string | null;
  displayName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

export function PlayerAvatar({ 
  avatarId, 
  displayName = '?', 
  className,
  size = 'md'
}: PlayerAvatarProps) {
  const customAvatar = AVATARS.find(a => a.id === avatarId);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className={cn(
      "relative rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow-lg",
      sizeClasses[size],
      className
    )}>
      {customAvatar ? (
        <div 
          className="w-full h-full bg-background/50 p-[10%] transition-transform hover:scale-110"
          dangerouslySetInnerHTML={{ __html: customAvatar.svg }} 
        />
      ) : (
        <Avatar className="w-full h-full">
          <AvatarImage src={avatarId || undefined} alt={displayName} />
          <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-[40%] font-black italic">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
