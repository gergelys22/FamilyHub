import DateTimeField from '@/components/date-time-field';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  createFamilyTask,
  deleteFamilyTask,
  getFamilyTasks,
  setFamilyTaskCompleted,
  type FamilyTask,
} from '@/services/family-content';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { formatPickerValue, parseLocalDateTime } from '@/utils/event-date-time';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ListType = FamilyTask['list_type'];

const listTypes: ListType[] = ['task', 'shopping'];

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatPickerValue(date, 'date');
}

function formatDueAt(value: string) {
  return new Date(value).toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TasksScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const styles = createStyles(palette);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [listType, setListType] = useState<ListType>('task');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [items, setItems] = useState<FamilyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [assignedToProfileId, setAssignedToProfileId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('18:00');
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const memberNameById = useMemo(
    () => new Map(members.map((member) => [member.profile_id, member.display_name])),
    [members],
  );

  const loadItems = useCallback(
    async (id = familyId, type = listType) => {
      if (!id) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        setItems(await getFamilyTasks(id, type));
      } catch (error) {
        Alert.alert('Betöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
      } finally {
        setLoading(false);
      }
    },
    [familyId, listType],
  );

  const loadContext = useCallback(async () => {
    setNowMs(Date.now());
    setLoading(true);
    try {
      const families = await getMyFamilies();
      const id = families[0]?.id ?? null;
      setFamilyId(id);

      if (!id) {
        setMembers([]);
        setItems([]);
        return;
      }

      const [nextMembers, nextItems] = await Promise.all([
        getFamilyMembers(id),
        getFamilyTasks(id, listType),
      ]);
      setMembers(nextMembers);
      setItems(nextItems);
    } catch (error) {
      Alert.alert('Hiba', error instanceof Error ? error.message : 'A családi adatok betöltése sikertelen.');
    } finally {
      setLoading(false);
    }
  }, [listType]);

  useFocusEffect(
    useCallback(() => {
      void loadContext();
    }, [loadContext]),
  );

  function switchList(type: ListType) {
    setListType(type);
    void loadItems(familyId, type);
  }

  function openCreateForm() {
    setTitle('');
    setDetail('');
    setQuantity('');
    setAssignedToProfileId(profile?.id ?? null);
    setDueDate(listType === 'task' ? defaultDueDate() : '');
    setDueTime('18:00');
    setVisible(true);
  }

  async function save() {
    if (!familyId || !profile?.id || !title.trim()) {
      Alert.alert('Hiányzó adat', 'Adj meg egy címet.');
      return;
    }

    const parsedDueAt =
      listType === 'task' && dueDate ? parseLocalDateTime(dueDate, dueTime || '18:00') : null;

    if (listType === 'task' && dueDate && !parsedDueAt) {
      Alert.alert('Hibás határidő', 'Ellenőrizd a dátumot és az időpontot.');
      return;
    }

    setBusy(true);
    try {
      await createFamilyTask({
        familyId,
        profileId: profile.id,
        assignedToProfileId: listType === 'task' ? assignedToProfileId : null,
        listType,
        title,
        detail,
        quantity,
        dueAt: parsedDueAt?.toISOString() ?? null,
      });
      setVisible(false);
      await loadItems(familyId, listType);
    } catch (error) {
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: FamilyTask) {
    try {
      await setFamilyTaskCompleted(item.id, !item.completed);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, completed: !entry.completed } : entry)),
      );
    } catch (error) {
      Alert.alert('Frissítés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    }
  }

  function remove(item: FamilyTask) {
    Alert.alert('Elem törlése', `Törlöd: ${item.title}?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deleteFamilyTask(item.id)
            .then(() => loadItems())
            .catch((error) => Alert.alert('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.')),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Vissza">
          <Ionicons name="chevron-back" size={25} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{listType === 'task' ? 'Teendők' : 'Bevásárlólista'}</Text>
        <Ionicons name={listType === 'task' ? 'checkmark-circle-outline' : 'cart-outline'} size={23} color={palette.primary} />
      </View>

      <View style={styles.tabs}>
        {listTypes.map((type) => (
          <Pressable key={type} onPress={() => switchList(type)} style={[styles.tab, listType === type && styles.tabActive]}>
            <Ionicons name={type === 'task' ? 'checkmark-circle-outline' : 'cart-outline'} size={18} color={listType === type ? palette.white : palette.textSecondary} />
            <Text style={[styles.tabText, { color: listType === type ? palette.white : palette.textSecondary }]}>{type === 'task' ? 'Teendők' : 'Bevásárlás'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Ionicons name={listType === 'task' ? 'sparkles-outline' : 'basket-outline'} size={27} color={palette.primary} />
          <View style={styles.flex}>
            <Text style={styles.summaryTitle}>{listType === 'task' ? 'Közös családi teendők' : 'Közös bevásárlólista'}</Text>
            <Text style={styles.summaryText}>{items.filter((item) => !item.completed).length} nyitott elem</Text>
          </View>
        </View>

        {loading ? (
          <Text style={styles.empty}>Betöltés...</Text>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{listType === 'task' ? 'Még nincs közös teendő.' : 'Még üres a bevásárlólista.'}</Text>
        ) : (
          items.map((item) => {
            const assigneeName = item.assigned_to_profile_id ? memberNameById.get(item.assigned_to_profile_id) : null;
            const overdue = Boolean(item.due_at && !item.completed && new Date(item.due_at).getTime() < nowMs);

            return (
              <Pressable key={item.id} onPress={() => void toggle(item)} onLongPress={() => remove(item)} style={styles.card}>
                <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
                  {item.completed ? <Ionicons name="checkmark" size={18} color={palette.white} /> : null}
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, item.completed && styles.completed]}>{item.title}</Text>
                  <View style={styles.metaRows}>
                    {item.quantity ? <Text style={styles.meta}>Mennyiség: {item.quantity}</Text> : null}
                    {assigneeName ? <Text style={styles.meta}>Felelős: {assigneeName}</Text> : null}
                    {item.due_at ? <Text style={[styles.meta, overdue && styles.overdue]}>Határidő: {formatDueAt(item.due_at)}</Text> : null}
                    {item.detail ? <Text style={styles.meta}>{item.detail}</Text> : null}
                  </View>
                </View>
                <Ionicons name="ellipsis-vertical" size={19} color={palette.textMuted} />
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable onPress={openCreateForm} style={styles.fab} accessibilityLabel="Új elem hozzáadása">
        <Ionicons name="add" size={31} color={palette.white} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{listType === 'task' ? 'Új teendő' : 'Új bevásárlási tétel'}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder={listType === 'task' ? 'Mit kell elintézni?' : 'Mit kell megvenni?'} placeholderTextColor={palette.textMuted} style={styles.input} />
            {listType === 'shopping' ? <TextInput value={quantity} onChangeText={setQuantity} placeholder="Mennyiség (opcionális)" placeholderTextColor={palette.textMuted} style={styles.input} /> : null}

            {listType === 'task' ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Felelős</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assigneeOptions}>
                    <Pressable onPress={() => setAssignedToProfileId(null)} style={[styles.assigneeChip, !assignedToProfileId && styles.assigneeChipSelected]}>
                      <Text style={[styles.assigneeText, !assignedToProfileId && styles.assigneeTextSelected]}>Nincs felelős</Text>
                    </Pressable>
                    {members.map((member) => {
                      const selected = assignedToProfileId === member.profile_id;
                      return (
                        <Pressable key={member.profile_id} onPress={() => setAssignedToProfileId(member.profile_id)} style={[styles.assigneeChip, selected && styles.assigneeChipSelected]}>
                          <Text style={[styles.assigneeText, selected && styles.assigneeTextSelected]}>{member.display_name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.dueRow}>
                  <View style={styles.flex}>
                    <DateTimeField label="Határidő" mode="date" value={dueDate} onChange={setDueDate} disabled={busy} clearable />
                  </View>
                  <View style={styles.timeField}>
                    <DateTimeField label="Idő" mode="time" value={dueTime} onChange={setDueTime} disabled={busy || !dueDate} />
                  </View>
                </View>
              </>
            ) : null}

            <TextInput value={detail} onChangeText={setDetail} placeholder="Megjegyzés (opcionális)" placeholderTextColor={palette.textMuted} style={styles.input} />
            <View style={styles.actions}>
              <Pressable onPress={() => setVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>Mégse</Text></Pressable>
              <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, busy && styles.disabled]}><Text style={styles.saveText}>{busy ? 'Mentés...' : 'Hozzáadás'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(palette: typeof colors | typeof darkColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.background },
    header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: palette.surface },
    title: { color: palette.textPrimary, fontSize: 25, fontWeight: '900' },
    tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    tab: { flex: 1, minHeight: 44, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: palette.surfaceElevated },
    tabActive: { backgroundColor: palette.primary },
    tabText: { fontSize: 13, fontWeight: '900' },
    content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
    summary: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl, backgroundColor: palette.primarySoft },
    summaryTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: '900' },
    summaryText: { color: palette.textSecondary, fontSize: 12, marginTop: 3 },
    flex: { flex: 1 },
    empty: { color: palette.textMuted, textAlign: 'center', padding: spacing.xl },
    card: { minHeight: 72, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: palette.surface, ...shadows.card },
    checkbox: { width: 28, height: 28, borderRadius: radius.sm, borderWidth: 2, borderColor: palette.borderStrong, alignItems: 'center', justifyContent: 'center' },
    checkboxDone: { borderColor: palette.success, backgroundColor: palette.success },
    cardTitle: { color: palette.textPrimary, fontSize: 14, fontWeight: '900' },
    completed: { color: palette.textMuted, textDecorationLine: 'line-through' },
    metaRows: { marginTop: 3, gap: 2 },
    meta: { color: palette.textSecondary, fontSize: 11 },
    overdue: { color: palette.warning, fontWeight: '800' },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: palette.primary, ...shadows.floating },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#172B4D99' },
    modal: { padding: spacing.xl, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: palette.surface },
    modalTitle: { color: palette.textPrimary, fontSize: 20, fontWeight: '900' },
    field: { gap: spacing.sm },
    label: { color: palette.textSecondary, fontSize: 12, fontWeight: '800' },
    input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: palette.background, color: palette.textPrimary },
    assigneeOptions: { gap: spacing.sm, paddingRight: spacing.md },
    assigneeChip: { minHeight: 38, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.background },
    assigneeChipSelected: { borderColor: palette.primary, backgroundColor: palette.primary },
    assigneeText: { color: palette.textSecondary, fontSize: 12, fontWeight: '800' },
    assigneeTextSelected: { color: palette.white },
    dueRow: { flexDirection: 'row', gap: spacing.md },
    timeField: { width: 116 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
    cancel: { padding: spacing.md },
    cancelText: { color: palette.textSecondary, fontWeight: '800' },
    save: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: palette.primary },
    saveText: { color: palette.white, fontWeight: '900' },
    disabled: { opacity: 0.55 },
  });
}
