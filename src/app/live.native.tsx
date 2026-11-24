import { colors, radius, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { ensureCallPermissions } from '@/services/calls';
import { endLiveStream, fetchLiveToken, getLiveStream, type LiveStream, type LiveToken } from '@/services/live';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, isTrackReference, LiveKitRoom, useTracks, VideoTrack } from '@livekit/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Room, RoomEvent, Track } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#0B1220';
const MAX_CHAT_LINES = 6;

type ChatLine = { id: number; name: string; text: string };

// A LiveKitRoom-on belül fut, ezért itt használhatók a track hookok.
function Stage({ hostProfileId, isHost, title }: { hostProfileId: string; isHost: boolean; title: string }) {
  const tracks = useTracks([Track.Source.Camera]).filter(isTrackReference);
  const hostTrack =
    tracks.find((track) => track.participant.identity === hostProfileId) ??
    (isHost ? tracks.find((track) => track.participant.isLocal) : undefined);

  return (
    <View style={StyleSheet.absoluteFill}>
      {hostTrack ? (
        <VideoTrack trackRef={hostTrack} style={StyleSheet.absoluteFill} mirror={isHost} objectFit="cover" />
      ) : (
        <View style={styles.waiting}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.waitingText}>{isHost ? 'A kamera indul…' : 'Várakozás a közvetítőre…'}</Text>
          <Text style={styles.waitingTitle}>{title}</Text>
        </View>
      )}
    </View>
  );
}

