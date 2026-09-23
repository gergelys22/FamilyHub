import { FamilyHeader } from '@/components/family-header';
import { EventMap } from '@/components/event-map';
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, radius, spacing } from '@/constants/theme';
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
  Alert,
  Linking,
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
  medical: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  school: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  sport: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  administration: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  trip: { ios: 'mountain.2.fill', android: 'landscape', web: 'landscape' },
};

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

function EventLocationCard({ event, selected, onPress, onNavigate }: {
  event: FamilyEvent;
  selected: boolean;
  onPress: () => void;
  onNavigate: () => void;
}) {
  const color = categoryColors[event.category] ?? colors.primary;

  return (
    <View
      style={[
        styles.locationCard,
        selected && { borderColor: color, backgroundColor: `${color}18` },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.locationCardMain, pressed && styles.pressed]}>
        <View style={[styles.eventIcon, { backgroundColor: `${color}26` }]}>
          <SymbolView
            name={categoryIcons[event.category] ?? categoryIcons.family}
            size={21}
            tintColor={color}
            type="hierarchical"
            weight={{ ios: 'semibold', android: medium }}
            style={styles.eventSymbol}
          />
        </View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.eventTitle}>{event.title}</Text>
          <Text numberOfLines={1} style={styles.eventLocation}>{event.location_name}</Text>
          <Text style={styles.eventMeta}>{formatWhen(event)}</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.location_name} megnyitása a térképen`}
        hitSlop={8}
        onPress={onNavigate}
        style={({ pressed }) => [styles.navigateButton, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'arrow.triangle.turn.up.right.diamond.fill', android: 'directions', web: 'directions' }}
          size={21}
          tintColor={colors.primaryLight}
          type="hierarchical"
          weight={{ ios: 'semibold', android: medium }}
          style={styles.eventSymbol}
        />
      </Pressable>
    </View>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => dateRange(), []);
  const activeFamilyId = activeFamily?.id;
  const locationEvents = events.filter((event) => Boolean(event.location_name?.trim()));
  const selectedEvent = locationEvents.find((event) => event.id === selectedEventId) ?? locationEvents[0] ?? null;
  const displayName = profile?.display_name?.trim() || 'Felhasználó';
  const userInitial = displayName.charAt(0).toLocaleUpperCase('hu-HU') || '?';

  useFocusEffect(useCallback(() => {
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
          withLocation.some((event) => event.id === current) ? current : (withLocation[0]?.id ?? null),
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
  }, [activeFamilyId, range.from, range.to]));

  async function openDirections(event: FamilyEvent) {
    const location = event.location_name?.trim();
    if (!location) return;

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

    try {
      await Linking.openURL(mapUrl);
    } catch {
      Alert.alert('Nem sikerült megnyitni', 'Ezen a készüléken most nem érhető el a térképalkalmazás.');
    }
  }

  function createEvent() {
    if (!activeFamily) return;
    router.push({
      pathname: '/create-event',
      params: { familyId: activeFamily.id, familyName: activeFamily.name },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View pointerEvents="none" style={styles.backgroundGlow} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FamilyHeader
          userInitial={userInitial}
          unreadNotificationCount={unreadCount}
          onNotificationsPress={() => router.push('/notifications')}
          onProfilePress={() => router.push('/profile')}
        />

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <SymbolView
              name={{ ios: 'map.fill', android: 'map', web: 'map' }}
              size={28}
              tintColor={colors.primaryLight}
              type="hierarchical"
              weight={{ ios: 'semibold', android: medium }}
              style={styles.heroSymbol}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>Családi térkép</Text>
            <Text style={styles.subtitle}>A következő 90 nap közös programjainak helyszínei.</Text>
          </View>
        </View>

        <FamilySwitcher onActiveFamilyChange={setActiveFamily} />

        {activeFamily ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Közelgő helyszínek</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{locationEvents.length}</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={colors.primaryLight} />
                <Text style={styles.loadingText}>Helyszínek betöltése…</Text>
              </View>
            ) : error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : locationEvents.length ? (
              <>
                <View style={styles.mapCard}>
                  <EventMap
                    events={locationEvents}
                    selectedEventId={selectedEvent?.id ?? null}
                  />

                  <View pointerEvents="none" style={styles.mapCaption}>
                  <SymbolView
                    name={{
                      ios: 'mappin.and.ellipse',
                      android: 'location_on',
                      web: 'location_on',
                    }}
                    size={17}
                    tintColor={colors.textSecondary}
                    type="hierarchical"
                    weight={{ ios: 'semibold', android: medium }}
                    style={styles.captionSymbol}
                  />

                    <Text style={styles.mapCaptionText}>Közelgő eseményhelyszínek</Text>
                  </View>
                </View>
                {selectedEvent ? (
                  <View style={styles.selectedCard}>
                    <View style={styles.selectedTopRow}>
                      <View style={styles.selectedLabel}>
                        <View style={styles.selectedDot} />
                        <Text style={styles.selectedLabelText}>KIVÁLASZTOTT HELYSZÍN</Text>
                      </View>
                      <Text style={styles.selectedDate}>{formatWhen(selectedEvent)}</Text>
                    </View>
                    <Text style={styles.selectedTitle}>{selectedEvent.title}</Text>
                    <Text style={styles.selectedLocation}>{selectedEvent.location_name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void openDirections(selectedEvent)}
                      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                      <SymbolView
                        name={{ ios: 'arrow.triangle.turn.up.right.diamond.fill', android: 'directions', web: 'directions' }}
                        size={21}
                        tintColor="#FFFFFF"
                        type="hierarchical"
                        weight={{ ios: 'semibold', android: medium }}
                        style={styles.buttonSymbol}
                      />
                      <Text style={styles.primaryButtonText}>Megnyitás a térképen</Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.list}>
                  {locationEvents.map((event) => (
                    <EventLocationCard
                      key={event.id}
                      event={event}
                      selected={event.id === selectedEvent?.id}
                      onPress={() => setSelectedEventId(event.id)}
                      onNavigate={() => void openDirections(event)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <SymbolView
                    name={{ ios: 'mappin.slash', android: 'location_off', web: 'location_off' }}
                    size={32}
                    tintColor={colors.primaryLight}
                    type="hierarchical"
                    weight={{ ios: 'semibold', android: medium }}
                    style={styles.emptySymbol}
                  />
                </View>
                <Text style={styles.emptyTitle}>Még nincs helyszín a térképen</Text>
                <Text style={styles.emptyText}>Adj helyszínt egy közös eseményhez, és itt rögtön elérhető lesz.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={createEvent}
                  style={({ pressed }) => [styles.primaryButton, styles.emptyButton, pressed && styles.pressed]}>
                  <SymbolView
                    name={{ ios: 'calendar.badge.plus', android: 'event_upcoming', web: 'event_upcoming' }}
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

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <SymbolView
                  name={{ ios: 'lock.shield.fill', android: 'shield_lock', web: 'shield_lock' }}
                  size={21}
                  tintColor="#6EE7B7"
                  type="hierarchical"
                  weight={{ ios: 'semibold', android: medium }}
                  style={styles.infoSymbol}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.infoTitle}>Csak közös eseményhelyszínek</Text>
                <Text style={styles.infoText}>Ez a képernyő nem követi a családtagok élő helyzetét.</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  backgroundGlow: { position: 'absolute', top: 88, right: -130, width: 300, height: 300, borderRadius: 150, backgroundColor: '#0B4A8F', opacity: 0.2 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  heroIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#315687', backgroundColor: '#17335C' },
  heroSymbol: { width: 32, height: 32 },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  countBadge: { minWidth: 28, height: 28, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: '#17335C', borderWidth: 1, borderColor: '#315687' },
  countText: { color: colors.primaryLight, fontSize: 12, fontWeight: '900' },
  loadingCard: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#10233E' },
  loadingText: { color: colors.textMuted, fontSize: 12 },
  errorCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#7F2439', backgroundColor: '#3B1622' },
  errorText: { color: '#FDA4AF', fontSize: 12 },
  mapCard: { height: 248, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: '#315079', backgroundColor: '#102B40' },
  mapGlow: { position: 'absolute', top: -100, left: '30%', width: 280, height: 280, borderRadius: 140, backgroundColor: '#2563EB', opacity: 0.16 },
  mapRoad: { position: 'absolute', height: 8, borderRadius: 8, backgroundColor: '#4D7890', opacity: 0.75 },
  mapRoadOne: { top: 70, left: -40, width: '120%', transform: [{ rotate: '-15deg' }] },
  mapRoadTwo: { top: 128, left: -12, width: '105%', transform: [{ rotate: '19deg' }] },
  mapRoadThree: { top: 172, left: '17%', width: '80%', transform: [{ rotate: '-52deg' }] },
  mapRiver: { position: 'absolute', top: 92, right: -45, width: '130%', height: 25, borderRadius: 20, borderWidth: 4, borderColor: '#1D5C82', opacity: 0.72, transform: [{ rotate: '27deg' }] },
  mapMarker: { position: 'absolute', width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 3, backgroundColor: '#173B55', shadowColor: '#071123', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 7, elevation: 5 },
  mapMarkerSelected: { transform: [{ scale: 1.18 }], backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8 },
  markerSymbol: { width: 22, height: 22 },
  mapCaption: { position: 'absolute', right: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.round, backgroundColor: 'rgba(7, 17, 35, 0.84)' },
  captionSymbol: { width: 19, height: 19 },
  mapCaptionText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  selectedCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl, borderWidth: 1, borderColor: '#315687', backgroundColor: '#10233E' },
  selectedTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  selectedLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#60A5FA' },
  selectedLabelText: { color: colors.primaryLight, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  selectedDate: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  selectedTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  selectedLocation: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  buttonSymbol: { width: 24, height: 24 },
  list: { gap: spacing.sm },
  locationCard: { minHeight: 82, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  eventIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  eventSymbol: { width: 25, height: 25 },
  eventTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  eventLocation: { marginTop: 3, color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  eventMeta: { marginTop: 3, color: colors.textMuted, fontSize: 10, textTransform: 'capitalize' },
  navigateButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: '#17335C' },
  emptyCard: { alignItems: 'center', padding: spacing.xl, gap: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#10233E' },
  emptyIcon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#17335C' },
  emptySymbol: { width: 38, height: 38 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyButton: { alignSelf: 'stretch', marginTop: spacing.sm },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#17544D', backgroundColor: '#0B302F' },
  infoIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#0C4A45' },
  infoSymbol: { width: 24, height: 24 },
  infoTitle: { color: '#D1FAE5', fontSize: 12, fontWeight: '900' },
  infoText: { marginTop: 2, color: '#93C5B5', fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  locationCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  googleMap: { flex: 1 }
});
