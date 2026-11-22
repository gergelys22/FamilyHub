import DateTimeField from '@/components/date-time-field';
import LocationAutocomplete from '@/components/location-autocomplete';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { createFamilyEvent, type EventCategory } from '@/services/events';
import { parseLocalDateTime } from '@/utils/event-date-time';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

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

function defaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function FormSection({
  icon,
  title,
  palette,
  children,
}: {
  icon: IconName;
  title: string;
  palette: Palette;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name={icon} size={17} color={palette.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function CreateEventScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const params = useLocalSearchParams<{ familyId?: string; familyName?: string }>();
  const familyId = firstParam(params.familyId);
  const familyName = firstParam(params.familyName) ?? 'Családi kör';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [category, setCategory] = useState<EventCategory>('family');
  const [saving, setSaving] = useState(false);
  const valid = useMemo(
    () =>
      Boolean(
        familyId &&
        title.trim().length >= 2 &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        /^\d{2}:\d{2}$/.test(startTime),
      ),
    [date, familyId, startTime, title],
  );
  const selectedCategory = categories.find((item) => item.value === category) ?? categories[0];

  async function save() {
    if (!familyId || !valid || saving) return;

    const startsAt = parseLocalDateTime(date, startTime);
    const endsAt = endTime ? parseLocalDateTime(date, endTime) : undefined;

    if (!startsAt || endsAt === null || (endsAt && endsAt.getTime() < startsAt.getTime())) {
      Alert.alert(
        'Hibás időpont',
        'Ellenőrizd a dátumot és az időpontokat. A befejezés nem lehet a kezdés előtt. Az időpontokat azonos napra, a készülék helyi időzónájában adjuk meg.',
      );
      return;
    }

    setSaving(true);

    try {
      await createFamilyEvent({
        familyId,
        title,
        description,
        location: location.trim(),
        locationLatitude: locationCoordinates?.latitude,
        locationLongitude: locationCoordinates?.longitude,
        category,
        startsAt,
        endsAt,
      });

      Alert.alert('Esemény létrehozva', 'Az esemény bekerült a családi naptárba.');

      router.replace('/calendar');
    } catch (caught) {
      Alert.alert(
        'Nem sikerült menteni',
        caught instanceof Error ? caught.message : 'Próbáld újra később.',
      );
    } finally {
      setSaving(false);
    }
  }

  const inputColors = {
    color: palette.textPrimary,
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: palette.background }]}>
          <ScreenCloseButton />
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Új esemény</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.familyBadge, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="people" size={14} color={palette.primary} />
            <Text style={[styles.familyBadgeText, { color: palette.primary }]}>{familyName}</Text>
          </View>

          <FormSection icon="create-outline" title="Alapadatok" palette={palette}>
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: palette.textSecondary }]}>Esemény címe</Text>
                <Text style={[styles.counter, { color: palette.textMuted }]}>{title.length}/120</Text>
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Például: családi vacsora"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.titleInput, inputColors]}
                maxLength={120}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Kategória</Text>
              <View style={styles.categories}>
                {categories.map((item) => {
                  const selected = category === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setCategory(item.value)}
                      style={({ pressed }) => [
                        styles.category,
                        { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                        selected && { borderColor: item.color, backgroundColor: `${item.color}22` },
                        pressed && styles.pressed,
                      ]}
                    >
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={16} color={item.color} />
                      ) : (
                        <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                      )}
                      <Text
                        style={[
                          styles.categoryText,
                          { color: selected ? palette.textPrimary : palette.textSecondary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </FormSection>

          <FormSection icon="time-outline" title="Időpont" palette={palette}>
            <DateTimeField label="Dátum" mode="date" value={date} onChange={setDate} disabled={saving} />

            <View style={styles.row}>
              <View style={styles.flex}>
                <DateTimeField
                  label="Kezdés"
                  mode="time"
                  value={startTime}
                  onChange={setStartTime}
                  disabled={saving}
                />
              </View>

              <View style={styles.flex}>
                <DateTimeField
                  label="Befejezés"
                  mode="time"
                  value={endTime}
                  onChange={setEndTime}
                  disabled={saving}
                  clearable
                />
              </View>
            </View>
          </FormSection>

          <FormSection icon="location-outline" title="Helyszín és leírás" palette={palette}>
            <LocationAutocomplete
              value={location}
              onChange={(nextLocation) => {
                setLocation(nextLocation);
                setLocationCoordinates(null);
              }}
              onSelect={(place) => {
                if (place.latitude === undefined || place.longitude === undefined) {
                  return;
                }

                setLocationCoordinates({
                  latitude: place.latitude,
                  longitude: place.longitude,
                });
              }}
              disabled={saving}
            />

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: palette.textSecondary }]}>Leírás</Text>
                <Text style={[styles.counter, { color: palette.textMuted }]}>{description.length}/1000</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Részletek az eseményről…"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.textArea, inputColors]}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>
          </FormSection>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          {!valid && !saving ? (
            <Text style={[styles.hint, { color: palette.textMuted }]}>
              Add meg az esemény címét (legalább 2 karakter).
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!valid || saving}
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: selectedCategory.color },
              (!valid || saving) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>Esemény létrehozása</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 19, fontWeight: '900' },
  headerSpacer: { width: 42 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  familyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.round,
  },
  familyBadgeText: { fontSize: 12, fontWeight: '800' },
  section: {
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '800' },
  counter: { fontSize: 11, fontWeight: '700' },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  titleInput: { fontSize: 16, fontWeight: '700' },
  textArea: { minHeight: 110, paddingTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  categoryDot: { width: 9, height: 9, borderRadius: 5 },
  categoryText: { fontSize: 12, fontWeight: '800' },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: { fontSize: 12, textAlign: 'center' },
  saveButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    ...shadows.floating,
  },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});