export default function LiveScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { streamId } = useLocalSearchParams<{ streamId?: string }>();

  const [stream, setStream] = useState<LiveStream | null>(null);
  const [credentials, setCredentials] = useState<LiveToken | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [room] = useState(() => new Room());
  const [viewerCount, setViewerCount] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const leaving = useRef(false);
  const lineId = useRef(0);

  const isHost = stream !== null && stream.host_profile_id === profile?.id;

  const leave = useCallback(
    async (message?: string) => {
      if (leaving.current) return;
      leaving.current = true;
      if (isHost && streamId) {
        try {
          await endLiveStream(streamId);
        } catch {
          // A közvetítés később is lezárható, vagy magától elévül.
        }
      }
      void room.disconnect();
      if (message) Alert.alert('Élő közvetítés', message);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    [isHost, room, router, streamId],
  );

  // 1) A közvetítés betöltése, engedélyek és belépési token.
  useEffect(() => {
    if (!streamId || !profile?.id) return;
    let active = true;
    void (async () => {
      try {
        const loaded = await getLiveStream(streamId);
        if (!loaded) throw new Error('A közvetítés nem érhető el.');
        if (loaded.status !== 'live') throw new Error('Ez a közvetítés már véget ért.');
        if (loaded.host_profile_id === profile.id) {
          const granted = await ensureCallPermissions('video');
          if (!granted) {
            throw new Error('A közvetítéshez engedélyezd a kamerát és a mikrofont a telefon beállításaiban.');
          }
        }
        const token = await fetchLiveToken(streamId);
        if (!active) return;
        setStream(loaded);
        setCredentials(token);
      } catch (caught) {
        if (active) setFailure(caught instanceof Error ? caught.message : 'A közvetítés nem indítható.');
      }
    })();
    return () => {
      active = false;
    };
  }, [streamId, profile?.id]);

  // 2) Natív hangmunkamenet.
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  // 3) Nézők száma, chat és kapcsolat megszakadása.
  useEffect(() => {
    function onParticipants() {
      setViewerCount(room.remoteParticipants.size);
    }
    function onData(payload: Uint8Array, participant?: { name?: string }) {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as { t?: string };
        if (typeof parsed.t !== 'string' || !parsed.t.trim()) return;
        const text = parsed.t.slice(0, 300);
        lineId.current += 1;
        const id = lineId.current;
        setLines((current) =>
          [...current, { id, name: participant?.name ?? 'Családtag', text }].slice(-MAX_CHAT_LINES),
        );
      } catch {
        // Ismeretlen adatcsomagot figyelmen kívül hagyunk.
      }
    }
    function onDisconnected() {
      void leave();
    }
    room.on(RoomEvent.ParticipantConnected, onParticipants);
    room.on(RoomEvent.ParticipantDisconnected, onParticipants);
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipants);
      room.off(RoomEvent.ParticipantDisconnected, onParticipants);
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, leave]);

  // 4) Ha a közvetítő befejezi, a nézők kilépnek.
  useEffect(() => {
    if (!streamId || isHost) return;
    const channel = supabase
      .channel(`live-status:${streamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${streamId}` },
        (payload) => {
          if ((payload.new as { status?: string }).status === 'ended') {
            void leave('A közvetítés véget ért.');
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [streamId, isHost, leave]);

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    void room.localParticipant.setMicrophoneEnabled(next);
  }

  function toggleCamera() {
    const next = !cameraOn;
    setCameraOn(next);
    void room.localParticipant.setCameraEnabled(next);
  }

  function sendChat() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    lineId.current += 1;
    const id = lineId.current;
    setLines((current) =>
      [...current, { id, name: profile?.display_name ?? 'Én', text }].slice(-MAX_CHAT_LINES),
    );
    void room.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify({ t: text })), { reliable: true })
      .catch(() => {
        // Az üzenet helyben látszik, akkor is, ha a küldés nem sikerült.
      });
  }

  function confirmEnd() {
    if (!isHost) {
      void leave();
      return;
    }
    Alert.alert('Közvetítés befejezése', 'Biztosan leállítod az élő adást?', [
      { text: 'Folytatás', style: 'cancel' },
      { text: 'Befejezés', style: 'destructive', onPress: () => void leave() },
    ]);
  }

  if (failure) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#FFFFFF" />
          <Text style={styles.failureText}>{failure}</Text>
          <Pressable onPress={() => void leave()} style={styles.closeButton}>
            <Text style={styles.closeText}>Bezárás</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      {credentials && stream ? (
        <LiveKitRoom
          serverUrl={credentials.server_url}
          token={credentials.token}
          connect
          room={room}
          audio={isHost}
          video={isHost}
        >
          <Stage hostProfileId={stream.host_profile_id} isHost={isHost} title={stream.title} />
        </LiveKitRoom>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.failureText}>Csatlakozás…</Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isHost ? 'Közvetítés befejezése' : 'Kilépés'}
            onPress={confirmEnd}
            style={styles.topButton}
          >
            <Ionicons name={isHost ? 'stop' : 'chevron-back'} size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.topInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {stream?.title ?? 'Élő közvetítés'}
            </Text>
            <Text style={styles.host} numberOfLines={1}>
              {isHost ? 'Te közvetítesz' : (stream?.host_name ?? '')}
            </Text>
          </View>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>ÉLŐ</Text>
          </View>
          <View style={styles.countChip}>
            <Ionicons name="eye" size={14} color="#FFFFFF" />
            <Text style={styles.countText}>{viewerCount}</Text>
          </View>
        </View>

        <View style={styles.flex} pointerEvents="none" />

        <View pointerEvents="none" style={styles.chatLines}>
          {lines.map((line) => (
            <View key={line.id} style={styles.chatBubble}>
              <Text style={styles.chatText}>
                <Text style={styles.chatName}>{line.name}  </Text>
                {line.text}
              </Text>
            </View>
          ))}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.bottomBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Írj a családnak…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.chatInput}
              returnKeyType="send"
              onSubmitEditing={sendChat}
              maxLength={300}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Üzenet küldése"
              onPress={sendChat}
              style={styles.sendButton}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
            {isHost ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={micOn ? 'Mikrofon némítása' : 'Mikrofon bekapcsolása'}
                  onPress={toggleMic}
                  style={[styles.control, !micOn && styles.controlOff]}
                >
                  <Ionicons name={micOn ? 'mic' : 'mic-off'} size={20} color={micOn ? '#FFFFFF' : BACKGROUND} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={cameraOn ? 'Kamera kikapcsolása' : 'Kamera bekapcsolása'}
                  onPress={toggleCamera}
                  style={[styles.control, !cameraOn && styles.controlOff]}
                >
                  <Ionicons
                    name={cameraOn ? 'videocam' : 'videocam-off'}
                    size={20}
                    color={cameraOn ? '#FFFFFF' : BACKGROUND}
                  />
                </Pressable>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  flex: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  waitingText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '800' },
  waitingTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' },
  failureText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  closeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
  closeText: { color: '#FFFFFF', fontWeight: '900' },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(11, 18, 32, 0.6)',
  },
  topInfo: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  host: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  liveChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
    backgroundColor: '#E5384F',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  countChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.round,
    backgroundColor: 'rgba(11, 18, 32, 0.6)',
  },
  countText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  chatLines: { paddingHorizontal: spacing.lg, gap: 6, alignItems: 'flex-start' },
  chatBubble: {
    maxWidth: '86%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 18, 32, 0.62)',
  },
  chatText: { color: '#FFFFFF', fontSize: 14, lineHeight: 19 },
  chatName: { color: '#9BC2FF', fontWeight: '900' },
  bottomBar: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatInput: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    backgroundColor: 'rgba(11, 18, 32, 0.62)',
    color: '#FFFFFF',
  },
  sendButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.primary,
  },
  control: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: 'rgba(11, 18, 32, 0.62)',
  },
  controlOff: { backgroundColor: '#FFFFFF' },
});
