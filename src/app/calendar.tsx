import { FamilyHeader } from '@/components/family-header';
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyEvents, type FamilyEvent } from '@/services/events';
import type { Family } from '@/services/families';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;

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

const WEEK_DAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

function monthBounds(date: Date) {
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

// A hónap napjai hétfői kezdéssel; 5 vagy 6 hétnyi cellát ad (a 6 hetes hónapok sem csonkulnak).
function getCalendarDays(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: cells }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function EventCard({
  event,
  onPress,
  palette,
}: {
  event: FamilyEvent;
  onPress: () => void;
  palette: Palette;
}) {
  const start = new Date(event.starts_at);
  const color = categoryColors[event.category] ?? palette.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.eventCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
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
        <Text numberOfLines={2} style={[styles.eventTitle, { color: palette.textPrimary }]}>
          {event.title}
        </Text>
        <Text style={[styles.eventMeta, { color: palette.textSecondary }]}>
          {start.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {event.location_name ? (
          <Text numberOfLines={1} style={[styles.location, { color: palette.textMuted }]}>
            ⌖ {event.location_name}
          </Text>
        ) : null}
      </View>

      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={palette.textMuted}
        weight={{ ios: 'semibold', android: medium }}
        style={styles.chevron}
      />
    </Pressable>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const unreadMessageCount = useUnreadMessages(activeFamily?.id, profile?.id);
  const [today] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const bounds = useMemo(() => monthBounds(cursor), [cursor]);
  const calendarDays = useMemo(() => getCalendarDays(cursor), [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, FamilyEvent[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.starts_at));
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const selectedKey = dayKey(selected);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const isSelectedToday = selectedKey === dayKey(today);
  const selectedLabel = selected.toLocaleDateString('hu-HU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

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
              caught instanceof Error ? caught.message : 'Az események betöltése sikertelen.',
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [activeFamily, bounds.from, bounds.to, refreshToken]),
  );

  function moveMonth(offset: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    setCursor(next);
    const sameMonthAsToday =
      next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
    setSelected(sameMonthAsToday ? today : next);
  }

  function goToToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(today);
  }

  const initial = profile?.display_name?.trim().charAt(0).toLocaleUpperCase('hu-HU') || '?';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FamilyHeader
          userInitial={initial}
          unreadNotificationCount={unreadCount}
          unreadMessageCount={unreadMessageCount}
          onNotificationsPress={() => router.push('/notifications')}
          onMessagesPress={() => router.push('/messages')}
          onProfilePress={() => router.push('/profile')}
        />

        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Naptár</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              {events.length > 0 ? `${events.length} esemény ebben a hónapban` : 'Közös családi programok'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Naptár műveletei"
            accessibilityState={{ expanded: menuVisible }}
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [
              styles.roundButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
              size={22}
              tintColor={palette.primary}
              weight={{ ios: 'semibold', android: medium }}
              style={styles.symbol}
            />
          </Pressable>
        </View>

        <View style={styles.familySwitcherHidden}>
          <FamilySwitcher onActiveFamilyChange={setActiveFamily} />
        </View>

        <View
          style={[styles.calendarCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ugrás a mai napra"
              onPress={goToToday}
              style={styles.monthTitleButton}
            >
              <Text style={[styles.monthTitle, { color: palette.textPrimary }]}>
                {cursor.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
              </Text>
            </Pressable>
            <View style={styles.monthControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Előző hónap"
                onPress={() => moveMonth(-1)}
                style={({ pressed }) => [
                  styles.monthControl,
                  { backgroundColor: palette.surfaceMuted },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.monthArrow, { color: palette.primary }]}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Következő hónap"
                onPress={() => moveMonth(1)}
                style={({ pressed }) => [
                  styles.monthControl,
                  { backgroundColor: palette.surfaceMuted },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.monthArrow, { color: palette.primary }]}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((day) => (
              <Text key={day} style={[styles.weekDay, { color: palette.textMuted }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
              const key = dayKey(date);
              const isToday = key === dayKey(today);
              const isSelected = key === selectedKey;
              const dayEvents = eventsByDay.get(key) ?? [];
              const dotColors = [
                ...new Set(dayEvents.map((event) => categoryColors[event.category] ?? palette.primary)),
              ].slice(0, 3);

              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${day}. nap${dayEvents.length ? `, ${dayEvents.length} esemény` : ''}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(date)}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && !isSelected && { borderWidth: 2, borderColor: palette.primary },
                      isSelected && [{ backgroundColor: palette.primary }, shadows.floating],
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isSelected ? '#FFFFFF' : palette.textPrimary },
                        isToday && !isSelected && { color: palette.primary },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  <View style={styles.dotRow}>
                    {dotColors.map((dotColor) => (
                      <View key={dotColor} style={[styles.eventDot, { backgroundColor: dotColor }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
            {isSelectedToday ? 'Mai események' : selectedLabel}
          </Text>
          {selectedEvents.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: palette.primarySoft }]}>
              <Text style={[styles.countText, { color: palette.primary }]}>{selectedEvents.length}</Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: isDark ? '#3A1820' : '#FFF1F3' }]}>
            <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={palette.primary} size="large" style={styles.loader} />
        ) : selectedEvents.length ? (
          selectedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              palette={palette}
              onPress={() =>
                router.push({
                  pathname: './event-details',
                  params: { eventId: event.id },
                })
              }
            />
          ))
        ) : (
          <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <SymbolView
              name={{
                ios: 'calendar.badge.exclamationmark',
                android: 'event_busy',
                web: 'event_busy',
              }}
              size={36}
              tintColor={palette.textMuted}
              type="hierarchical"
              weight={{ ios: 'semibold', android: medium }}
              style={styles.emptySymbol}
            />
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
              Nincs esemény ezen a napon
            </Text>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Az alsó + gombbal hozhatod létre a következő közös programot.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menü bezárása"
            onPress={() => setMenuVisible(false)}
            style={styles.menuBackdrop}
          />
          <View style={[styles.menuCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.menuTitle, { color: palette.textPrimary }]}>Naptár műveletei</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRefreshToken((current) => current + 1);
                setMenuVisible(false);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: palette.surfaceMuted },
              ]}
            >
              <SymbolView
                name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
                size={21}
                tintColor={palette.primary}
                type="hierarchical"
                weight={{ ios: 'semibold', android: medium }}
                style={styles.symbol}
              />
              <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>Események frissítése</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                goToToday();
                setMenuVisible(false);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: palette.surfaceMuted },
              ]}
            >
              <SymbolView
                name={{ ios: 'calendar', android: 'today', web: 'today' }}
                size={21}
                tintColor={palette.primary}
                type="hierarchical"
                weight={{ ios: 'semibold', android: medium }}
                style={styles.symbol}
              />
              <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>Ugrás a mai naphoz</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!activeFamily}
              onPress={() => {
                if (!activeFamily) return;
                setMenuVisible(false);
                router.push({
                  pathname: './create-event',
                  params: { familyId: activeFamily.id, familyName: activeFamily.name },
                });
              }}
              style={({ pressed }) => [
                styles.menuItem,
                !activeFamily && styles.menuItemDisabled,
                pressed && { backgroundColor: palette.surfaceMuted },
              ]}
            >
              <SymbolView
                name={{ ios: 'calendar.badge.plus', android: 'event_upcoming', web: 'event_upcoming' }}
                size={21}
                tintColor={activeFamily ? palette.primary : palette.textMuted}
                type="hierarchical"
                weight={{ ios: 'semibold', android: medium }}
                style={styles.symbol}
              />
              <Text
                style={[
                  styles.menuItemText,
                  { color: activeFamily ? palette.textPrimary : palette.textMuted },
                ]}
              >
                Új esemény létrehozása
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuVisible(false)}
              style={({ pressed }) => [
                styles.menuCancel,
                { borderTopColor: palette.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.menuCancelText, { color: palette.textMuted }]}>Mégse</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {activeFamily ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Új esemény létrehozása"
          onPress={() =>
            router.push({
              pathname: './create-event',
              params: { familyId: activeFamily.id, familyName: activeFamily.name },
            })
          }
          style={({ pressed }) => [
            styles.floatingAdd,
            { backgroundColor: palette.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.floatingPlus}>+</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 112, gap: spacing.md },
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
  title: { fontSize: 31, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { marginTop: 2, fontSize: 13, fontWeight: '700' },
  roundButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.round,
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  monthHeader: {
    minHeight: 48,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitleButton: { flex: 1 },
  monthTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    textTransform: 'capitalize',
  },
  monthControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthControl: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  monthArrow: { marginTop: -3, fontSize: 28, lineHeight: 32, fontWeight: '700' },
  weekHeader: { flexDirection: 'row', paddingBottom: spacing.xs },
  weekDay: {
    width: '14.285%',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.285%',
    height: 52,
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
  dayText: { fontSize: 14, fontWeight: '800' },
  dotRow: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 3,
  },
  eventDot: { width: 5, height: 5, borderRadius: 3 },
  sectionHeader: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  countText: { fontSize: 12, fontWeight: '900' },
  symbol: { width: 26, height: 26 },
  chevron: { width: 20, height: 20 },
  eventCard: {
    minHeight: 88,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  eventAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  eventIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  eventTitle: { fontSize: 15, fontWeight: '900' },
  eventMeta: { marginTop: 3, fontSize: 12, fontWeight: '700' },
  location: { marginTop: 3, fontSize: 11 },
  loader: { paddingVertical: 60 },
  empty: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  emptySymbol: { width: 42, height: 42 },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  errorCard: { padding: spacing.md, borderRadius: radius.md },
  errorText: { fontSize: 12 },
  menuOverlay: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 58,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(7, 17, 35, 0.35)',
  },
  menuBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menuCard: {
    width: 270,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
    ...shadows.card,
  },
  menuTitle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '900',
  },
  menuItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  menuItemDisabled: { opacity: 0.55 },
  menuItemText: { fontSize: 14, fontWeight: '700' },
  menuCancel: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuCancelText: { fontSize: 13, fontWeight: '800' },
  floatingAdd: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 92,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    ...shadows.floating,
  },
  floatingPlus: { color: '#FFFFFF', fontSize: 36, fontWeight: '300', lineHeight: 40 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});