import { FamilyHeader } from '@/components/family-header';
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { getFamilyEvents, type FamilyEvent } from '@/services/events';
import type { Family } from '@/services/families';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categoryColors: Record<string, string> = {
  family: '#8B5CF6',
  birthday: '#F55B91',
  medical: '#34D399',
  school: '#38BDF8',
  sport: '#F59E0B',
  administration: '#FB7185',
  trip: '#22C55E',
};
const categoryIcons: Record<string, SymbolViewProps['name']> = {
  family: { ios: 'person.2.fill', android: 'group', web: 'group' },
  birthday: { ios: 'birthday.cake.fill', android: 'cake', web: 'cake' },
  medical: {
    ios: 'cross.case.fill',
    android: 'medical_services',
    web: 'medical_services',
  },
  school: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  sport: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  administration: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  trip: { ios: 'mountain.2.fill', android: 'landscape', web: 'landscape' },
};

function monthBounds(date: Date) {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

function getCalendarDays(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  return Array.from({ length: 35 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

function EventCard({ event, onPress }: { event: FamilyEvent; onPress: () => void }) {
  const start = new Date(event.starts_at);
  const color = categoryColors[event.category] ?? colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
    >
      <View style={[styles.eventAccent, { backgroundColor: color }]} />

      <View style={[styles.eventIcon, { backgroundColor: `${color}22` }]}>
        <SymbolView
          name={categoryIcons[event.category] ?? categoryIcons.family}
          size={22}
          tintColor={color}
          type="hierarchical"
          weight={{ ios: 'semibold', android: medium }}
          style={styles.symbol}
        />
      </View>

      <View style={styles.flex}>
        <Text style={styles.eventTitle}>{event.title}</Text>

        <Text style={styles.eventMeta}>
          {start.toLocaleDateString('hu-HU', {
            month: 'long',
            day: 'numeric',
          })}
          {' · '}
          {start.toLocaleTimeString('hu-HU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        {event.location_name ? (
          <Text style={styles.location}>⌖ {event.location_name}</Text>
        ) : null}
      </View>

      <SymbolView
        name={{
          ios: 'chevron.right',
          android: 'chevron_right',
          web: 'chevron_right',
        }}
        size={20}
        tintColor={colors.textMuted}
        weight={{ ios: 'semibold', android: medium }}
        style={styles.symbol}
      />
    </Pressable>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bounds = useMemo(() => monthBounds(cursor), [cursor]);
  const calendarDays = useMemo(() => getCalendarDays(cursor), [cursor]);
  const today = new Date();

  useFocusEffect(
    useCallback(() => {
      if (!activeFamily) return;
      let active = true;
      setLoading(true);
      void getFamilyEvents(activeFamily.id, bounds.from, bounds.to)
        .then((result) => {
          if (active) {
            setEvents(result);
            setError(null);
          }
        })
        .catch((caught: unknown) => {
          if (active)
            setError(
              caught instanceof Error
                ? caught.message
                : 'Az események betöltése sikertelen.',
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [activeFamily, bounds.from, bounds.to]),
  );

  function moveMonth(offset: number) {
    setCursor(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }
  const initial =
    profile?.display_name?.trim().charAt(0).toLocaleUpperCase('hu-HU') || '?';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FamilyHeader
          userInitial={initial}
          unreadNotificationCount={unreadCount}
          onNotificationsPress={() => router.push('/notifications')}
          onProfilePress={() => router.push('/profile')}
        />
        <View style={styles.pageHeader}>
          <Text style={styles.title}>Naptár</Text>
          <Pressable style={styles.moreButton}>
            <Text style={styles.moreText}>•••</Text>
          </Pressable>
        </View>
        <View style={styles.familySwitcherHidden}>
          <FamilySwitcher onActiveFamilyChange={setActiveFamily} />
        </View>
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>
            {cursor.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
          </Text>
          <View style={styles.monthControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Előző hónap"
              onPress={() => moveMonth(-1)}
              style={({ pressed }) => [
                styles.monthControl,
                pressed && styles.monthControlPressed,
              ]}
            >
              <Text style={styles.monthArrow}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Következő hónap"
              onPress={() => moveMonth(1)}
              style={({ pressed }) => [
                styles.monthControl,
                pressed && styles.monthControlPressed,
              ]}
            >
              <Text style={styles.monthArrow}>›</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.calendarCard}>
          <View style={styles.weekHeader}>
            {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day) => (
              <Text key={day} style={styles.weekDay}>{day}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const isToday =
                day === today.getDate() &&
                cursor.getMonth() === today.getMonth() &&
                cursor.getFullYear() === today.getFullYear();
              const hasEvent = day !== null && events.some((event) => {
                const eventDate = new Date(event.starts_at);
                return (
                  eventDate.getDate() === day &&
                  eventDate.getMonth() === cursor.getMonth() &&
                  eventDate.getFullYear() === cursor.getFullYear()
                );
              });
              return (
                <View key={`${day ?? 'empty'}-${index}`} style={styles.dayCell}>
                  {day !== null ? (
                    <View style={[styles.dayCircle, isToday && styles.dayCircleActive]}>
                      <Text style={[styles.dayText, isToday && styles.dayTextActive]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                  {hasEvent ? <View style={styles.eventDot} /> : null}
                </View>
              );
            })}
          </View>
        </View>
        <Text style={styles.sectionTitle}>Mai események</Text>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {loading ? (
          <ActivityIndicator
            color={colors.primaryLight}
            size="large"
            style={styles.loader}
          />
        ) : events.length ? (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() =>
                router.push({
                  pathname: './event-details',
                  params: { eventId: event.id },
                })
              }
            />
          ))
        ) : (
          <View style={styles.empty}>
            <SymbolView
              name={{
                ios: 'calendar.badge.exclamationmark',
                android: 'event_busy',
                web: 'event_busy',
              }}
              size={38}
              tintColor={colors.textMuted}
              type="hierarchical"
              weight={{ ios: 'semibold', android: medium }}
              style={styles.emptySymbol}
            />
            <Text style={styles.emptyTitle}>Nincs esemény ebben a hónapban</Text>
            <Text style={styles.emptyText}>
              Hozd létre az első közös családi programot.
            </Text>
          </View>
        )}
      </ScrollView>
      {activeFamily ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: './create-event',
              params: { familyId: activeFamily.id, familyName: activeFamily.name },
            })
          }
          style={({ pressed }) => [styles.floatingAdd, pressed && styles.pressed]}
        >
          <Text style={styles.floatingPlus}>+</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FBFF' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md },
  flex: { flex: 1 },
  familySwitcherHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  moreButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: '#EEF4FC',
  },
  moreText: { color: colors.primary, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  title: {
    color: colors.textPrimary,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  monthHeader: {
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthControl: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: '#EEF4FC',
    borderWidth: 1,
    borderColor: '#E1EAF8',
  },
  monthControlPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  monthTitle: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  monthArrow: {
    marginTop: -3,
    color: colors.primary,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: spacing.sm,
  },
  weekDay: {
    width: 35,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  dayCircleActive: {
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  dayText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  dayTextActive: { color: colors.white },
  eventDot: {
    position: 'absolute',
    bottom: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  symbol: { width: 28, height: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  count: { color: colors.textMuted, fontSize: 11 },
  eventCard: {
    minHeight: 92,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E7EEF8',
    backgroundColor: colors.white,
    ...shadows.card,
  },
  eventAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  eventIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  eventTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  eventMeta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  location: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 10 },
  loader: { paddingVertical: 70 },
  empty: { paddingVertical: 70, alignItems: 'center', gap: spacing.sm },
  emptySymbol: { width: 44, height: 44 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  errorCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FFF1F3' },
  errorText: { color: colors.danger, fontSize: 12 },
  floatingAdd: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  floatingPlus: { color: colors.white, fontSize: 36, fontWeight: '300', lineHeight: 40 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
