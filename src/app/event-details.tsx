
import { ActionSheet, ConfirmDialog, type SheetAction } from '@/components/action-sheet';
import DateTimeField from '@/components/date-time-field';
import LocationAutocomplete from '@/components/location-autocomplete';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import {
  deleteFamilyEvent,
  getFamilyEvent,
  updateFamilyEvent,
  type EventCategory,
  type FamilyEvent,
} from '@/services/events';
import { parseLocalDateTime } from '@/utils/event-date-time';
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
  TextInput,
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

const categories: { value: EventCategory; label: string; color: string }[] = [
  { value: 'family', label: 'Családi', color: '#8B5CF6' },
  { value: 'birthday', label: 'Születésnap', color: '#F55B91' },
  { value: 'medical', label: 'Orvosi', color: '#34D399' },
  { value: 'school', label: 'Iskola', color: '#38BDF8' },
  { value: 'sport', label: 'Sport', color: '#F59E0B' },
  { value: 'administration', label: 'Ügyintézés', color: '#FB7185' },
  { value: 'trip', label: 'Kirándulás', color: '#22C55E' },
];

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

function formatDateInput(value: string) {
  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeInput(value: string) {
  const date = new Date(value);

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

  const [now, setNow] = useState(() => new Date());

  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(
    eventId ? null : 'Hiányzó eseményazonosító.',
  );

  // Műveleti menü és törlés megerősítése.
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // Helyben történő szerkesztés állapota.
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCoordinates, setEditCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editCategory, setEditCategory] = useState<EventCategory>('family');

  // Esemény betöltése.
  useEffect(() => {
    if (!eventId) return;

    let active = true;

    async function loadEvent(id: string) {
      try {
        const result = await getFamilyEvent(id);

        if (!active) return;

        setEvent(result);
        setError(null);
        setNow(new Date());
      } catch (caught) {
        if (!active) return;

        setError(
          caught instanceof Error
            ? caught.message
            : 'Az esemény betöltése sikertelen.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvent(eventId);

    return () => {
      active = false;
    };
  }, [eventId]);

  function startEditing() {
    if (!event) return;

    setEditTitle(event.title);
    setEditDescription(event.description ?? '');
    setEditLocation(event.location_name ?? '');

    setEditCoordinates(
      event.location_latitude !== null &&
      event.location_longitude !== null
        ? {
            latitude: event.location_latitude,
            longitude: event.location_longitude,
          }
        : null,
    );

    setEditDate(formatDateInput(event.starts_at));
    setEditStartTime(formatTimeInput(event.starts_at));
    setEditEndTime(event.ends_at ? formatTimeInput(event.ends_at) : '');
    setEditCategory(event.category);

    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function saveChanges() {
    if (!event || saving) return;

    if (editTitle.trim().length < 2) {
      Alert.alert('Hiányzó cím', 'Az esemény címe legalább 2 karakter legyen.');
      return;
    }

    const startsAt = parseLocalDateTime(editDate, editStartTime);
    const endsAt = editEndTime
      ? parseLocalDateTime(editDate, editEndTime)
      : undefined;

    if (
      !startsAt ||
      endsAt === null ||
      (endsAt && endsAt.getTime() < startsAt.getTime())
    ) {
      Alert.alert(
        'Hibás időpont',
        'Ellenőrizd a dátumot és az időpontokat. A befejezés nem lehet a kezdés előtt.',
      );
      return;
    }

    setSaving(true);

    try {
      await updateFamilyEvent(event.id, {
        title: editTitle,
        description: editDescription,
        location: editLocation,
        locationLatitude: editCoordinates?.latitude,
        locationLongitude: editCoordinates?.longitude,
        category: editCategory,
        startsAt,
        endsAt,
      });

      const updatedEvent = await getFamilyEvent(event.id);

      setEvent(updatedEvent);
      setNow(new Date());
      setEditing(false);

      Alert.alert('Sikeres módosítás', 'Az esemény adatai frissültek.');
    } catch (caught) {
      Alert.alert(
        'Nem sikerült menteni',
        caught instanceof Error
          ? caught.message
          : 'Próbáld újra később.',
      );
    } finally {
      setSaving(false);
    }
  }

  const menuActions: SheetAction[] = [
    {
      key: 'edit',
      label: 'Esemény szerkesztése',
      icon: 'create-outline',
      onPress: startEditing,
    },
    {
      key: 'delete',
      label: 'Esemény törlése',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => setDeleteConfirmVisible(true),
    },
  ];

  async function removeEvent() {
    if (!event) return;

    setDeleting(true);

    try {
      await deleteFamilyEvent(event.id);
      router.replace('/calendar');
    } catch (caught) {
      Alert.alert(
        'Nem sikerült törölni',
        caught instanceof Error
          ? caught.message
          : 'Próbáld újra később.',
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
      Alert.alert(
        'Nem sikerült megnyitni',
        'Ezen a készüléken most nem érhető el a térképalkalmazás.',
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const category =
    categoryData[event?.category ?? 'family'] ?? categoryData.family;

  const state = event ? getEventState(event.starts_at, now) : null;

  const stateColor =
    state === 'Lezajlott'
      ? palette.textMuted
      : state === 'Ma'
        ? palette.danger
        : palette.primary;

  const selectedCategory =
    categories.find((item) => item.value === editCategory) ?? categories[0];

  const inputStyle = [
    styles.input,
    {
      color: palette.textPrimary,
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <ScreenCloseButton />

        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
          {editing ? 'Esemény szerkesztése' : 'Esemény részletei'}
        </Text>

        <Pressable
          accessibilityLabel="Esemény műveletei"
          accessibilityRole="button"
          disabled={!event || deleting || saving}
          onPress={() => setMenuVisible(true)}
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
            pressed && styles.pressed,
            (!event || deleting || saving) && styles.disabled,
          ]}
        >
          {deleting ? (
            <ActivityIndicator color={palette.danger} size="small" />
          ) : (
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color={palette.textPrimary}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={[styles.errorText, { color: palette.danger }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {event ? (
          editing ? (
            <>
              {/* Szerkeszthető űrlap ugyanazon a képernyőn */}
              <View
                style={[
                  styles.editCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                  Alapadatok
                </Text>

                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                  Esemény neve
                </Text>

                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Esemény neve"
                  placeholderTextColor={palette.textMuted}
                  style={inputStyle}
                  maxLength={120}
                  editable={!saving}
                />

                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                  Kategória
                </Text>

                <View style={styles.categories}>
                  {categories.map((item) => {
                    const selected = editCategory === item.value;

                    return (
                      <Pressable
                        key={item.value}
                        disabled={saving}
                        onPress={() => setEditCategory(item.value)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: palette.surfaceMuted,
                            borderColor: palette.border,
                          },
                          selected && {
                            borderColor: item.color,
                            backgroundColor: `${item.color}22`,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.categoryText,
                            { color: palette.textPrimary },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.editDivider} />

                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                  Időpont
                </Text>

                <DateTimeField
                  label="Dátum"
                  mode="date"
                  value={editDate}
                  onChange={setEditDate}
                  disabled={saving}
                />

                <View style={styles.timeRow}>
                  <View style={styles.timeColumn}>
                    <DateTimeField
                      label="Kezdés"
                      mode="time"
                      value={editStartTime}
                      onChange={setEditStartTime}
                      disabled={saving}
                    />
                  </View>

                  <View style={styles.timeColumn}>
                    <DateTimeField
                      label="Befejezés"
                      mode="time"
                      value={editEndTime}
                      onChange={setEditEndTime}
                      disabled={saving}
                      clearable
                    />
                  </View>
                </View>

                <View style={styles.editDivider} />

                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                  Helyszín és leírás
                </Text>

                <LocationAutocomplete
                  value={editLocation}
                  onChange={(value) => {
                    setEditLocation(value);
                    setEditCoordinates(null);
                  }}
                  onSelect={(place) => {
                    if (
                      place.latitude === undefined ||
                      place.longitude === undefined
                    ) {
                      return;
                    }

                    setEditCoordinates({
                      latitude: place.latitude,
                      longitude: place.longitude,
                    });
                  }}
                  disabled={saving}
                />

                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                  Leírás
                </Text>

                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Részletek az eseményről..."
                  placeholderTextColor={palette.textMuted}
                  style={[inputStyle, styles.descriptionInput]}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  editable={!saving}
                />
              </View>

              <View style={styles.editButtons}>
                <Pressable
                  disabled={saving}
                  onPress={cancelEditing}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.cancelButtonText, { color: palette.textSecondary }]}>
                    Mégse
                  </Text>
                </Pressable>

                <Pressable
                  disabled={saving || editTitle.trim().length < 2}
                  onPress={() => void saveChanges()}
                  style={({ pressed }) => [
                    styles.saveButton,
                    { backgroundColor: selectedCategory.color },
                    (saving || editTitle.trim().length < 2) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={19} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Mentés</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Esemény részletei */}
              <View
                style={[
                  styles.heroCard,
                  {
                    borderTopColor: category.color,
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[`${category.color}33`, `${category.color}00`]}
                  style={styles.heroGlow}
                />

                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${category.color}26` },
                  ]}
                >
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
                    <Text style={[styles.badgeText, { color: category.color }]}>
                      {category.label}
                    </Text>
                  </View>

                  {state ? (
                    <View style={[styles.badge, { backgroundColor: `${stateColor}22` }]}>
                      <Text style={[styles.badgeText, { color: stateColor }]}>
                        {state}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.title, { color: palette.textPrimary }]}>
                  {event.title}
                </Text>

                {event.description ? (
                  <Text style={[styles.description, { color: palette.textSecondary }]}>
                    {event.description}
                  </Text>
                ) : null}
              </View>

              <View
                style={[
                  styles.detailsCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                  Az esemény adatai
                </Text>

                <View style={styles.detailRow}>
                  <View style={[styles.dateChip, { backgroundColor: `${category.color}22` }]}>
                    <Text style={[styles.dateDay, { color: category.color }]}>
                      {formatDay(event.starts_at)}
                    </Text>
                    <Text style={[styles.dateMonth, { color: category.color }]}>
                      {formatMonth(event.starts_at)}
                    </Text>
                  </View>

                  <View style={styles.flex}>
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>
                      Dátum
                    </Text>
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
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>
                      Időpont
                    </Text>
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
                        <Text style={[styles.detailLabel, { color: palette.textMuted }]}>
                          Helyszín
                        </Text>
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
          )
        ) : null}
      </ScrollView>

      {/* Műveleti menü */}
      <ActionSheet
        visible={menuVisible}
        title="Esemény műveletei"
        subtitle={event?.title ?? ''}
        actions={menuActions}
        onClose={() => setMenuVisible(false)}
        palette={palette}
      />

      {/* Törlés megerősítése */}
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Esemény törlése"
        message={`Biztosan törlöd ezt az eseményt: ${event?.title ?? ''}?`}
        confirmLabel="Törlés"
        destructive
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          setDeleteConfirmVisible(false);
          void removeEvent();
        }}
        palette={palette}
      />
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

  content: {
    padding: spacing.lg,
    paddingBottom: 48,
    gap: spacing.lg,
  },

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
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 170,
  },
  categoryIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.round,
  },
  badgeText: { fontSize: 12, fontWeight: '900' },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  detailsCard: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
    fontSize: 17,
    fontWeight: '900',
  },
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
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  directionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  // Szerkesztőfelület
  editCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: -spacing.xs,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  descriptionInput: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#8892A033',
    marginVertical: spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeColumn: {
    flex: 1,
  },
  editButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  saveButton: {
    flex: 1.5,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  flex: { flex: 1 },
  largeSymbol: { width: 42, height: 42 },

  errorCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  disabled: { opacity: 0.45 },
});
