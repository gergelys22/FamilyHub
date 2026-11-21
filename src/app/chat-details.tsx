import { ChatAttachmentView } from '@/components/chat-attachment';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useChatMessages } from '@/hooks/use-chat';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  getChatConversation,
  kindFromMimeType,
  type ChatAttachmentInput,
  type ChatConversation,
} from '@/services/chat';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

export default function ChatDetailsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);
  const { messages, loading, error, send, sendAttachment } = useChatMessages(
    conversationId ?? null,
    profile?.id ?? null,
  );
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recording = recorderState.isRecording;

  useEffect(() => {
    if (!conversationId) return;
    void getChatConversation(conversationId)
      .then(setConversation)
      .catch(() => setConversation(null));
  }, [conversationId]);

  const isGroup = conversation?.is_group ?? false;
  const other = conversation?.members.find((member) => member.id !== profile?.id);
  const title = isGroup ? conversation?.title || 'Családi csoport' : other?.display_name || 'Beszélgetés';
  const subtitle = isGroup
    ? `${conversation?.members.length ?? 0} résztvevő`
    : 'Családtag';

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await send(text);
      setDraft('');
    } catch (caught) {
      Alert.alert('Küldés sikertelen', messageOf(caught, 'Próbáld újra.'));
    } finally {
      setSending(false);
    }
  }

  async function uploadFile(file: ChatAttachmentInput) {
    if (file.size && file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      Alert.alert('Túl nagy fájl', 'A csatolmány mérete legfeljebb 25 MB lehet.');
      return;
    }
    setSending(true);
    try {
      await sendAttachment(file);
    } catch (caught) {
      Alert.alert('Küldés sikertelen', messageOf(caught, 'Próbáld újra.'));
    } finally {
      setSending(false);
    }
  }

  async function handleMediaResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video';
    await uploadFile({
      uri: asset.uri,
      name: asset.fileName ?? `${isVideo ? 'video' : 'foto'}-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
      mimeType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      size: asset.fileSize,
      kind: isVideo ? 'video' : 'image',
    });
  }

  async function pickFromLibrary() {
    setAttachMenuVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });
      await handleMediaResult(result);
    } catch (caught) {
      Alert.alert('Kiválasztás sikertelen', messageOf(caught, 'Próbáld újra.'));
    }
  }

  async function takePhoto() {
    setAttachMenuVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Nincs kamera-engedély', 'Engedélyezd a kamerát a telefon beállításaiban.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });
      await handleMediaResult(result);
    } catch (caught) {
      Alert.alert('Kamera sikertelen', messageOf(caught, 'Próbáld újra.'));
    }
  }

  async function pickDocument() {
    setAttachMenuVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      await uploadFile({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        kind: kindFromMimeType(file.mimeType),
      });
    } catch (caught) {
      Alert.alert('Kiválasztás sikertelen', messageOf(caught, 'Próbáld újra.'));
    }
  }

  async function startRecording() {
    if (sending) return;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Nincs mikrofon-engedély', 'Engedélyezd a mikrofont a telefon beállításaiban.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (caught) {
      Alert.alert('Felvétel sikertelen', messageOf(caught, 'Próbáld újra.'));
    }
  }

  async function finishRecording(shouldSend: boolean) {
    const durationMs = recorderState.durationMillis;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch (caught) {
      Alert.alert('Felvétel sikertelen', messageOf(caught, 'Próbáld újra.'));
      return;
    }
    const uri = recorder.uri;
    if (!shouldSend || !uri) return;
    await uploadFile({
      uri,
      name: 'hanguzenet.m4a',
      mimeType: 'audio/mp4',
      kind: 'audio',
      durationMs,
    });
  }

  const hasDraft = draft.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
          <ScreenCloseButton />
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
            <Ionicons name="information-circle-outline" size={24} color={palette.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.messages, { backgroundColor: palette.background }]} showsVerticalScrollIndicator={false}>
          <View style={styles.encryption}>
            <Ionicons name="lock-closed-outline" size={14} color={palette.textMuted} />
            <Text style={styles.encryptionText}>
              Csak a beszélgetés résztvevői férnek hozzá
            </Text>
          </View>
          {loading ? <Text style={styles.status}>Üzenetek betöltése…</Text> : null}
          {error ? <Text style={styles.error}>{error.message}</Text> : null}
          {!loading && !error && messages.length === 0 ? (
            <Text style={styles.status}>Még nincs üzenet. Írj egyet elsőként!</Text>
          ) : null}
          {messages.map((message) => {
            const mine = message.sender_profile_id === profile?.id;
            const hasBody = message.body.length > 0;
            if (!hasBody && message.attachments.length === 0) return null;
            return (
              <View key={message.id} style={[styles.messageBlock, mine && styles.mineBlock]}>
                {isGroup && !mine ? <Text style={styles.author}>{message.sender.display_name}</Text> : null}
                {message.attachments.map((attachment) => (
                  <ChatAttachmentView key={attachment.id} attachment={attachment} mine={mine} palette={palette} />
                ))}
                {hasBody ? (
                  <View style={[styles.bubble, mine ? styles.myBubble : [styles.theirBubble, { backgroundColor: palette.surface }]]}>
                    <Text style={[styles.messageText, { color: mine ? palette.white : palette.textPrimary }]}>{message.body}</Text>
                  </View>
                ) : null}
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
                  <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {recording ? (
          <View style={[styles.composer, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
            <Pressable
              accessibilityLabel="Felvétel elvetése"
              onPress={() => void finishRecording(false)}
              style={styles.iconButton}
            >
              <Ionicons name="trash-outline" size={24} color={palette.danger} />
            </Pressable>
            <View style={styles.recordingInfo}>
              <View style={[styles.recordingDot, { backgroundColor: palette.danger }]} />
              <Text style={[styles.recordingTime, { color: palette.textPrimary }]}>
                {formatElapsed(recorderState.durationMillis)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Hangüzenet küldése"
              onPress={() => void finishRecording(true)}
              style={styles.send}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.composer, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
            <Pressable
              accessibilityLabel="Csatolmány hozzáadása"
              disabled={sending}
              onPress={() => setAttachMenuVisible(true)}
              style={[styles.iconButton, sending && styles.disabled]}
            >
              <Ionicons name="attach" size={26} color={palette.primary} />
            </Pressable>
            <TextInput
              accessibilityLabel="Üzenet szövege"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => void handleSend()}
              placeholder="Írj egy üzenetet..."
              placeholderTextColor={palette.textMuted}
              returnKeyType="send"
              style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary }]}
            />
            {sending ? (
              <View style={styles.send}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : hasDraft ? (
              <Pressable accessibilityLabel="Üzenet küldése" onPress={() => void handleSend()} style={styles.send}>
                <Ionicons name="send" size={18} color={colors.white} />
              </Pressable>
            ) : (
              <Pressable accessibilityLabel="Hangüzenet felvétele" onPress={() => void startRecording()} style={styles.send}>
                <Ionicons name="mic" size={20} color={colors.white} />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={attachMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAttachMenuVisible(false)}
      >
        <Pressable
          accessibilityLabel="Menü bezárása"
          onPress={() => setAttachMenuVisible(false)}
          style={[styles.menuOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}
        >
          <View style={[styles.menu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.menuTitle, { color: palette.textPrimary }]}>Csatolmány küldése</Text>
            {[
              { icon: 'images-outline' as const, label: 'Fotó vagy videó a galériából', onPress: pickFromLibrary },
              { icon: 'camera-outline' as const, label: 'Fényképezés / videófelvétel', onPress: takePhoto },
              { icon: 'document-text-outline' as const, label: 'Dokumentum', onPress: pickDocument },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => void item.onPress()}
                style={({ pressed }) => [styles.menuRow, { borderColor: palette.border }, pressed && styles.menuPressed]}
              >
                <View style={[styles.menuIcon, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name={item.icon} size={22} color={palette.primary} />
                </View>
                <Text style={[styles.menuLabel, { color: palette.textPrimary }]}>{item.label}</Text>
              </Pressable>
            ))}
            <Text style={[styles.menuHint, { color: palette.textMuted }]}>Legfeljebb 25 MB fájlonként.</Text>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
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
  messageBlock: { alignItems: 'flex-start', gap: 4, marginBottom: spacing.sm },
  mineBlock: { alignItems: 'flex-end' },
  author: { marginBottom: 3, color: colors.primary, fontSize: 10, fontWeight: '800' },
  bubble: { maxWidth: '82%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  theirBubble: { backgroundColor: colors.surfaceElevated, borderBottomLeftRadius: 5, ...shadows.card },
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
  input: { flex: 1, minHeight: 42, paddingHorizontal: spacing.md, color: colors.textPrimary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  send: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.primary },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  recordingTime: { fontSize: 16, fontWeight: '800' },
  menuOverlay: { flex: 1, justifyContent: 'flex-end' },
  menu: { padding: spacing.xl, gap: spacing.sm, borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  menuTitle: { marginBottom: spacing.xs, fontSize: 18, fontWeight: '900' },
  menuRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  menuPressed: { opacity: 0.7 },
  menuIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '800' },
  menuHint: { marginTop: spacing.xs, fontSize: 11, textAlign: 'center' },
});