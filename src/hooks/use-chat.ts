import { supabase } from '@/lib/supabase';
import {
  deleteChatMessage,
  editChatMessage,
  getChatConversations,
  getChatMessages,
  sendChatAttachment,
  sendChatMessage,
  type ChatAttachmentInput,
  type ChatConversation,
  type ChatMessage,
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message_attachments' }, load)
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
      // szerkesztés és (puha) törlés is UPDATE esemény
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message_attachments', filter: `conversation_id=eq.${conversationId}` }, load)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  const upsertMessage = useCallback((message: ChatMessage) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current.map((item) => (item.id === message.id ? message : item))
        : [...current, message],
    );
  }, []);

  const send = useCallback(async (body: string) => {
    if (!conversationId || !profileId || !body.trim()) return;
    upsertMessage(await sendChatMessage(conversationId, profileId, body));
  }, [conversationId, profileId, upsertMessage]);

  const sendAttachment = useCallback(async (file: ChatAttachmentInput, caption = '') => {
    if (!conversationId || !profileId) return;
    upsertMessage(await sendChatAttachment(conversationId, profileId, file, caption));
  }, [conversationId, profileId, upsertMessage]);

  const edit = useCallback(async (messageId: string, body: string) => {
    const updated = await editChatMessage(messageId, body);
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, body: updated.body, edited_at: updated.edited_at } : item,
      ),
    );
  }, []);

  const remove = useCallback(async (message: ChatMessage) => {
    await deleteChatMessage(message);
    setMessages((current) => current.filter((item) => item.id !== message.id));
  }, []);

  return { messages, loading, error, refresh: load, send, sendAttachment, edit, remove };
}
