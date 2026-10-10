import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useChatConversations } from '@/hooks/use-chat';
import { useAuth } from '@/providers/auth-provider';
import { getMyFamilies } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Conversation = {
  id: string;
  name: string;
  preview: string;
  time: string;
  initial: string;
  color: string;
  textColor: string;
  group: boolean;
};

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${conversation.name} beszélgetés megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: conversation.color },
          conversation.group && styles.groupAvatar,
        ]}
      >
        {conversation.group ? (
          <Ionicons name="people" size={28} color={conversation.textColor} />
        ) : (
          <Text style={[styles.avatarText, { color: conversation.textColor }]}>
            {conversation.initial}
          </Text>
        )}
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.name}>{conversation.name}</Text>
          <Text style={styles.time}>{conversation.time}</Text>
        </View>
        <Text
          numberOfLines={1}
          style={styles.preview}
        >
          {conversation.preview}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const { conversations: chatConversations, loading, error } = useChatConversations(familyId);
  const [search, setSearch] = useState('');
  const displayName = profile?.display_name || 'Gergely';
  useEffect(() => {
    void getMyFamilies().then((families) => setFamilyId(families[0]?.id ?? null));
  }, []);
  const conversations: Conversation[] = chatConversations.map((conversation) => {
    const firstMember = conversation.members.find((member) => member.id !== profile?.id) ?? conversation.members[0];
    const name = conversation.is_group
      ? conversation.title || 'Családi csoport'
      : firstMember?.display_name || 'Beszélgetés';
    return {
      id: conversation.id,
      name,
      preview: conversation.lastMessage?.body || 'Még nincs üzenet',
      time: conversation.lastMessage
        ? new Date(conversation.lastMessage.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
        : '',
      initial: conversation.is_group ? '♥' : (firstMember?.display_name?.charAt(0) || '?').toUpperCase(),
      color: conversation.is_group ? '#BCDDF0' : '#D6B38D',
      textColor: conversation.is_group ? '#2C6E9E' : '#5F351D',
      group: conversation.is_group,
    };
  });
  const query = search.trim().toLocaleLowerCase('hu-HU');
  const filteredConversations = query
    ? conversations.filter((conversation) =>
        `${conversation.name} ${conversation.preview}`.toLocaleLowerCase('hu-HU').includes(query),
      )
    : conversations;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Üzenetek</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Üzenetek beállításai"
          onPress={() => Alert.alert('Üzenetek', 'Az üzenetbeállítások hamarosan elérhetők.')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={23} color={colors.primary} />
        <TextInput
          accessibilityLabel="Üzenetek keresése"
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Keresés..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keresés törlése"
            onPress={() => setSearch('')}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.emptyState}><Text style={styles.emptyText}>Beszélgetések betöltése…</Text></View>
        ) : error ? (
          <View style={styles.emptyState}><Text style={styles.emptyText}>{error.message}</Text></View>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              onPress={() =>
                router.push({
                  pathname: '/chat-details',
                  params: { conversationId: conversation.id },
                })
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nincs találat</Text>
            <Text style={styles.emptyText}>
              {search ? 'Próbálj másik nevet vagy kifejezést keresni.' : 'Még nincs létrehozott beszélgetés.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Új üzenet írása"
        onPress={() => Alert.alert('Új üzenet', `Hamarosan üzenetet írhatsz a családodnak, ${displayName}.`)}
        style={({ pressed }) => [styles.composeButton, pressed && styles.pressed]}
      >
        <Ionicons name="create-outline" size={27} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  searchBox: {
    minHeight: 58,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: '#EEF4FC',
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 110 },
  row: {
    minHeight: 88,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.card,
  },
  groupAvatar: { borderWidth: 0 },
  avatarText: { fontSize: 25, fontWeight: '900' },
  rowContent: { flex: 1, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  time: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  preview: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  composeButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
