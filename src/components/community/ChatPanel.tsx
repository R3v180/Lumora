'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
  isSystem: boolean;
}

// Placeholder chat system (simulated for now, ready for WebSocket upgrade)
const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    playerId: 'system',
    playerName: 'Lumora',
    message: '¡Bienvenidos al chat de Lumora! Comparte tus aventuras con otros viajeros.',
    timestamp: new Date().toISOString(),
    isSystem: true,
  },
];

export function ChatPanel() {
  const t = useTranslations('community');
  const [messages, setMessages] = useState<ChatMessage[]>(SAMPLE_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [chatMode, setChatMode] = useState<'world' | 'guild'>('world');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      playerId: 'self',
      playerName: 'Tú',
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isSystem: false,
    };

    setMessages((prev) => [...prev, msg]);
    setNewMessage('');

    // Simulated response (placeholder for real chat system)
    setTimeout(() => {
      const responses = [
        '¡Buena suerte en tus giros! 🍀',
        '¿Alguien ha conseguido un espíritu legendario? ✨',
        'El Árbol del Mundo crece gracias a todos 💫',
        '¡Acabo de fusionar 3 espíritus! 🔥',
        'Mi santuario genera 500 Lumens/h 🏝️',
        '¿Alguien quiere unirse a mi gremio? 🏰',
      ];
      const responseMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        playerId: 'bot',
        playerName: ['AquaDream', 'FireStorm', 'StarWeaver', 'NatureBloom', 'MoonWalker'][
          Math.floor(Math.random() * 5)
        ],
        message: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        isSystem: false,
      };
      setMessages((prev) => [...prev, responseMsg]);
    }, 2000 + Math.random() * 3000);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[60vh]">
      {/* Chat mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setChatMode('world')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            chatMode === 'world'
              ? 'bg-lumora-blue/15 text-lumora-blue border border-lumora-blue/30'
              : 'text-muted-foreground bg-card/30 border border-border/20'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          {t('worldChat')}
        </button>
        <button
          onClick={() => setChatMode('guild')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            chatMode === 'guild'
              ? 'bg-lumora-purple/15 text-lumora-purple border border-lumora-purple/30'
              : 'text-muted-foreground bg-card/30 border border-border/20'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          {t('guildChat')}
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${
                msg.playerId === 'self' ? 'flex-row-reverse' : ''
              }`}
            >
              {msg.isSystem ? (
                <div className="w-full text-center py-1.5">
                  <p className="text-[10px] text-lumora-gold/70 italic">
                    ✨ {msg.message}
                  </p>
                </div>
              ) : (
                <>
                  <Avatar className="h-6 w-6 mt-0.5 border border-border/30 shrink-0">
                    <AvatarFallback className="bg-lumora-purple/20 text-lumora-purple text-[8px]">
                      {msg.playerName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      msg.playerId === 'self'
                        ? 'bg-lumora-blue/15 border border-lumora-blue/20 rounded-tr-sm'
                        : 'bg-card/50 border border-border/20 rounded-tl-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold ${
                        msg.playerId === 'self' ? 'text-lumora-blue' : 'text-lumora-purple'
                      }`}>
                        {msg.playerName}
                      </span>
                      <span className="text-[8px] text-muted-foreground/50">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{msg.message}</p>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 pt-3 mt-auto border-t border-border/20">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={t('chatPlaceholder')}
          maxLength={200}
          className="bg-card/40 border-border/30 rounded-xl text-sm"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          size="icon"
          className="rounded-xl bg-lumora-blue hover:bg-lumora-blue/80 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
        {t('chatDisclaimer')}
      </p>
    </div>
  );
}
