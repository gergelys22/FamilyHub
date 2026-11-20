import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  deleteEmergencyContact,
  getEmergencyContacts,
  saveEmergencyContact,
  saveEmergencyContacts,
  type EmergencyContact,
} from '@/services/family-content';
import { getMyFamilies } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
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

type PendingContact = {
  name: string;
  relation: string;
  phone: string;
  email: string;
  priority: number;
  isPrimary: boolean;
  notes: string;
};

export default function EmergencyContactsScreen() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [items, setItems] = useState<EmergencyContact[]>([]);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [priority, setPriority] = useState('50');
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingContact[]>([]);
  const [busy, setBusy] = useState(false);

  async function reload(id = familyId) {
    if (id) setItems(await getEmergencyContacts(id));
  }

  useEffect(() => {
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        if (id) setItems(await getEmergencyContacts(id));
      })
      .catch((error) =>
        Alert.alert('Betöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.'),
      );
  }, []);

  function openForm(item?: EmergencyContact) {
    setEditing(item ?? null);
    setName(item?.name ?? '');
    setRelation(item?.relation ?? '');
    setPhone(item?.phone ?? '');
    setEmail(item?.email ?? '');
    setPriority(String(item?.priority ?? 50));
    setIsPrimary(item?.is_primary ?? false);
    setNotes(item?.notes ?? '');
    setPendingItems([]);
    setVisible(true);
  }

  function buildCurrentItem(): PendingContact | null {
    if (!name.trim() || phone.trim().length < 3) return null;
    const parsedPriority = Number(priority);
    if (!Number.isInteger(parsedPriority) || parsedPriority < 1 || parsedPriority > 100) return null;
    return {
      name: name.trim(),
      relation: relation.trim(),
      phone: phone.trim(),
      email: email.trim(),
      priority: parsedPriority,
      isPrimary,
      notes: notes.trim(),
    } satisfies PendingContact;
  }

  function addToBatch() {
    const item = buildCurrentItem();
    if (!item) {
      Alert.alert('Hiányzó adat', 'Add meg a kapcsolattartó nevét és telefonszámát.');
      return;
    }
    setPendingItems((current) => [...current, item]);
    setName('');
    setRelation('');
    setPhone('');
    setEmail('');
    setNotes('');
  }

  async function save() {
    if (!familyId || !profile?.id) return;
    if (editing) {
      const item = buildCurrentItem();
      if (!item) {
        Alert.alert('Hiányzó adat', 'Add meg a kapcsolattartó nevét és telefonszámát.');
        return;
      }
      setBusy(true);
      try {
        await saveEmergencyContact({
          id: editing.id,
          familyId,
          profileId: profile.id,
          name: item.name,
          relation: item.relation,
          phone: item.phone,
          email: item.email,
          priority: item.priority,
          isPrimary: item.isPrimary,
          notes: item.notes,
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
      if (current) itemsToSave.push(current);
    }
    if (itemsToSave.length === 0) {
      Alert.alert('Hiányzó adat', 'Adj meg legalább egy sürgősségi kapcsolatot.');
      return;
    }
    setBusy(true);
    try {
      await saveEmergencyContacts(itemsToSave.map((item) => ({
        familyId,
        profileId: profile.id,
        name: item.name,
        relation: item.relation,
        phone: item.phone,
        email: item.email,
        priority: item.priority,
        isPrimary: item.isPrimary,
        notes: item.notes,
      })));
      await reload();
      setVisible(false);
    } catch (error) {
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  function remove(item: EmergencyContact) {
    Alert.alert('Kapcsolat törlése', `Törlöd: ${item.name}?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deleteEmergencyContact(item.id)
            .then(() => reload())
            .catch((error) =>
              Alert.alert('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.'),
            ),
      },
    ]);
  }

  async function call(phone: string) {
    const url = `tel:${phone.replace(/[^\d+]/g, '')}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Nem sikerült hívni', 'A készülék nem tudja elindítani a tárcsázást.');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Sürgősségi kapcsolatok</Text>
        <Ionicons name="call-outline" size={22} color={colors.teal} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: isDark ? '#123E3A' : '#E4F8F3', borderColor: isDark ? '#1E6258' : '#C2EADD' }]}>
          <View style={[styles.heroIcon, { backgroundColor: palette.surface }]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.teal} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>Fontos telefonszámok egy helyen</Text>
            <Text style={[styles.heroText, { color: palette.textSecondary }]}>Orvosi, családi és műszaki sürgősségi kapcsolatok.</Text>
          </View>
        </View>

        {items.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: item.is_primary ? colors.teal : palette.border }]}>
            <View style={[styles.avatar, { backgroundColor: item.is_primary ? colors.teal : palette.primarySoft }]}>
              <Text style={[styles.avatarText, { color: item.is_primary ? colors.white : palette.primary }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Pressable
              onPress={() => openForm(item)}
              onLongPress={() => remove(item)}
              style={styles.flex}
            >
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{item.name}</Text>
                {item.is_primary ? (
                  <View style={[styles.primaryBadge, { backgroundColor: colors.teal }]}>
                    <Text style={styles.primaryText}>ELSŐDLEGES</Text>
                  </View>
                ) : null}
              </View>
              {item.relation ? <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>{item.relation}</Text> : null}
              <Text style={[styles.phone, { color: palette.primary }]}>{item.phone}</Text>
              {item.notes ? <Text style={[styles.notes, { color: palette.textMuted }]}>{item.notes}</Text> : null}
            </Pressable>
            <Pressable
              onPress={() => void call(item.phone)}
              accessibilityLabel={`${item.name} felhívása`}
              style={[styles.callButton, { backgroundColor: colors.teal }]}
            >
              <Ionicons name="call" size={20} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {items.length === 0 ? <Text style={[styles.empty, { color: palette.textMuted }]}>Még nincs sürgősségi kapcsolat.</Text> : null}
      </ScrollView>

      <Pressable onPress={() => openForm()} style={styles.fab} accessibilityLabel="Új sürgősségi kapcsolat">
        <Ionicons name="add" size={31} color={colors.white} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>{editing ? 'Kapcsolat szerkesztése' : 'Új sürgősségi kapcsolat'}</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Név" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={relation} onChangeText={setRelation} placeholder="Kapcsolat, például anya vagy mentő" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={phone} onChangeText={setPhone} placeholder="Telefonszám" keyboardType="phone-pad" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={email} onChangeText={setEmail} placeholder="E-mail (opcionális)" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={priority} onChangeText={setPriority} placeholder="Prioritás 1–100" keyboardType="number-pad" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={notes} onChangeText={setNotes} placeholder="Megjegyzés, elérhetőségi idő, stb." placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} multiline />
              <View style={styles.primaryRow}>
                <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Elsődleges kapcsolat</Text>
                <Switch value={isPrimary} onValueChange={setIsPrimary} trackColor={{ false: palette.border, true: colors.teal }} thumbColor={isPrimary ? colors.white : undefined} />
              </View>
              {!editing && pendingItems.length > 0 ? (
                <View style={styles.batchList}>
                  <Text style={[styles.batchTitle, { color: palette.textPrimary }]}>Hozzáadásra vár ({pendingItems.length})</Text>
                  {pendingItems.map((item, index) => (
                    <View key={`${item.name}-${index}`} style={[styles.batchItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
                      <View style={[styles.batchDot, { backgroundColor: colors.teal }]} />
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
                  <Pressable disabled={busy} onPress={addToBatch} style={[styles.addToBatch, { borderColor: colors.teal }]}>
                    <Ionicons name="add" size={17} color={colors.teal} />
                    <Text style={{ color: colors.teal, fontWeight: '900' }}>Újabb</Text>
                  </Pressable>
                ) : null}
                <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: colors.teal }]}>
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
  title: { flex: 1, marginHorizontal: spacing.sm, textAlign: 'center', fontSize: 20, fontWeight: '900' },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  hero: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  heroIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 16, fontWeight: '900' },
  heroText: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  card: { minHeight: 92, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, ...shadows.card },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 19, fontWeight: '900' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  primaryBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.round },
  primaryText: { color: colors.white, fontSize: 8, fontWeight: '900' },
  cardMeta: { marginTop: 3, fontSize: 11 },
  phone: { marginTop: 4, fontSize: 13, fontWeight: '900' },
  notes: { marginTop: 3, fontSize: 10, lineHeight: 14 },
  callButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: spacing.xl, textAlign: 'center' },
  fab: { position: 'absolute', right: spacing.lg, bottom: 92, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: colors.teal, ...shadows.floating },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '92%', borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalContent: { padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  textArea: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
  primaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 12, fontWeight: '900' },
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
