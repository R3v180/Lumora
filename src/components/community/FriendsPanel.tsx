'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Search, Check, X, UserMinus, Users,
  Shield, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface FriendData {
  friendshipId: string;
  id: string;
  displayName: string;
  level: number;
  sanctuaryLevel: number;
  lumens: number;
  avatar: string | null;
  status: string;
}

interface SearchPlayerData {
  id: string;
  displayName: string;
  level: number;
  sanctuaryLevel: number;
  avatar: string | null;
  spiritCount: number;
  friendshipStatus: string | null;
  friendshipId: string | null;
}

export function FriendsPanel() {
  const t = useTranslations('community');
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendData[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPlayerData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const fetchFriends = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
        setPendingSent(data.pendingSent);
        setPendingReceived(data.pendingReceived);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
      setError('Error al cargar amigos');
      toast.error('Error al cargar amigos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error('Failed to search players:', err);
      toast.error('Error al buscar jugadores');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSendRequest = async (targetPlayerId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', targetPlayerId }),
      });

      if (res.ok) {
        // Update search results
        setSearchResults((prev) =>
          prev.map((r) =>
            r.id === targetPlayerId
              ? { ...r, friendshipStatus: 'pending', friendshipId: 'new' }
              : r
          )
        );
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to send friend request:', err);
      toast.error('Error al enviar solicitud');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', friendshipId }),
      });

      if (res.ok) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to accept friend request:', err);
      toast.error('Error al aceptar solicitud');
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', friendshipId }),
      });

      if (res.ok) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to reject friend request:', err);
      toast.error('Error al rechazar solicitud');
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', friendshipId }),
      });

      if (res.ok) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to remove friend:', err);
      toast.error('Error al eliminar amigo');
    }
  };

  const totalPending = pendingSent.length + pendingReceived.length;

  const getElementEmoji = (level: number) => {
    if (level >= 20) return '⭐';
    if (level >= 15) return '🌙';
    if (level >= 10) return '🌿';
    if (level >= 5) return '💧';
    return '🔥';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('searchPlaceholder')}
            className="pl-9 bg-card/40 border-border/30 rounded-xl"
          />
        </div>
        <Button
          onClick={() => {
            handleSearch();
            setShowSearch(true);
          }}
          variant="outline"
          size="icon"
          className="rounded-xl border-border/30"
          disabled={isSearching}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="text-destructive text-sm text-center py-4">
          {error}
          <Button variant="link" onClick={() => { setIsLoading(true); fetchFriends(); }} className="text-destructive ml-2">
            Reintentar
          </Button>
        </div>
      )}

      {/* Search Results */}
      <AnimatePresence>
        {showSearch && searchResults.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('searchResults')}
              </p>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchResults([]);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t('close')} ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {searchResults.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl glass-card-subtle"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border/30">
                      <AvatarImage src={player.avatar || undefined} seed={player.displayName} />
                      <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-xs">
                        {player.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{player.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Nv. {player.level} · {player.spiritCount} {t('spirits')}
                      </p>
                    </div>
                  </div>
                  {player.friendshipStatus === 'accepted' ? (
                    <Badge variant="outline" className="text-[10px] text-lumora-emerald border-lumora-emerald/30">
                      {t('alreadyFriends')}
                    </Badge>
                  ) : player.friendshipStatus === 'pending' ? (
                    <Badge variant="outline" className="text-[10px] text-lumora-gold border-lumora-gold/30">
                      {t('pending')}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendRequest(player.id)}
                      className="rounded-lg gap-1 text-xs h-7 border-lumora-blue/30 text-lumora-blue hover:bg-lumora-blue/10"
                    >
                      <UserPlus className="h-3 w-3" />
                      {t('addFriend')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending requests */}
      {totalPending > 0 && (
        <button
          onClick={() => setShowPending(!showPending)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-lumora-gold/10 border border-lumora-gold/20"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-lumora-gold" />
            <span className="text-sm font-semibold text-lumora-gold">
              {totalPending} {t('pendingRequests')}
            </span>
          </div>
          {showPending ? (
            <ChevronUp className="h-4 w-4 text-lumora-gold" />
          ) : (
            <ChevronDown className="h-4 w-4 text-lumora-gold" />
          )}
        </button>
      )}

      <AnimatePresence>
        {showPending && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex flex-col gap-2"
          >
            {/* Received requests */}
            {pendingReceived.map((req) => (
              <div
                key={req.friendshipId}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-card/40 border border-lumora-emerald/20"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-lumora-emerald/30">
                    <AvatarImage src={req.avatar || undefined} seed={req.displayName} />
                    <AvatarFallback className="bg-lumora-emerald/20 text-lumora-emerald text-xs">
                      {req.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{req.displayName}</p>
                    <p className="text-[10px] text-muted-foreground">Nv. {req.level}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcceptRequest(req.friendshipId)}
                    className="rounded-lg h-7 w-7 p-0 border-lumora-emerald/30 text-lumora-emerald hover:bg-lumora-emerald/10"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRequest(req.friendshipId)}
                    className="rounded-lg h-7 w-7 p-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Sent requests */}
            {pendingSent.map((req) => (
              <div
                key={req.friendshipId}
                className="flex items-center justify-between px-3 py-2 rounded-xl glass-card-subtle"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-border/30">
                    <AvatarImage src={req.avatar || undefined} seed={req.displayName} />
                    <AvatarFallback className="bg-lumora-blue/20 text-lumora-blue text-xs">
                      {req.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{req.displayName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('requestSent')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-lumora-gold border-lumora-gold/30">
                  {t('pending')}
                </Badge>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends list */}
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-lumora-blue" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('friendsList')} ({friends.length})
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="h-5 w-5 text-lumora-gold" />
          </motion.div>
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('noFriends')}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t('noFriendsHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {friends.map((friend) => (
            <motion.div
              key={friend.friendshipId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl glass-card-subtle hover:border-lumora-blue/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-9 w-9 border border-border/30">
                    <AvatarImage src={friend.avatar || undefined} seed={friend.displayName} />
                    <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-xs">
                      {friend.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
                    {getElementEmoji(friend.level)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{friend.displayName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Nv. {friend.level}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Shield className="h-2.5 w-2.5" />
                      {friend.sanctuaryLevel}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5 text-lumora-gold" />
                      {friend.lumens.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveFriend(friend.friendshipId)}
                className="rounded-lg h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
