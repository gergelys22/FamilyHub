import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { getMyFamilies } from '@/services/families';
import {
  createFamilyTask,
  deleteFamilyTask,
  getFamilyTasks,
  setFamilyTaskCompleted,
  type FamilyTask,
} from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ListType = FamilyTask['list_type'];

export default function TasksScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const styles = createStyles(palette);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [listType, setListType] = useState<ListType>('task');
  const [items, setItems] = useState<FamilyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload(id = familyId, type = listType) {
    if (!id) return;
    setLoading(true);
    try {
      setItems(await getFamilyTasks(id, type));
    } catch (error) {
      Alert.alert('Betöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void getMyFamilies()
      .then((families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        void reload(id, listType);
      })
      .catch((error) => Alert.alert('Hiba', error instanceof Error ? error.message : 'A családok betöltése sikertelen.'));
  }, []);

  function switchList(type: ListType) {
    setListType(type);
    void reload(familyId, type);
  }

  async function save() {
    if (!familyId || !profile?.id || !title.trim()) {
      Alert.alert('Hiányzó adat', 'Adj meg egy címet.');
      return;
    }
    setBusy(true);
    try {
      await createFamilyTask({ familyId, profileId: profile.id, listType, title, detail, quantity });
      setTitle('');
      setDetail('');
      setQuantity('');
      setVisible(false);
      await reload();
    } catch (error) {
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: FamilyTask) {
    try {
      await setFamilyTaskCompleted(item.id, !item.completed);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry));
    } catch (error) {
      Alert.alert('Frissítés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    }
  }

  function remove(item: FamilyTask) {
    Alert.alert('Elem törlése', `Törlöd: ${item.title}?`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => void deleteFamilyTask(item.id).then(() => reload()).catch((error) => Alert.alert('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.')) },
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
        {(['task', 'shopping'] as const).map((type) => (
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
        {loading ? <Text style={styles.empty}>Betöltés…</Text> : items.length === 0 ? <Text style={styles.empty}>{listType === 'task' ? 'Még nincs közös teendő.' : 'Még üres a bevásárlólista.'}</Text> : items.map((item) => (
          <Pressable key={item.id} onPress={() => void toggle(item)} onLongPress={() => remove(item)} style={styles.card}>
            <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
              {item.completed ? <Ionicons name="checkmark" size={18} color={palette.white} /> : null}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, item.completed && styles.completed]}>{item.title}</Text>
              {item.quantity ? <Text style={styles.meta}>Mennyiség: {item.quantity}</Text> : null}
              {item.detail ? <Text style={styles.meta}>{item.detail}</Text> : null}
            </View>
            <Ionicons name="ellipsis-vertical" size={19} color={palette.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => setVisible(true)} style={styles.fab} accessibilityLabel="Új elem hozzáadása">
        <Ionicons name="add" size={31} color={palette.white} />
      </Pressable>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{listType === 'task' ? 'Új teendő' : 'Új bevásárlási tétel'}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder={listType === 'task' ? 'Mit kell elintézni?' : 'Mit kell megvenni?'} placeholderTextColor={palette.textMuted} style={styles.input} />
            {listType === 'shopping' ? <TextInput value={quantity} onChangeText={setQuantity} placeholder="Mennyiség (opcionális)" placeholderTextColor={palette.textMuted} style={styles.input} /> : null}
            <TextInput value={detail} onChangeText={setDetail} placeholder="Megjegyzés (opcionális)" placeholderTextColor={palette.textMuted} style={styles.input} />
            <View style={styles.actions}>
              <Pressable onPress={() => setVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>Mégse</Text></Pressable>
              <Pressable disabled={busy} onPress={() => void save()} style={styles.save}><Text style={styles.saveText}>{busy ? 'Mentés…' : 'Hozzáadás'}</Text></Pressable>
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
    meta: { color: palette.textSecondary, fontSize: 11, marginTop: 3 },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: palette.primary, ...shadows.floating },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#172B4D99' },
    modal: { padding: spacing.xl, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: palette.surface },
    modalTitle: { color: palette.textPrimary, fontSize: 20, fontWeight: '900' },
    input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: palette.background, color: palette.textPrimary },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
    cancel: { padding: spacing.md },
    cancelText: { color: palette.textSecondary, fontWeight: '800' },
    save: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: palette.primary },
    saveText: { color: palette.white, fontWeight: '900' },
  });
}
