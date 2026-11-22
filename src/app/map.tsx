import { EventMap } from '@/components/event-map';
import { FamilyHeader } from '@/components/family-header';
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyEvents, type FamilyEvent } from '@/services/events';
import type { Family } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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

const categoryLabels: Record<FamilyEvent['category'], string> = {
  family: 'Családi',
  birthday: 'Születésnap',
  medical: 'Orvosi',
  school: 'Iskolai',
  sport: 'Sport',
  administration: 'Ügyintézés',
  trip: 'Kirándulás',
};

const TABS: [string, string][] = [
  ['family', 'Családtagok'],
  ['places', 'Helyek'],
  ['events', 'Események'],
];

function dateRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 90);
  return { from, to };
}

function formatWhen(event: FamilyEvent) {
  const date = new Date(event.starts_at);
  return `${date.toLocaleDateString('hu-HU', {
    month: 'short',
    day: 'numeric',
  })} · ${date.toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function PlaceChip({
  event,
  selected,
  onPress,
  palette,
}: {
  event: FamilyEvent;
  selected: boolean;
  onPress: () => void;
  palette: Palette;
}) {
  const color = categoryColors[event.category] ?? palette.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${event.title}, ${event.location_name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.placeChip,
        {
          backgroundColor: selected ? `${color}22` : palette.surface,
          borderColor: selected ? color : palette.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.placeDot, { backgroundColor: color }]} />
      <View style={styles.placeChipText}>
        <Text numberOfLines={1} style={[styles.placeChipTitle, { color: palette.textPrimary }]}>
          {event.title}
        </Text>
        <Text numberOfLines={1} style={[styles.placeChipMeta, { color: palette.textMuted }]}>
          {formatWhen(event)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const unreadMessageCount = useUnreadMessages(activeFamily?.id, profile?.id);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'family' | 'places' | 'events'>('family');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FamilyEvent['category']>('all');
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => dateRange(), []);
  const activeFamilyId = activeFamily?.id;
  const locationEvents = events.filter((event) => Boolean(event.location_name?.trim()));
  const filteredLocationEvents = locationEvents.filter(
    (event) => categoryFilter === 'all' || event.category === categoryFilter,
  );
  const selectedEvent =
    filteredLocationEvents.find((event) => event.id === selectedEventId) ??
    filteredLocationEvents[0] ??
    null;
  const displayName = profile?.display_name?.trim() || 'Felhasználó';
  const userInitial = displayName.charAt(0).toLocaleUpperCase('hu-HU') || '?';
  const selectedColor = selectedEvent
    ? (categoryColors[selectedEvent.category] ?? palette.primary)
    : palette.primary;

  useFocusEffect(
    useCallback(() => {
      if (!activeFamilyId) {
        setEvents([]);
        setSelectedEventId(null);
        return;
      }

      let active = true;
      setLoading(true);

      void getFamilyEvents(activeFamilyId, range.from, range.to)
        .then((result) => {
          if (!active) return;
          const withLocation = result.filter((event) => Boolean(event.location_name?.trim()));
          setEvents(result);
          setSelectedEventId((current) =>
            withLocation.some((event) => event.id === current)
              ? current
              : (withLocation[0]?.id ?? null),
          );
          setError(null);
        })
        .catch((caught: unknown) => {
          if (!active) return;
          setError(caught instanceof Error ? caught.message : 'A helyszínek betöltése sikertelen.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [activeFamilyId, range.from, range.to]),
  );

  async function openDirections(event: FamilyEvent) {
    const location = event.location_name?.trim();
    if (!location) return;

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

    try {
      await Linking.openURL(mapUrl);
    } catch {
      Alert.alert(
        'Nem sikerült megnyitni',
        'Ezen a készüléken most nem érhető el a térképalkalmazás.',
      );
    }
  }

  function openSelectedEvent() {
    if (!selectedEvent) return;
    router.push({ pathname: '/event-details', params: { eventId: selectedEvent.id } });
  }

  function selectCategory(category: typeof categoryFilter) {
    setCategoryFilter(category);
    setFilterVisible(false);
    setSelectedEventId(null);
  }

  function createEvent() {
    if (!activeFamily) return;
    router.push({
      pathname: '/create-event',
      params: { familyId: activeFamily.id, familyName: activeFamily.name },
    });
  }

  const filterOptions: [string, string][] = [
    ['all', 'Minden kategória'],
    ...Object.keys(categoryColors).map(
      (category): [string, string] => [category, categoryLabels[category as FamilyEvent['category']]],
    ),
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <LinearGradient
        pointerEvents="none"
        colors={isDark ? ['#12335A', '#071A3300'] : ['#DCEBFF', '#F8FBFF00']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGlow}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FamilyHeader
          userInitial={userInitial}
          unreadNotificationCount={unreadCount}
          unreadMessageCount={unreadMessageCount}
          onNotificationsPress={() => router.push('/notifications')}
          onMessagesPress={() => router.push('/messages')}
          onProfilePress={() => router.push('/profile')}
        />

        <View style={styles.topBar}>
          <View>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Térkép</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              {filteredLocationEvents.length > 0
                ? `${filteredLocationEvents.length} közös helyszín`
                : 'Közös családi helyszínek'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="További lehetőségek"
            onPress={() => router.push('/more')}
            style={({ pressed }) => [
              styles.topAction,
              { backgroundColor: palette.surface, borderColor: palette.border },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: 'square.grid.2x2.fill', android: 'apps', web: 'apps' }}
              size={21}
              tintColor={palette.primary}
              type="hierarchical"
              weight={{ ios: 'semibold', android: medium }}
              style={styles.topActionSymbol}
            />
          </Pressable>
        </View>

        <View style={[styles.mapTabs, { backgroundColor: palette.surfaceElevated }]}>
          {TABS.map(([value, label]) => {
            const isActive = activeTab === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveTab(value as typeof activeTab)}
                style={[
                  styles.mapTab,
                  isActive && [{ backgroundColor: palette.primary }, shadows.floating],
                ]}
              >
                <Text
                  style={[
                    styles.mapTabText,
                    { color: isActive ? '#FFFFFF' : palette.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.familySwitcherHidden}>
          <FamilySwitcher onActiveFamilyChange={setActiveFamily} />
        </View>

        {activeFamily ? (
          <>
            {loading ? (
              <View
                style={[
                  styles.stateCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <ActivityIndicator color={palette.primary} />
                <Text style={[styles.loadingText, { color: palette.textMuted }]}>Helyszínek betöltése…</Text>
              </View>
            ) : error ? (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: isDark ? '#3B1622' : '#FFF1F3',
                    borderColor: isDark ? '#7F2439' : '#F8C8D0',
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={20} color={isDark ? '#FDA4AF' : '#A52A3A'} />
                <Text style={[styles.errorText, { color: isDark ? '#FDA4AF' : '#A52A3A' }]}>{error}</Text>
              </View>
            ) : filteredLocationEvents.length ? (
              <>
                <View
                  style={[
                    styles.mapCard,
                    { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
                  ]}
                >
                  <EventMap events={filteredLocationEvents} selectedEventId={selectedEvent?.id ?? null} />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Események szűrése"
                    onPress={() => setFilterVisible(true)}
                    style={({ pressed }) => [
                      styles.mapButton,
                      styles.mapFilterButton,
                      { backgroundColor: palette.surface },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' }}
                      size={21}
                      tintColor={palette.primary}
                      type="hierarchical"
                      weight={{ ios: 'semibold', android: medium }}
                      style={styles.captionSymbol}
                    />
                    {categoryFilter !== 'all' ? (
                      <View style={[styles.filterDot, { backgroundColor: palette.danger, borderColor: palette.surface }]} />
                    ) : null}
                  </Pressable>

                  <View style={styles.mapControls}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Kijelölt hely megjelenítése"
                      onPress={() => setSelectedEventId(selectedEvent?.id ?? null)}
                      style={({ pressed }) => [
                        styles.mapButton,
                        { backgroundColor: palette.surface },
                        pressed && styles.pressed,
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
                        size={21}
                        tintColor={palette.primary}
                        type="hierarchical"
                        weight={{ ios: 'semibold', android: medium }}
                        style={styles.captionSymbol}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Első hely kiválasztása"
                      onPress={() => setSelectedEventId(filteredLocationEvents[0]?.id ?? null)}
                      style={({ pressed }) => [
                        styles.mapButton,
                        { backgroundColor: palette.surface },
                        pressed && styles.pressed,
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'location.north.fill', android: 'near_me', web: 'near_me' }}
                        size={21}
                        tintColor={palette.primary}
                        type="hierarchical"
                        weight={{ ios: 'semibold', android: medium }}
                        style={styles.captionSymbol}
                      />
                    </Pressable>
                  </View>
                </View>

                {selectedEvent ? (
                  <View
                    style={[
                      styles.selectedCard,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${selectedEvent.title} esemény részletei`}
                      onPress={openSelectedEvent}
                      style={({ pressed }) => [styles.selectedMain, pressed && styles.pressed]}
                    >
                      <View style={[styles.selectedPlaceIcon, { backgroundColor: `${selectedColor}22` }]}>
                        <SymbolView
                          name={categoryIcons[selectedEvent.category] ?? categoryIcons.family}
                          size={28}
                          tintColor={selectedColor}
                          type="hierarchical"
                          weight={{ ios: 'semibold', android: medium }}
                          style={styles.selectedSymbol}
                        />
                      </View>
                      <View style={styles.selectedPlaceContent}>
                        <View style={[styles.categoryChip, { backgroundColor: `${selectedColor}22` }]}>
                          <Text style={[styles.categoryChipText, { color: selectedColor }]}>
                            {categoryLabels[selectedEvent.category]}
                          </Text>
                        </View>
                        <Text numberOfLines={1} style={[styles.selectedTitle, { color: palette.textPrimary }]}>
                          {selectedEvent.title}
                        </Text>
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={14} color={palette.textMuted} />
                          <Text numberOfLines={1} style={[styles.metaText, { color: palette.textSecondary }]}>
                            {selectedEvent.location_name}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color={palette.textMuted} />
                          <Text style={[styles.metaText, { color: palette.textSecondary }]}>
                            {formatWhen(selectedEvent)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${selectedEvent.location_name} megnyitása a térképen`}
                      onPress={() => void openDirections(selectedEvent)}
                      style={({ pressed }) => [
                        styles.directionsButton,
                        { backgroundColor: palette.primary },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="navigate" size={17} color="#FFFFFF" />
                      <Text style={styles.directionsText}>Útvonaltervezés</Text>
                    </Pressable>
                  </View>
                ) : null}

                {filteredLocationEvents.length > 1 ? (
                  <View style={styles.otherPlaces}>
                    <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>További helyszínek</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.placeList}
                    >
                      {filteredLocationEvents.map((event) => (
                        <PlaceChip
                          key={event.id}
                          event={event}
                          palette={palette}
                          selected={event.id === selectedEvent?.id}
                          onPress={() => setSelectedEventId(event.id)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : (
              <View
                style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}>
                  <SymbolView
                    name={{
                      ios: 'mappin.slash',
                      android: 'location_off',
                      web: 'location_off',
                    }}
                    size={32}
                    tintColor={palette.primary}
                    type="hierarchical"
                    weight={{ ios: 'semibold', android: medium }}
                    style={styles.emptySymbol}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
                  Még nincs helyszín a térképen
                </Text>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                  Adj helyszínt egy közös eseményhez, és itt rögtön elérhető lesz.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={createEvent}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: palette.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'calendar.badge.plus',
                      android: 'event_upcoming',
                      web: 'event_upcoming',
                    }}
                    size={20}
                    tintColor="#FFFFFF"
                    type="hierarchical"
                    weight={{ ios: 'semibold', android: medium }}
                    style={styles.buttonSymbol}
                  />
                  <Text style={styles.primaryButtonText}>Új esemény helyszínnel</Text>
                </Pressable>
              </View>
            )}

            <Modal
              visible={filterVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setFilterVisible(false)}
            >
              <View style={styles.filterOverlay}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Szűrő bezárása"
                  onPress={() => setFilterVisible(false)}
                  style={styles.filterBackdrop}
                />
                <View
                  style={[styles.filterCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <View style={[styles.handle, { backgroundColor: palette.border }]} />
                  <Text style={[styles.filterTitle, { color: palette.textPrimary }]}>Események szűrése</Text>
                  {filterOptions.map(([value, label]) => {
                    const selected = categoryFilter === value;
                    const dotColor = categoryColors[value] ?? palette.primary;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => selectCategory(value as typeof categoryFilter)}
                        style={({ pressed }) => [
                          styles.filterOption,
                          selected && { backgroundColor: palette.primarySoft },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={[styles.filterDotLarge, { backgroundColor: dotColor }]} />
                        <Text
                          style={[
                            styles.filterOptionText,
                            { color: selected ? palette.primary : palette.textPrimary },
                          ]}
                        >
                          {label}
                        </Text>
                        {selected ? <Ionicons name="checkmark" size={20} color={palette.primary} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Modal>

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? '#0B302F' : '#ECF8F5',
                  borderColor: isDark ? '#17544D' : '#CBEADF',
                },
              ]}
            >
              <View style={[styles.infoIcon, { backgroundColor: isDark ? '#0C4A45' : '#D8F7EF' }]}>
                <SymbolView
                  name={{
                    ios: 'lock.shield.fill',
                    android: 'shield_lock',
                    web: 'shield_lock',
                  }}
                  size={21}
                  tintColor={isDark ? '#6EE7B7' : '#16856F'}
                  type="hierarchical"
                  weight={{ ios: 'semibold', android: medium }}
                  style={styles.infoSymbol}
                />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.infoTitle, { color: isDark ? '#D1FAE5' : '#18584C' }]}>
                  Csak közös eseményhelyszínek
                </Text>
                <Text style={[styles.infoText, { color: isDark ? '#93C5B5' : palette.textSecondary }]}>
                  Ez a képernyő nem követi a családtagok élő helyzetét.
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backgroundGlow: {
    position: 'absolute',
    top: 88,
    right: 0,
    width: '70%',
    height: 240,
    opacity: 0.72,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  title: { fontSize: 29, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { marginTop: 2, fontSize: 13, fontWeight: '700' },
  topAction: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topActionSymbol: { width: 24, height: 24 },
  mapTabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.round,
  },
  mapTab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  mapTabText: { fontSize: 12, fontWeight: '800' },
  familySwitcherHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  stateCard: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  loadingText: { fontSize: 12 },
  errorCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12 },
  mapCard: {
    height: 420,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  mapButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    ...shadows.card,
  },
  mapFilterButton: { position: 'absolute', top: spacing.md, right: spacing.md },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
  },
  captionSymbol: { width: 21, height: 21 },
  selectedCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  selectedMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  selectedPlaceIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  selectedSymbol: { width: 30, height: 30 },
  selectedPlaceContent: { flex: 1, gap: 4 },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.round,
  },
  categoryChipText: { fontSize: 11, fontWeight: '900' },
  selectedTitle: { fontSize: 18, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { flex: 1, fontSize: 12, fontWeight: '700' },
  directionsButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  directionsText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  otherPlaces: { gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  placeList: { gap: spacing.sm },
  placeChip: {
    width: 178,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  placeDot: { width: 10, height: 10, borderRadius: 5 },
  placeChipText: { flex: 1, gap: 2 },
  placeChipTitle: { fontSize: 13, fontWeight: '900' },
  placeChipMeta: { fontSize: 11, textTransform: 'capitalize' },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  emptySymbol: { width: 38, height: 38 },
  emptyTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primaryButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  buttonSymbol: { width: 24, height: 24 },
  filterOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    backgroundColor: 'rgba(7, 17, 35, 0.45)',
  },
  filterBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  filterCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
    ...shadows.card,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  filterTitle: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    fontSize: 17,
    fontWeight: '900',
  },
  filterOption: {
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  filterDotLarge: { width: 12, height: 12, borderRadius: 6 },
  filterOptionText: { flex: 1, fontSize: 14, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  infoSymbol: { width: 24, height: 24 },
  infoTitle: { fontSize: 12, fontWeight: '900' },
  infoText: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});