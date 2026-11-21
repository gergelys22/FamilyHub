import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { getFamilySchoolItems, type FamilySchoolItem } from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const typeMeta: Record<FamilySchoolItem['item_type'], { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  timetable: { label: 'Órarend', color: colors.primary, icon: 'time-outline' },
  homework: { label: 'Házi feladat', color: colors.purple, icon: 'book-outline' },
  exam: { label: 'Dolgozat / vizsga', color: colors.warning, icon: 'school-outline' },
  workout: { label: 'Edzés', color: colors.teal, icon: 'barbell-outline' },
  meeting: { label: 'Szülői értekezlet', color: colors.pink, icon: 'people-outline' },
};

function monthDays(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= total ? day : null;
  });
}

function itemDate(item: FamilySchoolItem) {
  const value = item.due_at ?? item.starts_at;
  return value ? new Date(value) : null;
}

function sameDay(date: Date | null, selected: Date) {
  return Boolean(date && date.toDateString() === selected.toDateString());
}

export default function SchoolCalendarScreen() {
  const { childId, childName, familyId } = useLocalSearchParams<{ childId?: string; childName?: string; familyId?: string }>();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [items, setItems] = useState<FamilySchoolItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const days = useMemo(() => monthDays(cursor), [cursor]);

  const requestKey = childId && familyId ? `${familyId}:${childId}` : null;
  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    if (!childId || !familyId || !requestKey) {
      return;
    }
    let active = true;
    void getFamilySchoolItems(familyId, childId)
      .then((result) => {
        if (active) setItems(result);
      })
      .catch((error: unknown) => {
        if (active) Alert.alert('Betöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra később.');
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [childId, familyId, requestKey]);

  const selectedItems = items.filter((item) => sameDay(itemDate(item), selectedDay));
  const monthItems = items.filter((item) => {
    const date = itemDate(item);
    return date?.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth();
  });

  function moveMonth(offset: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function selectDay(day: number) {
    setSelectedDay(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Gyermek naptára</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{childName || 'Kiválasztott gyermek'}</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => moveMonth(-1)} accessibilityLabel="Előző hónap" style={styles.monthButton}>
            <Ionicons name="chevron-back" size={20} color={palette.primary} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: palette.textPrimary }]}>
            {cursor.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
          </Text>
          <Pressable onPress={() => moveMonth(1)} accessibilityLabel="Következő hónap" style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={20} color={palette.primary} />
          </Pressable>
        </View>

        <View style={[styles.calendar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.weekRow}>
            {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day) => (
              <Text key={day} style={[styles.weekLabel, { color: palette.textMuted }]}>{day}</Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const date = day ? new Date(cursor.getFullYear(), cursor.getMonth(), day) : null;
              const hasItems = Boolean(date && monthItems.some((item) => sameDay(itemDate(item), date)));
              const selected = Boolean(date && sameDay(date, selectedDay));
              return (
                <Pressable
                  key={`${cursor.toISOString()}-${index}`}
                  disabled={!day}
                  onPress={() => day && selectDay(day)}
                  style={[styles.day, selected && { backgroundColor: palette.primary }]}
                >
                  {day ? <Text style={[styles.dayText, { color: selected ? palette.white : palette.textPrimary }]}>{day}</Text> : null}
                  {hasItems ? <View style={[styles.dot, { backgroundColor: selected ? palette.white : palette.primary }]} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
            {selectedDay.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })}
          </Text>
          <Text style={[styles.count, { color: palette.textMuted }]}>{selectedItems.length} elem</Text>
        </View>

        {loading ? <Text style={[styles.empty, { color: palette.textMuted }]}>Naptár betöltése…</Text> : null}
        {!loading && selectedItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface }]}>
            <Ionicons name="calendar-clear-outline" size={28} color={palette.textMuted} />
            <Text style={[styles.empty, { color: palette.textMuted }]}>Erre a napra nincs iskolai esemény.</Text>
          </View>
        ) : null}
        {selectedItems.map((item) => {
          const meta = typeMeta[item.item_type];
          const date = itemDate(item);
          return (
            <View key={item.id} style={[styles.item, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.itemIcon, { backgroundColor: `${meta.color}20` }]}>
                <Ionicons name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.itemTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.itemType, { color: meta.color }]}>{meta.label}{date ? ` · ${date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}` : ''}</Text>
                {item.detail ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>{item.detail}</Text> : null}
                {item.location ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>Helyszín: {item.location}</Text> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  headerTitleWrap: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { marginTop: 2, fontSize: 11 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontSize: 18, fontWeight: '900', textTransform: 'capitalize' },
  monthButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  calendar: { padding: spacing.sm, borderWidth: 1, borderRadius: radius.lg },
  weekRow: { flexDirection: 'row' },
  weekLabel: { flex: 1, paddingVertical: spacing.sm, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  dayText: { fontSize: 13, fontWeight: '800' },
  dot: { width: 5, height: 5, marginTop: 3, borderRadius: radius.round },
  sectionHeader: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '900', textTransform: 'capitalize' },
  count: { fontSize: 11, fontWeight: '700' },
  emptyCard: { minHeight: 130, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  empty: { padding: spacing.md, textAlign: 'center', fontSize: 12 },
  item: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  itemIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  flex: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '900' },
  itemType: { marginTop: 4, fontSize: 11, fontWeight: '800' },
  itemDetail: { marginTop: 3, fontSize: 11 },
});