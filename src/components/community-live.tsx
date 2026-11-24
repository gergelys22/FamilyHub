import {
    Avatar,
    EmptyBlock,
    FormInput,
    PrimaryButton,
    Sheet,
    sharedStyles,
    timeAgo,
    useFamilyId,
    usePalette,
} from '@/components/community-shared';
import { radius, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { getLiveStreams, startLiveStream, type LiveStream } from '@/services/live';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

// Egy elakadt (nem lezárt) közvetítést ennyi idő után már nem mutatunk élőnek.
const STALE_LIVE_MS = 6 * 60 * 60 * 1000;

function isLiveNow(stream: LiveStream, nowMs: number) {
  return stream.status === 'live' && nowMs - new Date(stream.started_at).getTime() < STALE_LIVE_MS;
}

function openLive(router: ReturnType<typeof useRouter>, streamId: string) {
  router.push({ pathname: '/live', params: { streamId } } as unknown as Href);
}

/* ------------------------------------------------------------------ */
/* Közvetítés indítása                                                 */
/* ------------------------------------------------------------------ */

export function StartLiveModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { palette } = usePalette();
  const router = useRouter();
  const { profile } = useAuth();
  const { familyId } = useFamilyId();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!familyId || !profile?.id) return;
    if (!title.trim()) {
      Alert.alert('Hiányzó cím', 'Adj címet a közvetítésnek, hogy a családtagok tudják, miről van szó.');
      return;
    }
    setBusy(true);
    try {
      const stream = await startLiveStream(familyId, profile.id, title);
      setTitle('');
      onClose();
      openLive(router, stream.id);
    } catch (caught) {
      Alert.alert('A közvetítés nem indítható', caught instanceof Error ? caught.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Élő közvetítés indítása" icon="radio" maxHeight="70%">
      <Text style={[liveStyles.help, { color: palette.textSecondary }]}>
        A közvetítés a családi körben mindenkinek megjelenik, aki közben megnyitja az Élő fület. A kamera és a
        mikrofon a következő képernyőn kapcsol be.
      </Text>
      <FormInput value={title} onChangeText={setTitle} placeholder="Például: Vasárnapi ebéd" maxLength={120} />
      <PrimaryButton label="Indítás" icon="radio" tone="#E5384F" busy={busy} onPress={() => void start()} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Élő fül                                                             */
/* ------------------------------------------------------------------ */

export function LiveTab({ refreshToken, onStart }: { refreshToken: number; onStart: () => void }) {
  const { palette, isDark } = usePalette();
  const router = useRouter();
  const { profile } = useAuth();
  const { familyId, loading: familyLoading } = useFamilyId();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    void getLiveStreams(familyId)
      .then((items) => {
        if (!active) return;
        setStreams(items);
        setNowMs(Date.now());
        setError(null);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'A közvetítések betöltése sikertelen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [familyId, refreshToken, version]);

  useEffect(() => {
    if (!familyId) return;
    const channel = supabase
      .channel(`live-streams:${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => setVersion((current) => current + 1), 300);
      })
      .subscribe();
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      void supabase.removeChannel(channel);
    };
  }, [familyId]);

  const live = streams.filter((stream) => isLiveNow(stream, nowMs));
  const past = streams.filter((stream) => !isLiveNow(stream, nowMs)).slice(0, 8);

  return (
    <View style={liveStyles.list}>
      <LinearGradient
        colors={isDark ? ['#8A1F3A', '#4A1226'] : ['#F0455F', '#B3213A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[liveStyles.hero, shadows.floating]}
      >
        <View style={liveStyles.heroTop}>
          <View style={liveStyles.heroIcon}>
            <Ionicons name="radio" size={26} color="#FFFFFF" />
          </View>
          <View style={liveStyles.flex}>
            <Text style={liveStyles.heroTitle}>Élő közvetítés</Text>
            <Text style={liveStyles.heroText}>
              Oszd meg a pillanatot valós időben, a család pedig élőben nézheti és chatelhet.
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onStart}
          style={({ pressed }) => [liveStyles.startButton, pressed && sharedStyles.pressed]}
        >
          <Ionicons name="videocam" size={20} color="#B3213A" />
          <Text style={liveStyles.startText}>Közvetítés indítása</Text>
        </Pressable>
      </LinearGradient>

      {(loading || familyLoading) && streams.length === 0 ? (
        <ActivityIndicator color={palette.primary} size="large" style={liveStyles.loader} />
      ) : null}

      {error ? <EmptyBlock icon="alert-circle-outline" title="Hiba történt" text={error} /> : null}

      {!loading && !error ? (
        <>
          <Text style={[liveStyles.section, { color: palette.textMuted }]}>Most élőben</Text>
          {live.length === 0 ? (
            <EmptyBlock
              icon="videocam-off-outline"
              title="Most senki nem közvetít"
              text="Amint valaki elindít egy közvetítést, itt azonnal megjelenik."
            />
          ) : (
            live.map((stream) => (
              <Pressable
                key={stream.id}
                accessibilityRole="button"
                accessibilityLabel={`${stream.title} közvetítés megnyitása`}
                onPress={() => openLive(router, stream.id)}
                style={({ pressed }) => [
                  liveStyles.card,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                  shadows.card,
                  pressed && sharedStyles.pressed,
                ]}
              >
                <View>
                  <Avatar name={stream.host_name} size={52} />
                  <View style={liveStyles.liveBadge}>
                    <Text style={liveStyles.liveBadgeText}>ÉLŐ</Text>
                  </View>
                </View>
                <View style={liveStyles.flex}>
                  <Text style={[liveStyles.cardTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                    {stream.title}
                  </Text>
                  <Text style={[liveStyles.cardMeta, { color: palette.textMuted }]} numberOfLines={1}>
                    {stream.host_profile_id === profile?.id ? 'Te közvetítesz' : stream.host_name} ·{' '}
                    {timeAgo(stream.started_at)} indult
                  </Text>
                </View>
                <View style={[liveStyles.joinButton, { backgroundColor: palette.primary }]}>
                  <Text style={liveStyles.joinText}>
                    {stream.host_profile_id === profile?.id ? 'Vissza' : 'Nézem'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}

          {past.length > 0 ? (
            <>
              <Text style={[liveStyles.section, { color: palette.textMuted }]}>Korábbi közvetítések</Text>
              {past.map((stream) => (
                <View
                  key={stream.id}
                  style={[liveStyles.pastRow, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <View style={[liveStyles.pastIcon, { backgroundColor: palette.surfaceElevated }]}>
                    <Ionicons name="videocam-outline" size={18} color={palette.textSecondary} />
                  </View>
                  <View style={liveStyles.flex}>
                    <Text style={[liveStyles.pastTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                      {stream.title}
                    </Text>
                    <Text style={[liveStyles.cardMeta, { color: palette.textMuted }]} numberOfLines={1}>
                      {stream.host_name} · {timeAgo(stream.started_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const liveStyles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  loader: { paddingVertical: 48 },
  help: { fontSize: 13, lineHeight: 19 },
  hero: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.xl, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  heroText: { marginTop: 3, color: 'rgba(255,255,255,0.88)', fontSize: 12, lineHeight: 17 },
  startButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  startText: { color: '#B3213A', fontSize: 15, fontWeight: '900' },
  section: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    minHeight: 80,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  liveBadge: {
    position: 'absolute',
    left: 6,
    bottom: -6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.round,
    backgroundColor: '#E5384F',
  },
  liveBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  cardMeta: { marginTop: 3, fontSize: 12 },
  joinButton: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.round },
  joinText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  pastRow: {
    minHeight: 60,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  pastIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  pastTitle: { fontSize: 14, fontWeight: '800' },
});
