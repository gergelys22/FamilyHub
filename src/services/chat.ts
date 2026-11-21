import { supabase } from '@/lib/supabase';

export const CHAT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_BUCKET = 'chat-attachments';

export type ChatProfile = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  profile_type: 'account' | 'dependent' | 'ancestor';
};

export type ChatAttachmentKind = 'image' | 'video' | 'audio' | 'document';

export type ChatAttachment = {
  id: string;
  message_id: string;
  kind: ChatAttachmentKind;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  duration_ms: number | null;
};

export type ChatAttachmentInput = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  kind: ChatAttachmentKind;
  durationMs?: number | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  sender: ChatProfile;
  attachments: ChatAttachment[];
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

type ConversationRow = Omit<ChatConversation, 'members' | 'lastMessage'>;
type MemberRow = { conversation_id: string; profile: ChatProfile };
type MessageRow = ChatMessage;

const ATTACHMENT_FIELDS =
  'id, message_id, kind, storage_path, file_name, mime_type, size_bytes, duration_ms';
const SENDER_FIELDS =
  'sender:profiles!chat_messages_sender_profile_id_fkey ( id, display_name, avatar_path, profile_type )';
const MESSAGE_SELECT = `id, conversation_id, sender_profile_id, body, created_at, ${SENDER_FIELDS}, attachments:chat_message_attachments ( ${ATTACHMENT_FIELDS} )`;

export function kindFromMimeType(mimeType?: string | null): ChatAttachmentKind {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  return 'document';
}

/** Rövid szöveg a beszélgetéslistához: az üzenet vagy a csatolmány típusa. */
export function describeChatMessage(message: Pick<ChatMessage, 'body' | 'attachments'>) {
  if (message.body) return message.body;
  const first = message.attachments[0] as ChatAttachment | undefined;
  if (!first) return '';
  switch (first.kind) {
    case 'image':
      return 'Fotó';
    case 'video':
      return 'Videó';
    case 'audio':
      return 'Hangüzenet';
    default:
      return first.file_name;
  }
}

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
    .select(MESSAGE_SELECT)
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
    .select(MESSAGE_SELECT)
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
    .select(MESSAGE_SELECT)
    .single<MessageRow>();
  if (error) throw error;
  return data;
}

/**
 * Feltölt egy fájlt a privát tárolóba, majd létrehoz egy üzenetet és a hozzá tartozó
 * csatolmány-sort. Ha bármelyik lépés hibázik, a már létrehozott részeket visszavonja.
 */
export async function sendChatAttachment(
  conversationId: string,
  senderProfileId: string,
  file: ChatAttachmentInput,
  caption = '',
) {
  const body = await (await fetch(file.uri)).arrayBuffer();
  const size = body.byteLength;
  if (size <= 0) throw new Error('A fájl üres.');
  if (size > CHAT_ATTACHMENT_MAX_BYTES) {
    throw new Error('A fájl mérete legfeljebb 25 MB lehet.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${conversationId}/${senderProfileId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, body, {
      contentType: file.mimeType ?? 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  let messageId: string | null = null;
  try {
    const message = await sendChatMessage(conversationId, senderProfileId, caption);
    messageId = message.id;
    const { data: attachment, error } = await supabase
      .from('chat_message_attachments')
      .insert({
        message_id: message.id,
        conversation_id: conversationId,
        uploaded_by_profile_id: senderProfileId,
        kind: file.kind,
        storage_path: path,
        file_name: file.name,
        mime_type: file.mimeType ?? null,
        size_bytes: size,
        duration_ms: file.durationMs ?? null,
      })
      .select(ATTACHMENT_FIELDS)
      .single<ChatAttachment>();
    if (error) throw error;
    return { ...message, attachments: [attachment] };
  } catch (caught) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
    if (messageId) {
      await supabase
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);
    }
    throw caught;
  }
}

const urlCache = new Map<string, { url: string; expiresAt: number }>();

/** Aláírt, 1 órás URL a csatolmányhoz; 50 percig gyorsítótárazva. */
export async function getChatAttachmentUrl(storagePath: string) {
  const cached = urlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'A fájl nem érhető el.');
  urlCache.set(storagePath, { url: data.signedUrl, expiresAt: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

async function createConversation(
  familyId: string,
  createdByProfileId: string,
  isGroup: boolean,
  title: string | null,
  profileIds: string[],
) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      family_id: familyId,
      created_by_profile_id: createdByProfileId,
      is_group: isGroup,
      title,
    })
    .select('id')
    .single<{ id: string }>();
  if (error) throw error;

  const uniqueProfileIds = [...new Set([createdByProfileId, ...profileIds])];
  const { error: membersError } = await supabase
    .from('chat_conversation_members')
    .insert(uniqueProfileIds.map((profileId) => ({ conversation_id: data.id, profile_id: profileId })));
  if (membersError) throw membersError;
  return data.id;
}

/** Megkeresi a két tag közti 1:1 beszélgetést, vagy létrehozza, ha még nincs. */
export async function findOrCreateDirectConversation(
  familyId: string,
  myProfileId: string,
  otherProfileId: string,
) {
  const conversations = await getChatConversations(familyId);
  const existing = conversations.find(
    (conversation) =>
      !conversation.is_group &&
      conversation.members.length === 2 &&
      conversation.members.some((member) => member.id === myProfileId) &&
      conversation.members.some((member) => member.id === otherProfileId),
  );
  if (existing) return existing.id;
  return createConversation(familyId, myProfileId, false, null, [otherProfileId]);
}

/** Megkeresi a családi csoportos beszélgetést, vagy létrehozza az összes taggal. */
export async function findOrCreateFamilyGroup(
  familyId: string,
  myProfileId: string,
  profileIds: string[],
) {
  const conversations = await getChatConversations(familyId);
  const existing = conversations.find(
    (conversation) =>
      conversation.is_group && conversation.members.some((member) => member.id === myProfileId),
  );
  if (existing) return existing.id;
  return createConversation(familyId, myProfileId, true, 'Családi csoport', profileIds);
}