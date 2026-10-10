import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useChatMessages } from '@/hooks/use-chat';
import { useAuth } from '@/providers/auth-provider';
import { getChatConversation, type ChatConversation } from '@/services/chat';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatDetailsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [draft, setDraft] = useState('');
  const { messages, loading, error, send } = useChatMessages(conversationId ?? null, profile?.id ?? null);

  useEffect(() => {
    if (!conversationId) return;
    void getChatConversation(conversationId).then(setConversation);
  }, [conversationId]);

  const isGroup = conversation?.is_group ?? false;
  const other = conversation?.members.find((member) => member.id !== profile?.id);
  const title = isGroup ? conversation?.title || 'Családi csoport' : other?.display_name || 'Beszélgetés';
  const subtitle = isGroup
    ? `${conversation?.members.length ?? 0} résztvevő`
    : 'Családtag';

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    await send(text);
    setDraft('');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/family-member-profile',
                params: { memberId: isGroup ? 'family' : other?.id },
              })
            }
            style={styles.identity}
          >
            <View style={styles.headerAvatar}>
              <Ionicons name={isGroup ? 'people' : 'person'} size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/family-member-profile',
                params: { memberId: isGroup ? 'family' : other?.id },
              })
            }
            style={styles.headerButton}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          <View style={styles.encryption}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Text style={styles.encryptionText}>A beszélgetés biztonságos</Text>
          </View>
          {loading ? <Text style={styles.status}>Üzenetek betöltése…</Text> : null}
          {error ? <Text style={styles.error}>{error.message}</Text> : null}
          {!loading && !error && messages.length === 0 ? (
            <Text style={styles.status}>Még nincs üzenet. Írj egyet elsőként!</Text>
          ) : null}
          {messages.map((message) => {
            const mine = message.sender_profile_id === profile?.id;
            return (
              <View key={message.id} style={[styles.messageBlock, mine && styles.mineBlock]}>
                {isGroup && !mine ? <Text style={styles.author}>{message.sender.display_name}</Text> : null}
                <View style={[styles.bubble, mine ? styles.myBubble : styles.theirBubble]}>
                  <Text style={[styles.messageText, mine && styles.myText]}>{message.body}</Text>
                </View>
                <Text style={styles.time}>
                  {new Date(message.created_at).toLocaleTimeString('hu-HU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}
          {isGroup ? (
            <View>
              <Text style={styles.participantsTitle}>A csoport résztvevői</Text>
              {conversation?.members.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() =>
                    router.push({ pathname: '/family-member-profile', params: { memberId: member.id } })
                  }
                  style={styles.participant}
                >
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>{member.display_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.participantName}>{member.display_name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Üzenet szövege"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void handleSend()}
            placeholder="Írj egy üzenetet..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            style={styles.input}
          />
          <Pressable disabled={!draft.trim()} onPress={() => void handleSend()} style={[styles.send, !draft.trim() && styles.disabled]}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  headerAvatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.primarySoft },
  headerTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  headerSubtitle: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  messages: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  encryption: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginBottom: spacing.md },
  encryptionText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  status: { paddingVertical: spacing.xl, color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, textAlign: 'center' },
  messageBlock: { alignItems: 'flex-start', marginBottom: spacing.sm },
  mineBlock: { alignItems: 'flex-end' },
  author: { marginBottom: 3, color: colors.primary, fontSize: 10, fontWeight: '800' },
  bubble: { maxWidth: '82%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  theirBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 5, ...shadows.card },
  myBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  messageText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  myText: { color: colors.white },
  time: { marginTop: 3, color: colors.textMuted, fontSize: 10 },
  participantsTitle: { marginTop: spacing.lg, color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  participant: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  smallAvatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.primarySoft },
  smallAvatarText: { color: colors.primary, fontWeight: '900' },
  participantName: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  composer: { minHeight: 66, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, minHeight: 42, paddingHorizontal: spacing.md, color: colors.textPrimary, borderRadius: radius.round, backgroundColor: colors.background },
  send: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.primary },
  disabled: { opacity: 0.4 },
});
