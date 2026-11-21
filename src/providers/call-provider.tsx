import { colors, darkColors, radius, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { answerCall, createCall, finishCall, type CallType, type ChatCall } from '@/services/calls';
import { getChatConversation } from '@/services/chat';
import { Ionicons } from '@expo/vector-icons';
import { registerGlobals } from '@livekit/react-native';
import { useRouter, type Href } from 'expo-router';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

// A LiveKit működéséhez a WebRTC globálisokat az app indulásakor be kell regisztrálni.
registerGlobals();

const INCOMING_MAX_AGE_MS = 60_000;

type IncomingCall = {
  call: ChatCall;
  callerName: string;
  isGroup: boolean;
};

type PlaceCallInput = {
  conversationId: string;
  type: CallType;
  name: string;
};

type CallContextValue = {
  placeCall: (input: PlaceCallInput) => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const value = useContext(CallContext);
  if (!value) throw new Error('A useCall csak a CallProvider-en belül használható.');
  return value;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let active = true;

    async function handleInsert(call: ChatCall) {
      if (call.started_by_profile_id === profileId || call.status !== 'ringing') return;
      if (Date.now() - new Date(call.created_at).getTime() > INCOMING_MAX_AGE_MS) return;
      let callerName = 'Családtag';
      let isGroup = false;
      try {
        const conversation = await getChatConversation(call.conversation_id);
        if (conversation) {
          isGroup = conversation.is_group;
          const caller = conversation.members.find((member) => member.id === call.started_by_profile_id);
          callerName = caller?.display_name ?? callerName;
        }
      } catch {
        // A hívás név nélkül is megjelenik.
      }
      if (active) setIncoming({ call, callerName, isGroup });
    }

    const channel = supabase
      .channel(`incoming-calls:${profileId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_calls' }, (payload) => {
        void handleInsert(payload.new as ChatCall);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_calls' }, (payload) => {
        const row = payload.new as ChatCall;
        setIncoming((current) =>
          current && current.call.id === row.id && row.status !== 'ringing' ? null : current,
        );
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [profileId]);

  // Csörgés helyett rezgés, amíg a bejövő hívás látszik; 45 mp után eltűnik.
  const hasIncoming = incoming !== null;
  useEffect(() => {
    if (!hasIncoming) return;
    Vibration.vibrate([0, 700, 700], true);
    const timer = setTimeout(() => setIncoming(null), 45_000);
    return () => {
      Vibration.cancel();
      clearTimeout(timer);
    };
  }, [hasIncoming]);

  const placeCall = useCallback(
    async ({ conversationId, type, name }: PlaceCallInput) => {
      if (!profileId) return;
      try {
        const call = await createCall(conversationId, profileId, type);
        router.push({
          pathname: '/call',
          params: { callId: call.id, conversationId, type, role: 'caller', name },
        } as unknown as Href);
      } catch (caught) {
        Alert.alert(
          'A hívás nem indítható',
          caught instanceof Error ? caught.message : 'Próbáld újra később.',
        );
      }
    },
    [profileId, router],
  );

  async function accept() {
    const current = incoming;
    if (!current) return;
    setIncoming(null);
    try {
      const ok = await answerCall(current.call.id);
      if (!ok) {
        Alert.alert('A hívás már nem elérhető', 'A hívó közben letette, vagy már véget ért.');
        return;
      }
      router.push({
        pathname: '/call',
        params: {
          callId: current.call.id,
          conversationId: current.call.conversation_id,
          type: current.call.call_type,
          role: 'callee',
          name: current.callerName,
        },
      } as unknown as Href);
    } catch (caught) {
      Alert.alert('A hívás nem fogadható', caught instanceof Error ? caught.message : 'Próbáld újra.');
    }
  }

  async function decline() {
    const current = incoming;
    if (!current) return;
    setIncoming(null);
    // Csoportos hívásnál az elutasítás csak nálad szűnteti meg a csörgést.
    if (current.isGroup) return;
    try {
      await finishCall(current.call.id, 'declined');
    } catch {
      // Ha nem sikerül, a hívás magától lejár.
    }
  }

  const value = useMemo(() => ({ placeCall }), [placeCall]);

  return (
    <CallContext.Provider value={value}>
      {children}
      <Modal visible={incoming !== null} transparent animationType="fade" onRequestClose={() => void decline()}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.9)' : 'rgba(23, 43, 77, 0.6)' }]}>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
              <Text style={[styles.avatarText, { color: palette.primary }]}>
                {(incoming?.callerName ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.name, { color: palette.textPrimary }]}>{incoming?.callerName}</Text>
            <Text style={[styles.kind, { color: palette.textSecondary }]}>
              {incoming?.call.call_type === 'video' ? 'Videóhívás' : 'Hanghívás'}
            </Text>
            <View style={styles.actions}>
              <View style={styles.actionColumn}>
                <Pressable
                  accessibilityLabel="Hívás elutasítása"
                  onPress={() => void decline()}
                  style={[styles.round, { backgroundColor: palette.danger }]}
                >
                  <Ionicons name="call" size={30} color={colors.white} style={styles.hangupIcon} />
                </Pressable>
                <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>Elutasít</Text>
              </View>
              <View style={styles.actionColumn}>
                <Pressable
                  accessibilityLabel="Hívás fogadása"
                  onPress={() => void accept()}
                  style={[styles.round, { backgroundColor: '#22A06B' }]}
                >
                  <Ionicons
                    name={incoming?.call.call_type === 'video' ? 'videocam' : 'call'}
                    size={30}
                    color={colors.white}
                  />
                </Pressable>
                <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>Fogadás</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </CallContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  avatar: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 44 },
  avatarText: { fontSize: 36, fontWeight: '900' },
  name: { marginTop: spacing.sm, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  kind: { fontSize: 14, fontWeight: '700' },
  actions: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.xxl },
  actionColumn: { alignItems: 'center', gap: spacing.sm },
  round: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 34 },
  hangupIcon: { transform: [{ rotate: '135deg' }] },
  actionLabel: { fontSize: 12, fontWeight: '800' },
});