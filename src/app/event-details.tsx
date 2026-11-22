import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { deleteFamilyEvent, getFamilyEvent, type FamilyEvent } from '@/services/events';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categoryData: Record<
  string,
  {
    label: string;
    color: string;
    icon: SymbolViewProps['name'];
  }
> = {
  family: {
    label: 'Családi',
    color: '#8B5CF6',
    icon: { ios: 'person.2.fill', android: 'group', web: 'group' },
  },
  birthday: {
    label: 'Születésnap',
    color: '#F55B91',
    icon: { ios: 'birthday.cake.fill', android: 'cake', web: 'cake' },
  },
  medical: {
    label: 'Orvosi',
    color: '#34D399',
    icon: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  },
  school: {
    label: 'Iskola',
    color: '#38BDF8',
    icon: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  },
  sport: {
    label: 'Sport',
    color: '#F59E0B',
    icon: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  },
  administration: {
    label: 'Ügyintézés',
    color: '#FB7185',
    icon: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  },
  trip: {
    label: 'Kirándulás',
    color: '#22C55E',
    icon: { ios: 'mountain.2.fill', android: 'landscape', web: 'landscape' },
  },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('hu-HU', { day: '2-digit' }).format(new Date(value));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('hu-HU', { month: 'short' })
    .format(new Date(value))
    .replace('.', '')
    .toUpperCase();
}

function getEventState(value: string, now: Date) {
  const date = new Date(value);
  if (date < now) return 'Lezajlott';
  if (date.toDateString() === now.toDateString()) return 'Ma';
  return 'Közelgő';
}

export default function EventDetailsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = firstParam(params.eventId);
  const [now] = useState(() => new Date());

  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(eventId ? null : 'Hiányzó eseményazonosító.');

  useEffect(() => {
    if (!eventId) return;

    let active = true;

    void getFamilyEvent(eventId)
      .then((result) => {
        if (!active) return;
        setEvent(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Az esemény betöltése sikertelen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  function confirmDelete() {
    if (!event) return;

    Alert.alert('Esemény törlése', `Biztosan törlöd ezt az eseményt: ${event.title}?`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => void removeEvent() },
    ]);
  }

  async function removeEvent() {
    if (!event) return;

    setDeleting(true);

    try {
      await deleteFamilyEvent(event.id);
      router.replace('/calendar');
    } catch (caught) {
      Alert.alert(
        'Nem sikerült törölni',
        caught instanceof Error ? caught.message : 'Próbáld újra később.',
      );
    } finally {
      setDeleting(false);
    }
  }

  async function openDirections() {
    const location = event?.location_name?.trim();
    if (!location) return;
    try {
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
      );
    } catch {
      Alert.alert('Nem sikerült megnyitni', 'Ezen a készüléken most nem érhető el a térképalkalmazás.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const category = categoryData[event?.category ?? 'family'] ?? categoryData.family;
  const state = event ? getEventState(event.starts_at, now) : null;
  const stateColor = state === 'Lezajlott' ? palette.textMuted : state === 'Ma' ? palette.danger : palette.primary;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenCloseButton />

        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Esemény részletei</Text>

        <Pressable
          accessibilityLabel="Esemény törlése"
          accessibilityRole="button"
          disabled={!event || deleting}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
            (!event || deleting) && styles.disabled,
          ]}
        >
          {deleting ? (
            <ActivityIndicator color={palette.danger} size="small" />
          ) : (
            <SymbolView
              name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
              size={22}
              tintColor={palette.danger}
              type="hierarchical"
              weight={{ ios: 'semibold', android: medium }}
              style={styles.symbol}
            />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: isDark ? '#3B1622' : '#FFF1F3',
                borderColor: isDark ? '#7F2439' : '#FFD2D8',
              },
            ]}
          >
            <Ionicons name="alert-circle" size={22} color={palette.danger} />
            <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
          </View>
        ) : null}

        {event ? (
          <>
            <View
              style={[
                styles.heroCard,
                { borderTopColor: category.color, backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[`${category.color}33`, `${category.color}00`]}
                style={styles.heroGlow}
              />
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}26` }]}>
                <SymbolView
                  name={category.icon}
                  size={36}
                  tintColor={category.color}
                  type="hierarchical"
                  weight={{ ios: 'semibold', android: medium }}
                  style={styles.largeSymbol}
                />
              </View>

              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: `${category.color}22` }]}>
                  <Text style={[styles.badgeText, { color: category.color }]}>{category.label}</Text>
                </View>
                {state ? (
                  <View style={[styles.badge, { backgroundColor: `${stateColor}22` }]}>
                    <Text style={[styles.badgeText, { color: stateColor }]}>{state}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.title, { color: palette.textPrimary }]}>{event.title}</Text>

              {event.description ? (
                <Text style={[styles.description, { color: palette.textSecondary }]}>{event.description}</Text>
              ) : null}
            </View>

            <View style={[styles.detailsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Az esemény adatai</Text>

              <View style={styles.detailRow}>
                <View style={[styles.dateChip, { backgroundColor: `${category.color}22` }]}>
                  <Text style={[styles.dateDay, { color: category.color }]}>{formatDay(event.starts_at)}</Text>
                  <Text style={[styles.dateMonth, { color: category.color }]}>{formatMonth(event.starts_at)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Dátum</Text>
                  <Text style={[styles.detailValue, { color: palette.textPrimary }]}>
                    {formatDate(event.starts_at)}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: `${colors.warning}26` }]}>
                  <Ionicons name="time" size={22} color={colors.warning} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Időpont</Text>
                  <Text style={[styles.detailValue, { color: palette.textPrimary }]}>
                    {formatTime(event.starts_at)}
                    {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''}
                  </Text>
                </View>
              </View>

              {event.location_name ? (
                <>
                  <View style={[styles.divider, { backgroundColor: palette.border }]} />

                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, { backgroundColor: `${colors.success}26` }]}>
                      <Ionicons name="location" size={22} color={colors.success} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Helyszín</Text>
                      <Text style={[styles.detailValue, { color: palette.textPrimary }]}>
                        {event.location_name}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${event.location_name} megnyitása a térképen`}
                    onPress={() => void openDirections()}
                    style={({ pressed }) => [
                      styles.directionsButton,
                      { backgroundColor: palette.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="navigate" size={17} color="#FFFFFF" />
                    <Text style={styles.directionsText}>Útvonaltervezés</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 19, fontWeight: '900' },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.lg },
  heroCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderTopWidth: 5,
    ...shadows.card,
  },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 170 },
  categoryIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.round },
  badgeText: { fontSize: 12, fontWeight: '900' },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  detailsCard: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  sectionTitle: { marginBottom: spacing.xs, fontSize: 17, fontWeight: '900' },
  detailRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  dateChip: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dateDay: { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  dateMonth: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  divider: { height: StyleSheet.hairlineWidth },
  directionsButton: {
    minHeight: 46,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  directionsText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  flex: { flex: 1 },
  symbol: { width: 26, height: 26 },
  largeSymbol: { width: 42, height: 42 },
  errorCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
});