'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Globe, Lock, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { usePlayer } from '@/hooks/usePlayer';
import { PlayerAvatar } from '@/components/progression/PlayerAvatar';

const MAX_MESSAGE_LENGTH = 500;
const CHAR_COUNTER_THRESHOLD = 400;

function getRelativeTime(timestamp: string, t: (key: string, vars?: Record<string, number>) => string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 60000) {
    return t('justNow');
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return t('minutesAgo', { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t('hoursAgo', { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  return t('daysAgo', { count: diffDays });
}

function getLevelBadgeColor(level: number): string {
  if (level <= 5) return 'border-muted-foreground/30 text-muted-foreground/70';
  if (level <= 10) return 'border-lumora-blue/40 text-lumora-blue/80';
  if (level <= 20) return 'border-lumora-purple/40 text-lumora-purple/80';
  return 'border-lumora-gold/40 text-lumora-gold/80';
}

export function ChatPanel() {
  const t = useTranslations('chat');
  const { data: session } = useSession();
  const { player } = usePlayer();
  const [chatMode, setChatMode] = useState<'world' | 'guild'>('world');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const guildId = player?.guild?.guildId;

  const {
    messages: worldMessages,
    send: sendWorld,
    sending: sendingWorld,
    loading: worldLoading,
    error: worldError,
  } = useChat({ channel: 'world' });

  const {
    messages: guildMessages,
    send: sendGuild,
    sending: sendingGuild,
    loading: guildLoading,
    error: guildError,
  } = useChat({ channel: 'guild', guildId });

  const messages = chatMode === 'world' ? worldMessages : guildMessages;
  const loading = chatMode === 'world' ? worldLoading : guildLoading;
  const chatError = chatMode === 'world' ? worldError : guildError;
  const send = chatMode === 'world' ? sendWorld : sendGuild;
  const sending = chatMode === 'world' ? sendingWorld : sendingGuild;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session?.user) return;
    if (chatMode === 'guild' && !guildId) return;

    const content = newMessage.trim();
    setNewMessage('');
    await send(content);
  };

  const charactersLeft = MAX_MESSAGE_LENGTH - newMessage.length;
  const isOverLimit = newMessage.length > MAX_MESSAGE_LENGTH;
  const canSend = newMessage.trim().length > 0 && !isOverLimit && session?.user && (chatMode === 'world' || !!guildId) && !sending;

  // Not logged in
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Lock className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground text-center">{t('loginToChat')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[60vh]">
      {/* Chat mode toggle */}
      <div className="flex gap-2 mb-3">
        <ChatModeButton mode="world" active={chatMode === 'world'} onClick={() => setChatMode('world')} />
        <ChatModeButton mode="guild" active={chatMode === 'guild'} onClick={() => setChatMode('guild')} />
      </div>

      {/* Guild chat but not in a guild */}
      {chatMode === 'guild' && !guildId ? (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground text-center">{t('mustBeInGuild')}</p>
        </div>
      ) : (
        <>
          {/* Error banner */}
          {chatError && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-[10px] text-destructive">{chatError}</p>
            </div>
          )}

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin"
          >
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <Loader2 className="h-5 w-5 text-lumora-purple animate-spin" />
                <span className="text-xs text-muted-foreground">{t('loading')}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs text-muted-foreground/50 italic">
                  {chatMode === 'world' ? '✨ ¡Sé el primero en escribir!' : '🏰 ¡Escribe en el chat de tu gremio!'}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender.id === player?.id}
                    levelLabel={t('level', { level: msg.sender.level })}
                    relativeTime={getRelativeTime(msg.createdAt, (key, vars) => t(key, vars as any))}
                  />
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="pt-3 mt-auto border-t border-border/20">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH + 10))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && canSend) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={t('typeMessage')}
                  className="bg-card/40 border-border/30 rounded-xl text-sm pr-14"
                  disabled={!session?.user || (chatMode === 'guild' && !guildId) || sending}
                />
                {newMessage.length > CHAR_COUNTER_THRESHOLD && (
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono ${
                      isOverLimit
                        ? 'text-destructive'
                        : charactersLeft < 50
                          ? 'text-amber-500'
                          : 'text-muted-foreground/40'
                    }`}
                  >
                    {charactersLeft}
                  </span>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!canSend}
                size="icon"
                className="rounded-xl bg-lumora-gold/80 hover:bg-lumora-gold text-background shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Chat mode toggle button
function ChatModeButton({
  mode,
  active,
  onClick,
}: {
  mode: 'world' | 'guild';
  active: boolean;
  onClick: () => void;
}) {
  const t = useTranslations('chat');

  const Icon = mode === 'world' ? Globe : Shield;
  const activeClass =
    mode === 'world'
      ? 'bg-lumora-gold/15 text-lumora-gold border-lumora-gold/30'
      : 'bg-lumora-purple/15 text-lumora-purple border-lumora-purple/30';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
        active
          ? `${activeClass} border`
          : 'text-muted-foreground bg-card/30 border border-border/20'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {t(mode)}
    </button>
  );
}

// Individual chat bubble
function ChatBubble({
  message,
  isOwn,
  levelLabel,
  relativeTime,
}: {
  message: ChatMessage;
  isOwn: boolean;
  levelLabel: string;
  relativeTime: string;
}) {
  const isSystem = message.messageType === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <span className="text-[10px] text-muted-foreground/50 italic px-3 py-1">
          {message.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      <PlayerAvatar 
        avatarId={message.sender.avatar} 
        displayName={message.sender.displayName} 
        size="xs"
        className={isOwn ? 'border-lumora-gold/30' : 'border-lumora-purple/30'}
      />
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
          isOwn
            ? 'bg-lumora-gold/10 border border-lumora-gold/20 rounded-tr-sm'
            : 'bg-card/50 border border-lumora-purple/10 rounded-tl-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-[10px] font-semibold ${
              isOwn ? 'text-lumora-gold' : 'text-lumora-purple'
            }`}
          >
            {message.sender.displayName}
          </span>
          <Badge
            variant="outline"
            className={`h-3.5 px-1 text-[7px] leading-none ${getLevelBadgeColor(message.sender.level)}`}
          >
            {levelLabel}
          </Badge>
          <span className="text-[8px] text-muted-foreground/50">
            {relativeTime}
          </span>
        </div>
        <p className="text-xs leading-relaxed break-words">{message.content}</p>
      </div>
    </motion.div>
  );
}
