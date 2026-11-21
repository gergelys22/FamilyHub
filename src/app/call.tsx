import { colors, radius, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
    CALL_RING_TIMEOUT_MS,
    ensureCallPermissions,
    fetchCallToken,
    finishCall,
    type CallToken,
    type CallType,
    type ChatCall,
} from '@/services/calls';
import { Ionicons } from '@expo/vector-icons';
import {
    AudioSession,
    isTrackReference,
    LiveKitRoom,
    useTracks,
    VideoTrack,
} from '@livekit/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Room, RoomEvent, Track } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#0B1220';

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

type StageProps = {
  callType: CallType;
  name: string;
  statusText: string;
  cameraOn: boolean;
};

// A LiveKitRoom-on belül fut, ezért itt használhatók a track hookok.
function CallStage({ callType, name, statusText, cameraOn }: StageProps) {
  const tracks = useTracks([Track.Source.Camera]).filter(isTrackReference);
  const remote = tracks.find((track) => !track.participant.isLocal);
  const local = tracks.find((track) => track.participant.isLocal);
  const showRemoteVideo = callType === 'video' && remote !== undefined;

  return (
    <View style={styles.stage}>
      {showRemoteVideo ? <VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} /> : null}
      {!showRemoteVideo ? (
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.topInfo}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.status}>{statusText}</Text>
      </View>
      {callType === 'video' && local && cameraOn ? (
        <VideoTrack trackRef={local} style={styles.localVideo} mirror />
      ) : null}
    </View>
  );
}

export default function CallScreen() {
  const router = useRouter();
  const { callId, conversationId, type, role, name } = useLocalSearchParams<{
    callId?: string;
    conversationId?: string;
    type?: string;
    role?: string;
    name?: string;
  }>();
  const callType: CallType = type === 'video' ? 'video' : 'audio';
  const isCaller = role === 'caller';
  const displayName = name ?? 'Hívás';

  const [credentials, setCredentials] = useState<CallToken | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [room] = useState(() => new Room());
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(callType === 'video');
  const [remoteCount, setRemoteCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const hadRemote = useRef(false);
  const leaving = useRef(false);

  const leave = useCallback(
    async (
      status?: 'ended' | 'declined' | 'missed' | 'cancelled',
      message?: string,
    ) => {
      if (leaving.current) return;
      leaving.current = true;
      if (status && callId) {
        try {
          await finishCall(callId, status);
        } catch {
          // A hívás magától lejár, ha az állapot nem frissíthető.
        }
      }
      void room.disconnect();
      if (message) Alert.alert('Hívás', message);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    [callId, room, router],
  );

  // 1) Engedélyek és belépési token.
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    void (async () => {
      try {
        const granted = await ensureCallPermissions(callType);
        if (!granted) {
          throw new Error('A híváshoz engedélyezd a mikrofont (videónál a kamerát) a telefon beállításaiban.');
        }
        const result = await fetchCallToken(conversationId);
        if (active) setCredentials(result);
      } catch (caught) {
        if (active) setFailure(caught instanceof Error ? caught.message : 'A hívás nem indítható.');
      }
    })();
    return () => {
      active = false;
    };
  }, [conversationId, callType]);

  // 2) Natív hangmunkamenet.
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  // 3) Résztvevők belépése és kilépése.
  useEffect(() => {
    function onParticipantsChanged() {
      const count = room.remoteParticipants.size;
      if (count > 0) hadRemote.current = true;
      setRemoteCount(count);
      if (hadRemote.current && count === 0) void leave('ended');
    }
    function onDisconnected() {
      void leave('ended');
    }
    room.on(RoomEvent.ParticipantConnected, onParticipantsChanged);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantsChanged);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipantsChanged);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantsChanged);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, leave]);

  // 4) A hívás állapotának követése (elutasítás, lemondás, vége).
  useEffect(() => {
    if (!callId) return;
    const channel = supabase
      .channel(`call-status:${callId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_calls', filter: `id=eq.${callId}` },
        (payload) => {
          const status = (payload.new as ChatCall).status;
          if (status === 'declined') void leave(undefined, 'A hívást elutasították.');
          else if (status === 'ended' || status === 'cancelled' || status === 'missed') void leave();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [callId, leave]);

  // 5) Ha a hívott nem veszi fel, a hívó oldalán lejár a csörgés.
  useEffect(() => {
    if (!isCaller || remoteCount > 0) return;
    const timer = setTimeout(() => {
      if (!hadRemote.current) void leave('missed', 'Nem vették fel a hívást.');
    }, CALL_RING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isCaller, remoteCount, leave]);

  // 6) Hívásidő számláló.
  useEffect(() => {
    if (remoteCount === 0) return;
    const timer = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [remoteCount]);

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

  function hangUp() {
    void leave(hadRemote.current || !isCaller ? 'ended' : 'cancelled');
  }

  if (failure) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.white} />
          <Text style={styles.failureText}>{failure}</Text>
          <Pressable
            onPress={() => void leave(isCaller ? 'cancelled' : undefined)}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>Bezárás</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusText =
    remoteCount > 0 ? formatTimer(seconds) : isCaller ? 'Csörög…' : 'Csatlakozás…';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {credentials ? (
        <LiveKitRoom
          serverUrl={credentials.server_url}
          token={credentials.token}
          connect
          room={room}
          audio
          video={callType === 'video'}
        >
          <CallStage callType={callType} name={displayName} statusText={statusText} cameraOn={cameraOn} />
        </LiveKitRoom>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={colors.white} size="large" />
          <Text style={styles.failureText}>Csatlakozás…</Text>
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={micOn ? 'Mikrofon némítása' : 'Mikrofon bekapcsolása'}
          onPress={toggleMic}
          style={[styles.control, !micOn && styles.controlOff]}
        >
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={26} color={micOn ? colors.white : BACKGROUND} />
        </Pressable>
        {callType === 'video' ? (
          <Pressable
            accessibilityLabel={cameraOn ? 'Kamera kikapcsolása' : 'Kamera bekapcsolása'}
            onPress={toggleCamera}
            style={[styles.control, !cameraOn && styles.controlOff]}
          >
            <Ionicons
              name={cameraOn ? 'videocam' : 'videocam-off'}
              size={26}
              color={cameraOn ? colors.white : BACKGROUND}
            />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Hívás befejezése"
          onPress={hangUp}
          style={[styles.control, styles.hangup]}
        >
          <Ionicons name="call" size={28} color={colors.white} style={styles.hangupIcon} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  failureText: { color: colors.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  closeButton: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  closeText: { color: colors.white, fontWeight: '900' },
  stage: { flex: 1 },
  identity: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.14)' },
  avatarText: { color: colors.white, fontSize: 52, fontWeight: '900' },
  topInfo: { paddingTop: spacing.xl, alignItems: 'center', gap: 4 },
  name: { color: colors.white, fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  status: { color: colors.white, fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  localVideo: { position: 'absolute', right: spacing.lg, top: spacing.xl, width: 110, height: 160, borderRadius: radius.lg, overflow: 'hidden' },
  controls: { paddingVertical: spacing.xl, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xl },
  control: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.16)' },
  controlOff: { backgroundColor: colors.white },
  hangup: { backgroundColor: '#E5484D' },
  hangupIcon: { transform: [{ rotate: '135deg' }] },
});