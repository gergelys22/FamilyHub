import { ActionSheet, ConfirmDialog, type SheetAction } from '@/components/action-sheet';
import DateTimeField from '@/components/date-time-field';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import {
  createFamilyTasks,
  deleteFamilyTask,
  getFamilyTasks,
  setFamilyTaskCompleted,
  type FamilyTask,
} from '@/services/family-content';
import { updateFamilyTask } from '@/services/tasks-manage';
import { formatPickerValue, parseLocalDateTime } from '@/utils/event-date-time';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ListType = FamilyTask['list_type'];
type Palette = typeof colors | typeof darkColors;

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
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const styles = useMemo(() => createStyles(palette), [palette]);
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
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyTask | null>(null);
  const [menuTarget, setMenuTarget] = useState<FamilyTask | null>(null);
  const [editing, setEditing] = useState<FamilyTask | null>(null);

  function notify(title: string, message: string) {
    setNotice({ title, message });
  }
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pendingItems, setPendingItems] = useState<
    {
      title: string;
      detail: string;
      quantity: string;
      assignedToProfileId: string | null;
      dueAt: string | null;
    }[]
  >([]);

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
        notify('Betöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
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
      notify('Hiba', error instanceof Error ? error.message : 'A családi adatok betöltése sikertelen.');
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

  function openEditForm(item: FamilyTask) {
    setEditing(item);
    setTitle(item.title);
    setDetail(item.detail ?? '');
    setQuantity(item.quantity ?? '');
    setAssignedToProfileId(item.assigned_to_profile_id);
    if (item.due_at) {
      const due = new Date(item.due_at);
      setDueDate(formatPickerValue(due, 'date'));
      setDueTime(formatPickerValue(due, 'time'));
    } else {
      setDueDate('');
      setDueTime('18:00');
    }
    setPendingItems([]);
    setVisible(true);
  }

  function openCreateForm() {
    setEditing(null);
    setTitle('');
    setDetail('');
    setQuantity('');
    setAssignedToProfileId(profile?.id ?? null);
    setDueDate(listType === 'task' ? defaultDueDate() : '');
    setDueTime('18:00');
    setPendingItems([]);
    setVisible(true);
  }

  function buildCurrentItem() {
    const parsedDueAt =
      listType === 'task' && dueDate ? parseLocalDateTime(dueDate, dueTime || '18:00') : null;

    if (listType === 'task' && dueDate && !parsedDueAt) {
      return null;
    }

    return {
      title: title.trim(),
      detail: detail.trim(),
      quantity: quantity.trim(),
      assignedToProfileId: listType === 'task' ? assignedToProfileId : null,
      dueAt: parsedDueAt?.toISOString() ?? null,
    };
  }

  function addToBatch() {
    if (!title.trim()) {
      notify('Hiányzó adat', 'Adj meg egy címet a hozzáadni kívánt elemhez.');
      return;
    }
    const item = buildCurrentItem();
    if (!item) {
      notify('Hibás határidő', 'Ellenőrizd a dátumot és az időpontot.');
      return;
    }
    setPendingItems((current) => [...current, item]);
    setTitle('');
    setDetail('');
    setQuantity('');
  }

  async function save() {
    if (!familyId || !profile?.id) return;
    if (editing) {
      if (!title.trim()) {
        notify('Hiányzó adat', 'Adj meg egy címet.');
        return;
      }
      const edited = buildCurrentItem();
      if (!edited) {
        notify('Hibás határidő', 'Ellenőrizd a dátumot és az időpontot.');
        return;
      }
      setBusy(true);
      try {
        await updateFamilyTask(editing.id, edited);
        setVisible(false);
        setEditing(null);
        await loadItems(familyId, listType);
      } catch (error) {
        notify('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const itemsToSave = [...pendingItems];
    if (title.trim()) {
      const currentItem = buildCurrentItem();
      if (!currentItem) {
        notify('Hibás határidő', 'Ellenőrizd a dátumot és az időpontot.');
        return;
      }
      itemsToSave.push(currentItem);
    }
    if (itemsToSave.length === 0) {
      notify('Hiányzó adat', 'Adj meg legalább egy elemet a mentéshez.');
      return;
    }

    setBusy(true);
    try {
      await createFamilyTasks(
        itemsToSave.map((item) => ({
          familyId,
          profileId: profile.id,
          assignedToProfileId: item.assignedToProfileId,
          listType,
          title: item.title,
          detail: item.detail,
          quantity: item.quantity,
          dueAt: item.dueAt,
        })),
      );
      setVisible(false);
      await loadItems(familyId, listType);
    } catch (error) {
      notify('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
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
      notify('Frissítés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    }
  }

  async function confirmDelete() {
    const item = deleteTarget;
    if (!item) return;
    setDeleteTarget(null);
    try {
      await deleteFamilyTask(item.id);
      await loadItems();
    } catch (error) {
      notify('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.');
    }
  }

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          key: 'edit',
          label: 'Szerkesztés',
          icon: 'create-outline',
          onPress: () => {
            const item = menuTarget;
            setMenuTarget(null);
            setTimeout(() => openEditForm(item), 250);
          },
        },
        {
          key: 'delete',
          label: 'Törlés',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => {
            const item = menuTarget;
            setMenuTarget(null);
            setTimeout(() => setDeleteTarget(item), 250);
          },
        },
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

  const isTask = listType === 'task';
  const openItems = items.filter((item) => !item.completed);
  const doneItems = items.filter((item) => item.completed);
  const progress = items.length > 0 ? doneItems.length / items.length : 0;

  function renderItem(item: FamilyTask) {
    const assigneeName = item.assigned_to_profile_id ? memberNameById.get(item.assigned_to_profile_id) : null;
    const overdue = Boolean(item.due_at && !item.completed && new Date(item.due_at).getTime() < nowMs);

    return (
      <View
        key={item.id}
        style={[styles.card, overdue && styles.cardOverdue, item.completed && styles.cardDone]}
      >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.completed }}
        accessibilityLabel={item.title}
        onPress={() => void toggle(item)}
        onLongPress={() => setMenuTarget(item)}
        style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
      >
        <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
          {item.completed ? <Ionicons name="checkmark" size={17} color={palette.white} /> : null}
        </View>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, item.completed && styles.completed]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.detail ? (
            <Text style={styles.detail} numberOfLines={2}>
              {item.detail}
            </Text>
          ) : null}
          <View style={styles.chipRow}>
            {item.quantity ? (
              <View style={[styles.chip, { backgroundColor: `${palette.primary}1F` }]}>
                <Ionicons name="pricetag-outline" size={12} color={palette.primary} />
                <Text style={[styles.chipText, { color: palette.primary }]}>{item.quantity}</Text>
              </View>
            ) : null}
            {assigneeName ? (
              <View style={[styles.chip, { backgroundColor: palette.surfaceElevated }]}>
                <View style={styles.miniAvatar}>
                  <Text style={styles.miniAvatarText}>
                    {assigneeName.charAt(0).toLocaleUpperCase('hu-HU')}
                  </Text>
                </View>
                <Text style={[styles.chipText, { color: palette.textSecondary }]}>{assigneeName}</Text>
              </View>
            ) : null}
            {item.due_at ? (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: overdue ? `${palette.warning}26` : palette.surfaceElevated },
                ]}
              >
                <Ionicons
                  name={overdue ? 'alarm' : 'time-outline'}
                  size={12}
                  color={overdue ? palette.warning : palette.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: overdue ? palette.warning : palette.textSecondary },
                  ]}
                >
                  {formatDueAt(item.due_at)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title} műveletei`}
        onPress={() => setMenuTarget(item)}
        hitSlop={10}
        style={styles.deleteButton}
      >
        <Ionicons name="ellipsis-vertical" size={19} color={palette.textMuted} />
      </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={styles.title}>{isTask ? 'Teendők' : 'Bevásárlólista'}</Text>
        <View style={styles.headerIcon}>
          <Ionicons
            name={isTask ? 'checkmark-done' : 'cart'}
            size={21}
            color={palette.primary}
          />
        </View>
      </View>

      <View style={styles.tabs}>
        {listTypes.map((type) => {
          const active = listType === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => switchList(type)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons
                name={type === 'task' ? 'checkmark-circle-outline' : 'cart-outline'}
                size={18}
                color={active ? palette.white : palette.textSecondary}
              />
              <Text style={[styles.tabText, { color: active ? palette.white : palette.textSecondary }]}>
                {type === 'task' ? 'Teendők' : 'Bevásárlás'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={isDark ? ['#1B4FC4', '#12307A'] : ['#2F6BFF', '#1B3FD8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name={isTask ? 'sparkles' : 'basket'} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.heroTitle}>{isTask ? 'Közös családi teendők' : 'Közös bevásárlólista'}</Text>
              <Text style={styles.heroText}>
                {openItems.length} nyitott · {doneItems.length} kész
              </Text>
            </View>
            <Text style={styles.heroPercent}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={palette.primary} style={styles.loader} />
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={isTask ? 'checkmark-done-outline' : 'basket-outline'}
                size={30}
                color={palette.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {isTask ? 'Még nincs közös teendő' : 'Még üres a bevásárlólista'}
            </Text>
            <Text style={styles.emptyText}>Az alsó + gombbal adhatsz hozzá új elemet.</Text>
          </View>
        ) : (
          <>
            {openItems.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Nyitott</Text>
                {openItems.map(renderItem)}
              </>
            ) : (
              <View style={styles.allDone}>
                <Ionicons name="happy-outline" size={22} color={palette.success} />
                <Text style={styles.allDoneText}>Minden elem kész, szép munka!</Text>
              </View>
            )}
            {doneItems.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Kész</Text>
                {doneItems.map(renderItem)}
              </>
            ) : null}
            <Text style={styles.hint}>Koppints a pipához a kipipáláshoz, a ⋮ gombbal szerkesztheted vagy törölheted.</Text>
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={openCreateForm}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + spacing.lg }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Új elem hozzáadása"
      >
        <Ionicons name="add" size={31} color={palette.white} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.overlayDismiss} onPress={() => setVisible(false)} />
          <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name={isTask ? 'checkmark-done' : 'cart'} size={20} color={palette.primary} />
              </View>
              <Text style={styles.modalTitle}>{editing ? (isTask ? 'Teendő szerkesztése' : 'Tétel szerkesztése') : isTask ? 'Új teendő' : 'Új bevásárlási tétel'}</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={isTask ? 'Mit kell elintézni?' : 'Mit kell megvenni?'}
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              {!isTask ? (
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Mennyiség (opcionális)"
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                />
              ) : null}

              {isTask ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Felelős</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.assigneeOptions}
                      keyboardShouldPersistTaps="handled"
                    >
                      <Pressable
                        onPress={() => setAssignedToProfileId(null)}
                        style={[styles.assigneeChip, !assignedToProfileId && styles.assigneeChipSelected]}
                      >
                        <Text style={[styles.assigneeText, !assignedToProfileId && styles.assigneeTextSelected]}>
                          Nincs felelős
                        </Text>
                      </Pressable>
                      {members.map((member) => {
                        const selected = assignedToProfileId === member.profile_id;
                        return (
                          <Pressable
                            key={member.profile_id}
                            onPress={() => setAssignedToProfileId(member.profile_id)}
                            style={[styles.assigneeChip, selected && styles.assigneeChipSelected]}
                          >
                            <Text style={[styles.assigneeText, selected && styles.assigneeTextSelected]}>
                              {member.display_name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.dueRow}>
                    <View style={styles.flex}>
                      <DateTimeField
                        label="Határidő"
                        mode="date"
                        value={dueDate}
                        onChange={setDueDate}
                        disabled={busy}
                        clearable
                      />
                    </View>
                    <View style={styles.timeField}>
                      <DateTimeField
                        label="Idő"
                        mode="time"
                        value={dueTime}
                        onChange={setDueTime}
                        disabled={busy || !dueDate}
                      />
                    </View>
                  </View>
                </>
              ) : null}

              <TextInput
                value={detail}
                onChangeText={setDetail}
                placeholder="Megjegyzés (opcionális)"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />

              {pendingItems.length > 0 ? (
                <View style={styles.batchList}>
                  <Text style={styles.batchTitle}>Hozzáadásra vár ({pendingItems.length})</Text>
                  {pendingItems.map((item, index) => (
                    <View key={`${item.title}-${index}`} style={styles.batchItem}>
                      <View style={styles.batchDot} />
                      <Text numberOfLines={1} style={styles.batchItemText}>
                        {item.title}
                      </Text>
                      <Pressable
                        accessibilityLabel={`${item.title} eltávolítása a listából`}
                        onPress={() =>
                          setPendingItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                        hitSlop={8}
                      >
                        <Ionicons name="close-circle" size={20} color={palette.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.actions}>
              <Pressable onPress={() => setVisible(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Mégse</Text>
              </Pressable>
              {!editing ? (
                <Pressable disabled={busy} onPress={addToBatch} style={styles.addToBatch}>
                  <Ionicons name="add" size={17} color={palette.primary} />
                  <Text style={styles.addToBatchText}>Újabb elem</Text>
                </Pressable>
              ) : null}
              <Pressable
                disabled={busy}
                onPress={() => void save()}
                style={[styles.save, busy && styles.disabled]}
              >
                <Text style={styles.saveText}>
                  {busy ? 'Mentés...' : editing ? 'Mentés' : pendingItems.length > 0 ? 'Összes mentése' : 'Hozzáadás'}
                </Text>
              </Pressable>
            </View>
          </View>
          {visible ? noticeDialog : null}
        </KeyboardAvoidingView>
      </Modal>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.title ?? ''}
        subtitle={isTask ? 'Teendő' : 'Bevásárlási tétel'}
        actions={menuActions}
        onClose={() => setMenuTarget(null)}
        palette={palette}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Elem törlése"
        message={`Törlöd: ${deleteTarget?.title ?? ''}?`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        palette={palette}
      />
      {!visible ? noticeDialog : null}
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.background },
    flex: { flex: 1 },
    header: {
      minHeight: 64,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { color: palette.textPrimary, fontSize: 25, fontWeight: '900', letterSpacing: -0.4 },
    headerIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 21,
      backgroundColor: palette.primarySoft,
    },
    tabs: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: 4,
      flexDirection: 'row',
      gap: 4,
      borderRadius: radius.round,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
    },
    tab: {
      flex: 1,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: radius.round,
    },
    tabActive: { backgroundColor: palette.primary, ...shadows.floating },
    tabText: { fontSize: 13, fontWeight: '900' },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md },
    hero: {
      padding: spacing.lg,
      gap: spacing.md,
      borderRadius: radius.xl,
      overflow: 'hidden',
      ...shadows.floating,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    heroIcon: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    heroTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    heroText: { marginTop: 3, color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' },
    heroPercent: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    progressTrack: {
      height: 8,
      overflow: 'hidden',
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
    loader: { paddingVertical: spacing.xl },
    sectionTitle: {
      marginTop: spacing.xs,
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    card: {
      minHeight: 72,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      ...shadows.card,
    },
    cardOverdue: { borderColor: `${palette.warning}66` },
    cardDone: { opacity: 0.72 },
    checkbox: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 2,
      borderColor: palette.borderStrong,
    },
    checkboxDone: { borderColor: palette.success, backgroundColor: palette.success },
    cardTitle: { color: palette.textPrimary, fontSize: 15, fontWeight: '900' },
    completed: { color: palette.textMuted, textDecorationLine: 'line-through' },
    detail: { marginTop: 3, color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
    chipRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.round,
    },
    chipText: { fontSize: 11, fontWeight: '800' },
    miniAvatar: {
      width: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: '#C9D8E5',
    },
    miniAvatarText: { color: '#243447', fontSize: 9, fontWeight: '900' },
    cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    deleteButton: { padding: 8 },
    allDone: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: `${palette.success}1F`,
    },
    allDoneText: { color: palette.success, fontSize: 13, fontWeight: '900' },
    hint: { color: palette.textMuted, fontSize: 11, textAlign: 'center' },
    emptyCard: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: palette.borderStrong,
      backgroundColor: palette.surface,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 32,
      backgroundColor: palette.primarySoft,
    },
    emptyTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: '900', textAlign: 'center' },
    emptyText: { color: palette.textMuted, fontSize: 13, textAlign: 'center' },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      width: 58,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 29,
      backgroundColor: palette.primary,
      ...shadows.floating,
    },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#172B4D99' },
    overlayDismiss: { flex: 1 },
    modal: {
      maxHeight: '90%',
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: palette.surface,
    },
    grabber: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: palette.borderStrong,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    modalIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 19,
      backgroundColor: palette.primarySoft,
    },
    modalTitle: { color: palette.textPrimary, fontSize: 20, fontWeight: '900' },
    modalBody: { gap: spacing.md },
    field: { gap: spacing.sm },
    label: { color: palette.textSecondary, fontSize: 12, fontWeight: '800' },
    input: {
      minHeight: 50,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
      color: palette.textPrimary,
    },
    assigneeOptions: { gap: spacing.sm, paddingRight: spacing.md },
    assigneeChip: {
      minHeight: 38,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.round,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
    },
    assigneeChipSelected: { borderColor: palette.primary, backgroundColor: palette.primary },
    assigneeText: { color: palette.textSecondary, fontSize: 12, fontWeight: '800' },
    assigneeTextSelected: { color: palette.white },
    dueRow: { flexDirection: 'row', gap: spacing.md },
    timeField: { width: 116 },
    batchList: { gap: spacing.xs },
    batchTitle: { marginBottom: spacing.xs, color: palette.textPrimary, fontSize: 12, fontWeight: '900' },
    batchItem: {
      minHeight: 44,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.md,
      backgroundColor: palette.background,
    },
    batchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary },
    batchItemText: { flex: 1, color: palette.textPrimary, fontSize: 12, fontWeight: '800' },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cancel: { padding: spacing.md },
    cancelText: { color: palette.textSecondary, fontWeight: '800' },
    addToBatch: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: palette.primary,
      borderRadius: radius.lg,
    },
    addToBatchText: { color: palette.primary, fontWeight: '900' },
    save: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: palette.primary,
    },
    saveText: { color: palette.white, fontWeight: '900' },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  });
}