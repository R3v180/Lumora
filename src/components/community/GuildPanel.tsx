'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, LogOut, Search, Crown, Star, User,
  Swords, Sparkles, Users, ChevronRight, Edit3, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface GuildMember {
  id: string;
  role: string;
  joinedAt: string;
  player: {
    id: string;
    displayName: string;
    level: number;
    sanctuaryLevel: number;
    lumens: number;
    avatar: string | null;
  };
}

interface GuildData {
  id: string;
  name: string;
  description: string | null;
  emblem: string | null;
  level: number;
  experience: number;
  maxMembers: number;
  ownerId: string;
  memberCount: number;
  members: GuildMember[];
}

interface RecommendedGuild {
  id: string;
  name: string;
  description: string | null;
  emblem: string | null;
  level: number;
  memberCount: number;
  maxMembers: number;
  canJoin: boolean;
}

export function GuildPanel() {
  const t = useTranslations('community');
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [inGuild, setInGuild] = useState(false);
  const [recommended, setRecommended] = useState<RecommendedGuild[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecommendedGuild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');

  const fetchGuild = useCallback(async () => {
    try {
      const res = await fetch('/api/guild');
      if (res.ok) {
        const data = await res.json();
        if (data.inGuild) {
          setInGuild(true);
          setGuild(data.guild);
          setRole(data.role);
        } else {
          setInGuild(false);
          setRecommended(data.recommendedGuilds || []);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuild();
  }, [fetchGuild]);

  const handleCreateGuild = async () => {
    if (!newGuildName.trim() || newGuildName.trim().length < 3) return;

    try {
      const res = await fetch('/api/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newGuildName.trim(),
          description: newGuildDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateDialog(false);
        setNewGuildName('');
        setNewGuildDesc('');
        fetchGuild();
      }
    } catch {
      // silently fail
    }
  };

  const handleJoinGuild = async (guildId: string) => {
    try {
      const res = await fetch('/api/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', guildId }),
      });

      if (res.ok) {
        fetchGuild();
      }
    } catch {
      // silently fail
    }
  };

  const handleLeaveGuild = async () => {
    try {
      const res = await fetch('/api/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });

      if (res.ok) {
        fetchGuild();
      }
    } catch {
      // silently fail
    }
  };

  const handleSearchGuilds = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`/api/guild?search=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.guilds || []);
      }
    } catch {
      // silently fail
    }
  };

  const getRoleIcon = (memberRole: string) => {
    switch (memberRole) {
      case 'owner':
        return <Crown className="h-3.5 w-3.5 text-lumora-gold" />;
      case 'officer':
        return <Star className="h-3.5 w-3.5 text-lumora-blue" />;
      default:
        return <User className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (memberRole: string) => {
    switch (memberRole) {
      case 'owner':
        return t('guildLeader');
      case 'officer':
        return t('guildOfficer');
      default:
        return t('guildMember');
    }
  };

  const GUILD_EMOJIS = ['🏰', '⚔️', '🌟', '🛡️', '🔮', '🌙', '⚔️', '🐉', '💎', '🏆'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="h-5 w-5 text-lumora-gold" />
        </motion.div>
      </div>
    );
  }

  // === IN GUILD VIEW ===
  if (inGuild && guild) {
    const isOwner = role === 'owner';
    const isOfficer = role === 'officer';

    return (
      <div className="flex flex-col gap-4">
        {/* Guild Header */}
        <div className="rounded-2xl border border-lumora-purple/20 bg-gradient-to-br from-lumora-purple/10 to-lumora-blue/5 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-lumora-purple/20 flex items-center justify-center text-2xl border border-lumora-purple/30">
                {guild.emblem || GUILD_EMOJIS[0]}
              </div>
              <div>
                <h3 className="font-fantasy font-bold text-lg text-lumora-purple">
                  {guild.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 border-lumora-gold/30 text-lumora-gold">
                    <Crown className="h-2.5 w-2.5" />
                    Nv. {guild.level}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {guild.memberCount}/{guild.maxMembers}
                  </span>
                </div>
              </div>
            </div>
            {(isOwner || isOfficer) && (
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {guild.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {guild.description}
            </p>
          )}
          {/* Guild XP bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>XP Gremio</span>
              <span>{guild.experience}/{guild.level * 500}</span>
            </div>
            <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-lumora-purple to-lumora-blue rounded-full transition-all"
                style={{ width: `${Math.min((guild.experience / (guild.level * 500)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Guild Actions */}
        {!isOwner && (
          <Button
            variant="outline"
            onClick={handleLeaveGuild}
            className="w-full rounded-xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {t('leaveGuild')}
          </Button>
        )}

        {/* Members List */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-lumora-blue" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('members')} ({guild.members.length})
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          {guild.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-card/40 border border-border/20"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-border/30">
                  <AvatarImage src={member.player.avatar || undefined} />
                  <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-xs">
                    {member.player.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{member.player.displayName}</p>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Nv. {member.player.level} · {getRoleLabel(member.role)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-lumora-gold">
                <Sparkles className="h-3 w-3" />
                {member.player.lumens.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === NOT IN GUILD VIEW ===
  return (
    <div className="flex flex-col gap-4">
      {/* Create Guild */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="w-full rounded-xl gap-2 bg-gradient-to-r from-lumora-purple to-lumora-blue text-white hover:opacity-90">
            <Plus className="h-4 w-4" />
            {t('createGuild')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-fantasy">{t('createGuild')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Input
              value={newGuildName}
              onChange={(e) => setNewGuildName(e.target.value)}
              placeholder={t('guildNamePlaceholder')}
              maxLength={20}
              className="rounded-xl"
            />
            <Input
              value={newGuildDesc}
              onChange={(e) => setNewGuildDesc(e.target.value)}
              placeholder={t('guildDescPlaceholder')}
              maxLength={100}
              className="rounded-xl"
            />
            <Button
              onClick={handleCreateGuild}
              disabled={newGuildName.trim().length < 3}
              className="rounded-xl bg-gradient-to-r from-lumora-purple to-lumora-blue text-white"
            >
              {t('createGuild')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search guilds */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchGuilds()}
            placeholder={t('searchGuildPlaceholder')}
            className="pl-9 bg-card/40 border-border/30 rounded-xl"
          />
        </div>
        <Button
          onClick={handleSearchGuilds}
          variant="outline"
          size="icon"
          className="rounded-xl border-border/30"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Search results or recommended */}
      <AnimatePresence mode="wait">
        {searchResults.length > 0 ? (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('searchResults')}
              </p>
              <button
                onClick={() => setSearchResults([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('close')} ✕
              </button>
            </div>
            {searchResults.map((g) => (
              <GuildCard key={g.id} guild={g} onJoin={handleJoinGuild} t={t} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="recommended"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('recommendedGuilds')}
            </p>
            {recommended.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t('noGuildsYet')}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t('beFirstGuild')}</p>
              </div>
            ) : (
              recommended.map((g) => (
                <GuildCard key={g.id} guild={g} onJoin={handleJoinGuild} t={t} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuildCard({
  guild,
  onJoin,
  t,
}: {
  guild: RecommendedGuild;
  onJoin: (id: string) => void;
  t: any;
}) {
  const GUILD_EMOJIS = ['🏰', '⚔️', '🌟', '🛡️', '🔮', '🌙', '🐉', '💎', '🏆', '🔥'];

  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card/40 border border-border/20 hover:border-lumora-purple/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-lumora-purple/15 flex items-center justify-center text-xl border border-lumora-purple/20">
          {guild.emblem || GUILD_EMOJIS[Math.floor(Math.random() * GUILD_EMOJIS.length)]}
        </div>
        <div>
          <p className="text-sm font-semibold">{guild.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Crown className="h-2.5 w-2.5 text-lumora-gold" />
              Nv. {guild.level}
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" />
              {guild.memberCount}/{guild.maxMembers}
            </span>
          </div>
        </div>
      </div>
      {guild.canJoin ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onJoin(guild.id)}
          className="rounded-lg gap-1 text-xs h-7 border-lumora-purple/30 text-lumora-purple hover:bg-lumora-purple/10"
        >
          <ChevronRight className="h-3 w-3" />
          {t('joinGuild')}
        </Button>
      ) : (
        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/30">
          {t('guildFull')}
        </Badge>
      )}
    </div>
  );
}
