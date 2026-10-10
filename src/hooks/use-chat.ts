import { supabase } from '@/lib/supabase';
import {
  ChatConversation,
  ChatMessage,
  getChatConversations,
  getChatMessages,
  sendChatMessage,
} from '@/services/chat';
import { useCallback, useEffect, useState } from 'react';

export function useChatConversations(familyId: string | null) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!familyId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setConversations(await getChatConversations(familyId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('A beszélgetések betöltése sikertelen.'));
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    void Promise.resolve().then(load);
    if (!familyId) return;
    const channel = supabase
      .channel(`chat-conversations:${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations', filter: `family_id=eq.${familyId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, load)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, load]);

  return { conversations, loading, error, refresh: load };
}

export function useChatMessages(conversationId: string | null, profileId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setMessages(await getChatMessages(conversationId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Az üzenetek betöltése sikertelen.'));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void Promise.resolve().then(load);
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` }, load)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  const send = useCallback(async (body: string) => {
    if (!conversationId || !profileId || !body.trim()) return;
    const message = await sendChatMessage(conversationId, profileId, body);
    setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
  }, [conversationId, profileId]);

  return { messages, loading, error, refresh: load, send };
}
