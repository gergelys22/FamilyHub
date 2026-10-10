import { supabase } from '@/lib/supabase';

export type ChatProfile = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  profile_type: 'account' | 'dependent' | 'ancestor';
};

export type ChatConversation = {
  id: string;
  family_id: string;
  title: string | null;
  is_group: boolean;
  updated_at: string;
  members: ChatProfile[];
  lastMessage: ChatMessage | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  sender: ChatProfile;
};

type ConversationRow = Omit<ChatConversation, 'members' | 'lastMessage'>;
type MemberRow = { conversation_id: string; profile: ChatProfile };
type MessageRow = Omit<ChatMessage, 'sender'> & { sender: ChatProfile };

export async function getChatConversations(familyId: string) {
  const { data: conversations, error } = await supabase
    .from('chat_conversations')
    .select('id, family_id, title, is_group, updated_at')
    .eq('family_id', familyId)
    .order('updated_at', { ascending: false })
    .returns<ConversationRow[]>();
  if (error) throw error;
  if (!conversations?.length) return [];

  const ids = conversations.map((conversation) => conversation.id);
  const { data: members, error: membersError } = await supabase
    .from('chat_conversation_members')
    .select('conversation_id, profile:profiles ( id, display_name, avatar_path, profile_type )')
    .in('conversation_id', ids)
    .returns<MemberRow[]>();
  if (membersError) throw membersError;

  const { data: lastMessages, error: messagesError } = await supabase
    .from('chat_messages')
    .select(
      'id, conversation_id, sender_profile_id, body, created_at, sender:profiles!chat_messages_sender_profile_id_fkey ( id, display_name, avatar_path, profile_type )',
    )
    .in('conversation_id', ids)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<MessageRow[]>();
  if (messagesError) throw messagesError;

  return conversations.map((conversation) => ({
    ...conversation,
    members: (members ?? [])
      .filter((member) => member.conversation_id === conversation.id)
      .map((member) => member.profile),
    lastMessage:
      (lastMessages ?? []).find((message) => message.conversation_id === conversation.id) ?? null,
  }));
}

export async function getChatConversation(conversationId: string) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, family_id, title, is_group, updated_at')
    .eq('id', conversationId)
    .single<ConversationRow>();
  if (error) throw error;
  const conversations = await getChatConversations(data.family_id);
  return conversations.find((conversation) => conversation.id === conversationId) ?? null;
}

export async function getChatMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(
      'id, conversation_id, sender_profile_id, body, created_at, sender:profiles!chat_messages_sender_profile_id_fkey ( id, display_name, avatar_path, profile_type )',
    )
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .returns<MessageRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function sendChatMessage(
  conversationId: string,
  senderProfileId: string,
  body: string,
) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_profile_id: senderProfileId,
      body: body.trim(),
    })
    .select(
      'id, conversation_id, sender_profile_id, body, created_at, sender:profiles!chat_messages_sender_profile_id_fkey ( id, display_name, avatar_path, profile_type )',
    )
    .single<MessageRow>();
  if (error) throw error;
  return data;
}
