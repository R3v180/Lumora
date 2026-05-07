'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  content: string;
  messageType: string;
  channel?: string;
  guildId?: string | null;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    level: number;
  };
}

interface UseChatOptions {
  channel: 'world' | 'guild';
  guildId?: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  send: (content: string) => Promise<void>;
  sending: boolean;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 5000;

export function useChat({ channel, guildId }: UseChatOptions): UseChatReturn {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef(channel);
  const guildIdRef = useRef(guildId);

  // Keep refs in sync
  useEffect(() => {
    channelRef.current = channel;
    guildIdRef.current = guildId;
  }, [channel, guildId]);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ channel, limit: '50' });
      const res = await fetch(`/api/chat?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          return data.messages as ChatMessage[];
        }
      }
    } catch (err) {
      console.error('Chat fetch error:', err);
      setError('Error al cargar mensajes');
      toast.error('Error al cargar mensajes');
    }
    return null;
  }, [channel]);

  // Initial load
  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    // For guild chat, require guildId
    if (channel === 'guild' && !guildId) {
      setLoading(false);
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      const fetched = await fetchMessages();
      if (!cancelled && fetched) {
        setMessages(fetched);
      }
      if (!cancelled) {
        setLoading(false);
      }
    };

    loadMessages();

    return () => { cancelled = true; };
  }, [session, channel, guildId, fetchMessages]);

  // Polling every 3 seconds
  useEffect(() => {
    if (!session?.user) return;
    if (channel === 'guild' && !guildId) return;

    const interval = setInterval(async () => {
      const fetched = await fetchMessages();
      if (fetched) {
        setMessages((prev) => {
          // Merge: keep server messages, add any local-only messages
          const serverIds = new Set(fetched.map((m: ChatMessage) => m.id));
          const localOnly = prev.filter((m) => !serverIds.has(m.id));
          return [...fetched, ...localOnly];
        });
      }
    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [session, channel, guildId, fetchMessages]);

  // Send message
  const send = useCallback(async (content: string) => {
    if (!content.trim() || !session?.user) return;

    setError(null);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), channel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al enviar mensaje');
        return;
      }

      // Append to local state
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    } catch (err) {
      setError('Error de conexión');
      toast.error('Error de conexión');
      console.error('Chat send error:', err);
    } finally {
      setSending(false);
    }
  }, [session, channel]);

  return {
    messages,
    send,
    sending,
    loading,
    error,
  };
}
