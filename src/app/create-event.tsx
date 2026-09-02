import { colors, radius, spacing } from '@/constants/theme';
import { createFamilyEvent, type EventCategory } from '@/services/events';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function CreateEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ familyId?: string; familyName?: string }>();
  const familyId = firstParam(params.familyId);
  const familyName = firstParam(params.familyName) ?? 'Családi kör';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [category, setCategory] = useState<EventCategory>('family');
  const [saving, setSaving] = useState(false);
  const valid = useMemo(() => Boolean(familyId && title.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(startTime)), [date, familyId, startTime, title]);

  async function save() {
    if (!familyId || !valid) return;
    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = endTime ? new Date(`${date}T${endTime}:00`) : undefined;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && endsAt < startsAt)) {
      Alert.alert('Hibás időpont', 'Ellenőrizd a dátumot és a kezdési/befejezési időt.');
      return;
    }

    setSaving(true);
    try {
      await createFamilyEvent({ familyId, title, description, location, category, startsAt, endsAt });
      Alert.alert('Esemény létrehozva', 'Az esemény bekerült a családi naptárba.');
      router.replace('/calendar');
    } catch (caught) {
      Alert.alert('Nem sikerült menteni', caught instanceof Error ? caught.message : 'Próbáld újra később.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={22} tintColor={colors.textPrimary} weight={{ ios: 'semibold', android: medium }} style={styles.symbol} />
          </Pressable>
          <Text style={styles.headerTitle}>Új esemény</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.familyBadge}><Text style={styles.familyBadgeText}>{familyName}</Text></View>
          <View style={styles.field}><Text style={styles.label}>Esemény címe</Text><TextInput value={title} onChangeText={setTitle} placeholder="Például: családi vacsora" placeholderTextColor={colors.textMuted} style={styles.input} maxLength={120} /></View>
          <View style={styles.field}><Text style={styles.label}>Kategória</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map((item) => <Pressable key={item.value} onPress={() => setCategory(item.value)} style={[styles.category, category === item.value && { borderColor: item.color, backgroundColor: `${item.color}22` }]}><View style={[styles.categoryDot, { backgroundColor: item.color }]} /><Text style={styles.categoryText}>{item.label}</Text></Pressable>)}</ScrollView></View>
          <View style={styles.row}><View style={[styles.field, styles.flex]}><Text style={styles.label}>Dátum</Text><TextInput value={date} onChangeText={setDate} placeholder="ÉÉÉÉ-HH-NN" placeholderTextColor={colors.textMuted} style={styles.input} keyboardType="numbers-and-punctuation" /></View></View>
          <View style={styles.row}><View style={[styles.field, styles.flex]}><Text style={styles.label}>Kezdés</Text><TextInput value={startTime} onChangeText={setStartTime} placeholder="18:00" placeholderTextColor={colors.textMuted} style={styles.input} keyboardType="numbers-and-punctuation" /></View><View style={[styles.field, styles.flex]}><Text style={styles.label}>Befejezés</Text><TextInput value={endTime} onChangeText={setEndTime} placeholder="19:00" placeholderTextColor={colors.textMuted} style={styles.input} keyboardType="numbers-and-punctuation" /></View></View>
          <View style={styles.field}><Text style={styles.label}>Helyszín</Text><TextInput value={location} onChangeText={setLocation} placeholder="Opcionális" placeholderTextColor={colors.textMuted} style={styles.input} /></View>
          <View style={styles.field}><Text style={styles.label}>Leírás</Text><TextInput value={description} onChangeText={setDescription} placeholder="Részletek az eseményről…" placeholderTextColor={colors.textMuted} style={[styles.input, styles.textArea]} multiline textAlignVertical="top" maxLength={1000} /></View>
          <Pressable disabled={!valid || saving} onPress={() => void save()} style={({ pressed }) => [styles.saveButton, (!valid || saving) && styles.disabled, pressed && styles.pressed]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Esemény létrehozása</Text>}</Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  header: { height: 60, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900' }, headerSpacer: { width: 42 }, symbol: { width: 26, height: 26 },
  iconButton: { width: 42, height: 42, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  familyBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.round, backgroundColor: '#17335C' }, familyBadgeText: { color: colors.primaryLight, fontSize: 11, fontWeight: '800' },
  field: { gap: spacing.sm }, label: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 50, paddingHorizontal: spacing.lg, color: colors.textPrimary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  textArea: { minHeight: 110, paddingTop: spacing.md }, row: { flexDirection: 'row', gap: spacing.md },
  categories: { gap: spacing.sm }, category: { minHeight: 40, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.round, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, categoryDot: { width: 8, height: 8, borderRadius: 4 }, categoryText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  saveButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary }, saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
