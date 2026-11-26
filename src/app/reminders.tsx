import { ActionSheet, ConfirmDialog, type SheetAction } from '@/components/action-sheet';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';

import { ScreenCloseButton } from '@/components/screen-close-button';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getMyFamilies } from '@/services/families';
import { deleteReminder, getReminders, type Reminder, saveReminder, saveReminders } from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RemindersScreen() {
  const router = useRouter(); const { profile } = useAuth(); const [familyId, setFamilyId] = useState<string | null>(null); const [items, setItems] = useState<Reminder[]>([]); const [visible, setVisible] = useState(false); const [editing, setEditing] = useState<Reminder | null>(null); const [title, setTitle] = useState(''); const [detail, setDetail] = useState(''); const [dueAt, setDueAt] = useState(''); const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [menuTarget, setMenuTarget] = useState<Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  function notify(title: string, message: string) { setNotice({ title, message }); }
  const { isDark } = useTheme(); const palette = isDark ? darkColors : colors;
  const [pendingItems, setPendingItems] = useState<{ title: string; detail: string; dueAt: string }[]>([]);
  async function reload(id = familyId) { if (id) setItems(await getReminders(id)); }
  useEffect(() => { void getMyFamilies().then((families) => { const id = families[0]?.id ?? null; setFamilyId(id); void reload(id); }).catch((error) => notify('Hiba', error instanceof Error ? error.message : 'Próbáld újra.')); }, []);
  function openForm(item?: Reminder) {
    setEditing(item ?? null);
    setTitle(item?.title ?? '');
    setDetail(item?.detail ?? '');
    setDueAt(item ? item.due_at.slice(0, 16).replace('T', ' ') : '');
    setPendingItems([]);
    setVisible(true);
  }

  function buildCurrentItem() {
    if (!title.trim() || !dueAt.trim()) return null;
    const parsed = new Date(dueAt.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return null;
    return { title: title.trim(), detail: detail.trim(), dueAt: parsed.toISOString() };
  }

  function addToBatch() {
    if (!title.trim() || !dueAt.trim()) {
      notify('Hiányzó adat', 'Add meg a címet és az időpontot.');
      return;
    }
    const item = buildCurrentItem();
    if (!item) {
      notify('Hibás időpont', 'Használd ezt a formátumot: 2026-10-11 09:30');
      return;
    }
    setPendingItems((current) => [...current, item]);
    setTitle('');
    setDetail('');
  }

  async function save() {
    if (!familyId || !profile?.id) return;
    if (editing) {
      const item = buildCurrentItem();
      if (!item) {
        notify(!title.trim() || !dueAt.trim() ? 'Hiányzó adat' : 'Hibás időpont',
          !title.trim() || !dueAt.trim() ? 'Add meg a címet és az időpontot.' : 'Használd ezt a formátumot: 2026-10-11 09:30');
        return;
      }
      setBusy(true);
      try {
        await saveReminder({ id: editing.id, familyId, profileId: profile.id, title: item.title, detail: item.detail, dueAt: item.dueAt });
        await reload();
        setVisible(false);
      } catch (error) {
        notify('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const itemsToSave = [...pendingItems];
    if (title.trim()) {
      const current = buildCurrentItem();
      if (!current) {
        notify('Hibás időpont', 'Használd ezt a formátumot: 2026-10-11 09:30');
        return;
      }
      if (current) itemsToSave.push(current);
    }
    if (itemsToSave.length === 0) {
      notify('Hiányzó adat', 'Adj meg legalább egy emlékeztetőt.');
      return;
    }
    setBusy(true);
    try {
      await saveReminders(itemsToSave.map((item) => ({
        familyId,
        profileId: profile.id,
        title: item.title,
        detail: item.detail,
        dueAt: item.dueAt,
      })));
      await reload();
      setVisible(false);
    } catch (error) {
      notify('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }
  async function confirmDelete() {
    const item = deleteTarget;
    if (!item) return;
    setDeleteTarget(null);
    try {
      await deleteReminder(item.id);
      await reload();
    } catch (error) {
      notify('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.');
    }
  }

  const menuActions: SheetAction[] = menuTarget
    ? [
        { key: 'edit', label: 'Szerkesztés', icon: 'create-outline', onPress: () => { const item = menuTarget; setMenuTarget(null); setTimeout(() => openForm(item), 250); } },
        { key: 'delete', label: 'Törlés', icon: 'trash-outline', destructive: true, onPress: () => { const item = menuTarget; setMenuTarget(null); setTimeout(() => setDeleteTarget(item), 250); } },
      ]
    : [];

  const noticeDialog = (
    <ConfirmDialog
      visible={notice !== null}
      title={notice?.title ?? ''}
      message={notice?.message ?? ''}
      confirmLabel="Rendben"
      destructive={false}
      hideCancel
      onConfirm={() => setNotice(null)}
      onCancel={() => setNotice(null)}
      palette={palette}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Emlékeztetők</Text>
        <Ionicons name="calendar-outline" size={22} color={palette.primary} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summary, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <Ionicons name="notifications" size={26} color={colors.primary} />
          <View style={styles.flex}>
            <Text style={[styles.summaryTitle, { color: palette.textPrimary }]}>Fontos dolgok</Text>
            <Text style={[styles.summaryText, { color: palette.textSecondary }]}>Ne maradjatok le semmiről.</Text>
          </View>
          <Text style={styles.count}>{items.length}</Text>
        </View>
        {items.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: palette.surface }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title} szerkesztése`}
              onPress={() => openForm(item)}
              onLongPress={() => setMenuTarget(item)}
              style={styles.cardMain}
            >
              <View style={[styles.icon, { backgroundColor: palette.primarySoft }]}><Ionicons name="alarm-outline" size={24} color={colors.primary} /></View>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.cardText, { color: palette.textSecondary }]}>{new Date(item.due_at).toLocaleString('hu-HU')}</Text>
                {item.detail ? <Text style={[styles.meta, { color: palette.textMuted }]}>{item.detail}</Text> : null}
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title} műveletei`}
              onPress={() => setMenuTarget(item)}
              hitSlop={8}
              style={styles.moreButton}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={palette.textMuted} />
            </Pressable>
          </View>
        ))}
        {items.length === 0 ? <Text style={[styles.empty, { color: palette.textMuted }]}>Még nincs emlékeztető rögzítve.</Text> : null}
      </ScrollView>
      <Pressable onPress={() => openForm()} style={styles.fab}>
        <Ionicons name="add" size={31} color={colors.white} />
      </Pressable>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>{editing ? 'Emlékeztető szerkesztése' : 'Új emlékeztető'}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Cím" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.borderStrong }]} />
            <TextInput value={detail} onChangeText={setDetail} placeholder="Részletek (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.borderStrong }]} />
            <TextInput value={dueAt} onChangeText={setDueAt} placeholder="2026-10-11 09:30" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.borderStrong }]} />
            {!editing && pendingItems.length > 0 ? (
              <View style={styles.batchList}>
                <Text style={[styles.batchTitle, { color: palette.textPrimary }]}>Hozzáadásra vár ({pendingItems.length})</Text>
                {pendingItems.map((item, index) => (
                  <View key={`${item.title}-${index}`} style={[styles.batchItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
                    <View style={[styles.batchDot, { backgroundColor: palette.primary }]} />
                    <Text numberOfLines={1} style={[styles.batchItemText, { color: palette.textPrimary }]}>{item.title}</Text>
                    <Pressable
                      accessibilityLabel={`${item.title} eltávolítása a listából`}
                      onPress={() => setPendingItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={palette.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.actions}>
              <Pressable onPress={() => setVisible(false)} style={styles.cancel}><Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text></Pressable>
              {!editing ? (
                <Pressable disabled={busy} onPress={addToBatch} style={[styles.addToBatch, { borderColor: palette.primary }]}>
                  <Ionicons name="add" size={17} color={palette.primary} />
                  <Text style={{ color: palette.primary, fontWeight: '900' }}>Újabb elem</Text>
                </Pressable>
              ) : null}
              <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: palette.primary }]}><Text style={styles.saveText}>{busy ? 'Mentés…' : !editing && pendingItems.length > 0 ? 'Összes mentése' : 'Mentés'}</Text></Pressable>
            </View>
          </View>
          {visible ? noticeDialog : null}
        </View>
      </Modal>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.title ?? ''}
        subtitle={menuTarget ? new Date(menuTarget.due_at).toLocaleString('hu-HU') : undefined}
        actions={menuActions}
        onClose={() => setMenuTarget(null)}
        palette={palette}
      />
      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Emlékeztető törlése"
        message={`Törlöd: ${deleteTarget?.title ?? ''}?`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        palette={palette}
      />
      {!visible ? noticeDialog : null}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface },
  title: { fontSize: 27, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  summary: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primarySoft },
  flex: { flex: 1 },
  summaryTitle: { fontSize: 17, fontWeight: '900' },
  summaryText: { fontSize: 12 },
  count: { color: colors.primary, fontSize: 28, fontWeight: '900' },
  card: { minHeight: 78, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.primarySoft },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  cardText: { fontSize: 12, marginTop: 4 },
  meta: { fontSize: 11, marginTop: 3 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  moreButton: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', padding: spacing.xl },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: colors.primary, ...shadows.floating },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', padding: spacing.xl, gap: spacing.md, borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.lg },
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