import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  deleteMedication,
  getMedications,
  saveMedication,
  saveMedications,
  type Medication,
} from '@/services/family-content';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PendingMedication = {
  name: string;
  dosageText: string;
  instructions: string;
  personProfileId: string | null;
  nextAt: string | null;
  frequency: string;
  scheduleTime: string;
  isActive: boolean;
  endsOn: string | null;
};

export default function MedicationsScreen() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [items, setItems] = useState<Medication[]>([]);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [personProfileId, setPersonProfileId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState('Napi');
  const [scheduleTime, setScheduleTime] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingMedication[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'Napi' | 'Rendszeres' | 'Szükség esetén'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'next' | 'person'>('name');

  async function reload(id = familyId) {
    if (id) setItems(await getMedications(id));
  }

  useEffect(() => {
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        if (!id) return;
        const [familyMembers, medications] = await Promise.all([
          getFamilyMembers(id),
          getMedications(id),
        ]);
        setMembers(familyMembers);
        setItems(medications);
      })
      .catch((error) =>
        Alert.alert(
          'Betöltés sikertelen',
          error instanceof Error ? error.message : 'Próbáld újra.',
        ),
      );
  }, []);

  function openForm(item?: Medication) {
    setEditing(item ?? null);
    setName(item?.name ?? '');
    setDosage(item?.dosage_text ?? '');
    setInstructions(item?.instructions ?? '');
    setPersonProfileId(item?.person_profile_id ?? null);
    setFrequency(item?.frequency ?? 'Napi');
    setScheduleTime(item?.schedule_time ?? '');
    setNextAt(item?.next_at ? item.next_at.slice(0, 16).replace('T', ' ') : '');
    setEndsOn(item?.ends_on ?? '');
    setIsActive(item?.is_active ?? true);
    setPendingItems([]);
    setVisible(true);
  }

  function parseDate(value: string, allowTime: boolean) {
    if (!value.trim()) return null;
    const parsed = new Date(
      allowTime ? value.trim().replace(' ', 'T') : `${value.trim()}T00:00:00`,
    );
    return Number.isNaN(parsed.getTime()) ? false : parsed.toISOString();
  }

  function buildCurrentItem() {
    if (!name.trim() || !dosage.trim()) return null;
    const next = parseDate(nextAt, true);
    if (next === false) return false;
    const end = parseDate(endsOn, false);
    if (end === false) return false;
    return {
      name: name.trim(),
      dosageText: dosage.trim(),
      instructions: instructions.trim(),
      personProfileId,
      nextAt: next,
      frequency,
      scheduleTime: scheduleTime.trim(),
      isActive,
      endsOn: end,
    } satisfies PendingMedication;
  }

  function addToBatch() {
    if (!name.trim() || !dosage.trim()) {
      Alert.alert('Hiányzó adat', 'Add meg a gyógyszer nevét és adagját.');
      return;
    }
    const item = buildCurrentItem();
    if (item === false) {
      Alert.alert('Hibás dátum', 'Az időpontnál használd a 2026-10-11 09:30, a lejáratnál a 2026-10-11 formátumot.');
      return;
    }
    if (item) {
      setPendingItems((current) => [...current, item]);
      setName('');
      setDosage('');
      setInstructions('');
      setScheduleTime('');
      setNextAt('');
    }
  }

  async function save() {
    if (!familyId || !profile?.id) return;
    if (editing) {
      const item = buildCurrentItem();
      if (item === null) {
        Alert.alert('Hiányzó adat', 'Add meg a gyógyszer nevét és adagját.');
        return;
      }
      if (item === false) {
        Alert.alert('Hibás dátum', 'Ellenőrizd az időpontok formátumát.');
        return;
      }
      setBusy(true);
      try {
        await saveMedication({
          id: editing.id,
          familyId,
          profileId: profile.id,
          personProfileId: item.personProfileId,
          name: item.name,
          dosageText: item.dosageText,
          instructions: item.instructions,
          nextAt: item.nextAt,
          frequency: item.frequency,
          scheduleTime: item.scheduleTime,
          isActive: item.isActive,
          endsOn: item.endsOn,
        });
        await reload();
        setVisible(false);
      } catch (error) {
        Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const itemsToSave = [...pendingItems];
    if (name.trim()) {
      const current = buildCurrentItem();
      if (current === false) {
        Alert.alert('Hibás dátum', 'Ellenőrizd az időpontok formátumát.');
        return;
      }
      if (current) itemsToSave.push(current);
    }
    if (itemsToSave.length === 0) {
      Alert.alert('Hiányzó adat', 'Adj meg legalább egy gyógyszert.');
      return;
    }
    setBusy(true);
    try {
      await saveMedications(itemsToSave.map((item) => ({
        familyId,
        profileId: profile.id,
        personProfileId: item.personProfileId,
        name: item.name,
        dosageText: item.dosageText,
        instructions: item.instructions,
        nextAt: item.nextAt,
        frequency: item.frequency,
        scheduleTime: item.scheduleTime,
        isActive: item.isActive,
        endsOn: item.endsOn,
      })));
      await reload();
      setVisible(false);
    } catch (error) {
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  function remove(item: Medication) {
    Alert.alert('Gyógyszer törlése', `Törlöd a(z) ${item.name} gyógyszert?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deleteMedication(item.id)
            .then(() => reload())
            .catch((error) =>
              Alert.alert('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.'),
            ),
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Gyógyszerek</Text>
        <Ionicons name="medkit-outline" size={22} color={palette.primary} />
      </View>
      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
          <Ionicons name="search" size={20} color={palette.primary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Gyógyszer keresése..."
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.textPrimary }]}
          />
        </View>
        <Pressable
          accessibilityLabel="Gyógyszer szűrők"
          onPress={() => setFilterVisible(true)}
          style={[styles.filterButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="options-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: isDark ? '#3A1E31' : '#FFF0F5', borderColor: isDark ? '#63344F' : '#F4CDD9' }]}>
          <View style={[styles.heroIcon, { backgroundColor: isDark ? '#60304B' : '#FFDCE8' }]}>
            <Ionicons name="medkit" size={28} color={colors.pink} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>Gyógyszeradagok és ütemezés</Text>
            <Text style={[styles.heroText, { color: palette.textSecondary }]}>Személyhez, adaghoz és időponthoz rendelve. Mindig egyeztess orvossal.</Text>
          </View>
        </View>

        {[...items]
          .filter((item) => {
            const person = members.find((member) => member.profile_id === item.person_profile_id);
            const searchable = `${item.name} ${item.dosage_text ?? ''} ${item.instructions ?? ''} ${person?.display_name ?? ''}`.toLocaleLowerCase('hu-HU');
            if (!searchable.includes(search.trim().toLocaleLowerCase('hu-HU'))) return false;
            if (statusFilter === 'active' && !item.is_active) return false;
            if (statusFilter === 'inactive' && item.is_active) return false;
            if (frequencyFilter !== 'all' && item.frequency !== frequencyFilter) return false;
            return true;
          })
          .sort((a, b) => {
            if (sortBy === 'next') {
              if (!a.next_at && !b.next_at) return 0;
              if (!a.next_at) return 1;
              if (!b.next_at) return -1;
              return new Date(a.next_at).getTime() - new Date(b.next_at).getTime();
            }
            if (sortBy === 'person') {
              const personA = members.find((member) => member.profile_id === a.person_profile_id)?.display_name ?? '';
              const personB = members.find((member) => member.profile_id === b.person_profile_id)?.display_name ?? '';
              return personA.localeCompare(personB, 'hu');
            }
            return a.name.localeCompare(b.name, 'hu');
          })
          .map((item) => {
          const person = members.find((member) => member.profile_id === item.person_profile_id);
          return (
            <Pressable
              key={item.id}
              onPress={() => openForm(item)}
              onLongPress={() => remove(item)}
              style={[styles.card, { backgroundColor: palette.surface, borderColor: item.is_active ? palette.border : palette.borderStrong }]}
            >
              <View style={[styles.icon, { backgroundColor: isDark ? '#60304B' : '#FFE8F0' }]}>
                <Ionicons name="medkit-outline" size={24} color={colors.pink} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.name, { color: palette.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.dose, { color: palette.textSecondary }]}>
                  {item.dosage_text ?? 'Adagolás nincs megadva'}
                  {item.frequency ? ` · ${item.frequency}` : ''}
                </Text>
                {person ? <Text style={[styles.meta, { color: palette.primary }]}>Személy: {person.nickname || person.display_name}</Text> : null}
                {item.schedule_time ? <Text style={[styles.meta, { color: palette.textMuted }]}>Bevétel: {item.schedule_time}</Text> : null}
                {item.next_at ? <Text style={[styles.meta, { color: palette.textMuted }]}>Következő: {new Date(item.next_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text> : null}
                {item.instructions ? <Text style={[styles.meta, { color: palette.textMuted }]}>{item.instructions}</Text> : null}
              </View>
              {!item.is_active ? (
                <View style={[styles.inactiveBadge, { backgroundColor: palette.surfaceMuted }]}>
                  <Text style={[styles.inactiveText, { color: palette.textMuted }]}>Inaktív</Text>
                </View>
              ) : (
                <Ionicons name="create-outline" size={20} color={palette.primary} />
              )}
            </Pressable>
          );
        })}
        {items.length === 0 ? <Text style={[styles.empty, { color: palette.textMuted }]}>Még nincs gyógyszer rögzítve.</Text> : null}
      </ScrollView>

      <Pressable onPress={() => openForm()} style={styles.fab} accessibilityLabel="Új gyógyszer hozzáadása">
        <Ionicons name="add" size={31} color={colors.white} />
      </Pressable>

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.modalContent}>
              <View style={styles.filterHeader}>
                <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Gyógyszerszűrők</Text>
                <Pressable onPress={() => setFilterVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={palette.textSecondary} />
                </Pressable>
              </View>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Rendezés</Text>
              <View style={styles.optionRow}>
                {([
                  ['name', 'ABC'],
                  ['next', 'Következő bevétel'],
                  ['person', 'Személy'],
                ] as const).map(([value, label]) => (
                  <Pressable key={value} onPress={() => setSortBy(value)} style={[styles.option, { backgroundColor: sortBy === value ? palette.primary : palette.surfaceElevated }]}>
                    <Text style={{ color: sortBy === value ? palette.white : palette.textSecondary, fontWeight: '800' }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Állapot</Text>
              <View style={styles.optionRow}>
                {([
                  ['all', 'Mind'],
                  ['active', 'Aktív'],
                  ['inactive', 'Inaktív'],
                ] as const).map(([value, label]) => (
                  <Pressable key={value} onPress={() => setStatusFilter(value)} style={[styles.option, { backgroundColor: statusFilter === value ? palette.primary : palette.surfaceElevated }]}>
                    <Text style={{ color: statusFilter === value ? palette.white : palette.textSecondary, fontWeight: '800' }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Gyakoriság</Text>
              <View style={styles.optionRow}>
                {(['all', 'Napi', 'Rendszeres', 'Szükség esetén'] as const).map((value) => (
                  <Pressable key={value} onPress={() => setFrequencyFilter(value)} style={[styles.option, { backgroundColor: frequencyFilter === value ? palette.primary : palette.surfaceElevated }]}>
                    <Text style={{ color: frequencyFilter === value ? palette.white : palette.textSecondary, fontWeight: '800' }}>{value === 'all' ? 'Mind' : value}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => { setStatusFilter('all'); setFrequencyFilter('all'); setSortBy('name'); setSearch(''); }} style={styles.cancel}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Szűrők törlése</Text>
                </Pressable>
                <Pressable onPress={() => setFilterVisible(false)} style={[styles.save, { backgroundColor: palette.primary }]}>
                  <Text style={styles.saveText}>Megjelenítés</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>{editing ? 'Gyógyszer szerkesztése' : 'Új gyógyszer'}</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Gyógyszer neve" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={dosage} onChangeText={setDosage} placeholder="Adagolás, például 10 mg" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Gyakoriság</Text>
              <View style={styles.optionRow}>
                {['Napi', 'Rendszeres', 'Szükség esetén'].map((option) => (
                  <Pressable key={option} onPress={() => setFrequency(option)} style={[styles.option, { backgroundColor: frequency === option ? palette.primary : palette.surfaceElevated }]}>
                    <Text style={{ color: frequency === option ? palette.white : palette.textSecondary, fontWeight: '800' }}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              {members.length > 0 ? (
                <>
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Kinek szól?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                    <Pressable onPress={() => setPersonProfileId(null)} style={[styles.option, { backgroundColor: !personProfileId ? palette.primary : palette.surfaceElevated }]}>
                      <Text style={{ color: !personProfileId ? palette.white : palette.textSecondary, fontWeight: '800' }}>Család</Text>
                    </Pressable>
                    {members.map((member) => (
                      <Pressable key={member.profile_id} onPress={() => setPersonProfileId(member.profile_id)} style={[styles.option, { backgroundColor: personProfileId === member.profile_id ? palette.primary : palette.surfaceElevated }]}>
                        <Text style={{ color: personProfileId === member.profile_id ? palette.white : palette.textSecondary, fontWeight: '800' }}>{member.nickname || member.display_name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}
              <TextInput value={scheduleTime} onChangeText={setScheduleTime} placeholder="Bevétel időpontja, például reggel 08:00" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={nextAt} onChangeText={setNextAt} placeholder="Következő bevétel: 2026-10-11 09:30" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={endsOn} onChangeText={setEndsOn} placeholder="Lejárat/vége: 2026-10-11 (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={instructions} onChangeText={setInstructions} placeholder="Utastítás vagy megjegyzés" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} multiline />
              <View style={styles.activeRow}>
                <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Aktív gyógyszer</Text>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: palette.border, true: palette.primaryLight }} thumbColor={isActive ? colors.white : undefined} />
              </View>
              {!editing && pendingItems.length > 0 ? (
                <View style={styles.batchList}>
                  <Text style={[styles.batchTitle, { color: palette.textPrimary }]}>Hozzáadásra vár ({pendingItems.length})</Text>
                  {pendingItems.map((item, index) => (
                    <View key={`${item.name}-${index}`} style={[styles.batchItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
                      <View style={[styles.batchDot, { backgroundColor: colors.pink }]} />
                      <Text numberOfLines={1} style={[styles.batchItemText, { color: palette.textPrimary }]}>{item.name}</Text>
                      <Pressable onPress={() => setPendingItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} hitSlop={8}>
                        <Ionicons name="close-circle-outline" size={20} color={palette.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.actions}>
                <Pressable onPress={() => setVisible(false)} style={styles.cancel}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
                </Pressable>
                {!editing ? (
                  <Pressable disabled={busy} onPress={addToBatch} style={[styles.addToBatch, { borderColor: palette.primary }]}>
                    <Ionicons name="add" size={17} color={palette.primary} />
                    <Text style={{ color: palette.primary, fontWeight: '900' }}>Újabb</Text>
                  </Pressable>
                ) : null}
                <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: palette.primary }]}>
                  <Text style={styles.saveText}>{busy ? 'Mentés…' : !editing && pendingItems.length > 0 ? 'Összes mentése' : 'Mentés'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 25, fontWeight: '900' },
  flex: { flex: 1 },
  searchRow: { marginHorizontal: spacing.lg, marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: { flex: 1, minHeight: 50, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg },
  searchInput: { flex: 1, fontSize: 13 },
  filterButton: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.lg },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  hero: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  heroIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 16, fontWeight: '900' },
  heroText: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  card: { minHeight: 82, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, ...shadows.card },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '900' },
  dose: { marginTop: 4, fontSize: 12 },
  meta: { marginTop: 3, fontSize: 11 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.round },
  inactiveText: { fontSize: 10, fontWeight: '900' },
  empty: { padding: spacing.xl, textAlign: 'center' },
  fab: { position: 'absolute', right: spacing.lg, bottom: 92, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: colors.primary, ...shadows.floating },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '92%', borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalContent: { padding: spacing.xl, gap: spacing.md },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  textArea: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 12, fontWeight: '900' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 38, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batchList: { gap: spacing.xs },
  batchTitle: { marginBottom: spacing.xs, fontSize: 12, fontWeight: '900' },
  batchItem: { minHeight: 44, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md },
  batchDot: { width: 8, height: 8, borderRadius: 4 },
  batchItemText: { flex: 1, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  cancel: { padding: spacing.md },
  addToBatch: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.lg },
  save: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  saveText: { color: colors.white, fontWeight: '900' },
});
