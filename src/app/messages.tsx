import { PresenceDot } from '@/components/presence-dot';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useChatConversations } from '@/hooks/use-chat';
import { useAuth } from '@/providers/auth-provider';
import { usePresence } from '@/providers/presence-provider';
import { useTheme } from '@/providers/theme-provider';
import { describeChatMessage, findOrCreateDirectConversation, findOrCreateFamilyGroup } from '@/services/chat';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
  memberId: string | null;
  online: boolean;
};

function ConversationRow({
  conversation,
  onPress,
  palette,
}: {
  conversation: Conversation;
  onPress: () => void;
  palette: typeof colors | typeof darkColors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${conversation.name} beszélgetés megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: palette.surface }, pressed && styles.pressed]}
    >
      <View style={styles.avatarWrapper}>
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
      
      {!conversation.group && conversation.memberId ? (
        <PresenceDot
          visible={conversation.online}
          size={14}
          style={styles.onlineDot}
        />
      ) : null}
    </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: palette.textPrimary }]}>{conversation.name}</Text>
          <Text style={[styles.time, { color: palette.textMuted }]}>{conversation.time}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.preview, { color: palette.textSecondary }]}>
          {conversation.preview}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const { isProfileOnline } = usePresence();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [composeVisible, setComposeVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const {
    conversations: chatConversations,
    loading,
    error,
  } = useChatConversations(familyId);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        if (!active) return;
        setFamilyId(id);
        if (!id) return;
        const familyMembers = await getFamilyMembers(id);
        if (active) setMembers(familyMembers);
      })
      .catch((caught: unknown) => {
        if (active) {
          Alert.alert(
            'Betöltés sikertelen',
            caught instanceof Error ? caught.message : 'Próbáld újra később.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function startConversation(target: { type: 'member'; profileId: string } | { type: 'group' }) {
    if (!familyId || !profile?.id || starting) return;
    setStarting(true);
    try {
      const conversationId =
        target.type === 'group'
          ? await findOrCreateFamilyGroup(
              familyId,
              profile.id,
              members.map((member) => member.profile_id),
            )
          : await findOrCreateDirectConversation(familyId, profile.id, target.profileId);
      setComposeVisible(false);
      router.push({ pathname: '/chat-details', params: { conversationId } });
    } catch (caught) {
      Alert.alert(
        'Beszélgetés indítása sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra később.',
      );
    } finally {
      setStarting(false);
    }
  }

  const conversations: Conversation[] = chatConversations
    .filter((conversation) => conversation.members.some((member) => member.id === profile?.id))
    .map((conversation) => {
    const firstMember =
      conversation.members.find((member) => member.id !== profile?.id) ??
      conversation.members[0];
    const name = conversation.is_group
      ? conversation.title || 'Családi csoport'
      : firstMember?.display_name || 'Beszélgetés';
    return {
    id: conversation.id,
    name,
    preview: conversation.lastMessage
      ? describeChatMessage(conversation.lastMessage) || 'Még nincs üzenet'
      : 'Még nincs üzenet',
    time: conversation.lastMessage
      ? new Date(conversation.lastMessage.created_at).toLocaleTimeString('hu-HU', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    initial: conversation.is_group
      ? '♥'
      : (firstMember?.display_name?.charAt(0) || '?').toUpperCase(),
    color: conversation.is_group ? '#BCDDF0' : '#D6B38D',
    textColor: conversation.is_group ? '#2C6E9E' : '#5F351D',
    group: conversation.is_group,
    memberId: conversation.is_group ? null : firstMember?.id ?? null,
    online: !conversation.is_group && isProfileOnline(firstMember?.id),
  };
  });
  const query = search.trim().toLocaleLowerCase('hu-HU');
  const filteredConversations = query
    ? conversations.filter((conversation) =>
        `${conversation.name} ${conversation.preview}`
          .toLocaleLowerCase('hu-HU')
          .includes(query),
      )
    : conversations;
  const otherMembers = members.filter((member) => member.profile_id !== profile?.id);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Üzenetek</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Üzenetek beállításai"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={22} color={palette.primary} />
        </Pressable>
      </View>

      <View style={[styles.searchBox, { backgroundColor: palette.surface }]}>
        <Ionicons name="search" size={23} color={palette.primary} />
        <TextInput
          accessibilityLabel="Üzenetek keresése"
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Keresés..."
          placeholderTextColor={palette.textMuted}
          style={[styles.searchInput, { color: palette.textPrimary }]}
          value={search}
        />
        {search.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keresés törlése"
            onPress={() => setSearch('')}
          >
            <Ionicons name="close-circle" size={20} color={palette.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>Beszélgetések betöltése…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>{error.message}</Text>
          </View>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              palette={palette}
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
            <Ionicons name="chatbubbles-outline" size={42} color={palette.textMuted} />
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Nincs találat</Text>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {search
                ? 'Próbálj másik nevet vagy kifejezést keresni.'
                : 'Még nincs létrehozott beszélgetés.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Új üzenet írása"
        onPress={() => setComposeVisible(true)}
        style={({ pressed }) => [styles.composeButton, pressed && styles.pressed]}
      >
        <Ionicons name="create-outline" size={27} color={colors.white} />
      </Pressable>

      <Modal
        visible={composeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!starting) setComposeVisible(false);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Új üzenet</Text>
              <Pressable
                accessibilityLabel="Bezárás"
                disabled={starting}
                hitSlop={8}
                onPress={() => setComposeVisible(false)}
              >
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                disabled={starting}
                onPress={() => void startConversation({ type: 'group' })}
                style={({ pressed }) => [styles.pickRow, { borderColor: palette.border }, pressed && styles.pressed]}
              >
                <View style={[styles.pickAvatar, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name="people" size={22} color={palette.primary} />
                </View>
                <Text style={[styles.pickName, { color: palette.textPrimary }]}>Családi csoport</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
              </Pressable>
              {otherMembers.map((member) => {
                const label = member.nickname || member.display_name;
                return (
                  <Pressable
                    key={member.profile_id}
                    disabled={starting}
                    onPress={() => void startConversation({ type: 'member', profileId: member.profile_id })}
                    style={({ pressed }) => [styles.pickRow, { borderColor: palette.border }, pressed && styles.pressed]}
                  >
                    <View style={[styles.pickAvatar, { backgroundColor: palette.primarySoft }]}>
                      <Text style={[styles.pickInitial, { color: palette.primary }]}>
                        {label.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.pickName, { color: palette.textPrimary }]}>{label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                  </Pressable>
                );
              })}
              {otherMembers.length === 0 ? (
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  Még nincs másik családtag, akinek írhatnál.
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    maxHeight: '75%',
    padding: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  pickRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
    avatarWrapper: {
    width: 64,
    height: 64,
    position: 'relative',
  },

  onlineDot: {
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  pickAvatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  pickInitial: { fontSize: 16, fontWeight: '900' },
  pickName: { flex: 1, fontSize: 15, fontWeight: '800' },
});