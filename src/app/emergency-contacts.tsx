
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getMyFamilies } from '@/services/families';
import {
  deleteEmergencyContact,
  getEmergencyContacts,
  saveEmergencyContact,
  saveEmergencyContacts,
  type EmergencyContact,
} from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;

type PendingContact = {
  name: string;
  relation: string;
  phone: string;
  email: string;
  priority: number;
  isPrimary: boolean;
  notes: string;
};

const quickNumbers = [
  { number: '112', label: 'Segélyhívó', icon: 'alert-circle' as const, color: '#E5384F' },
  { number: '104', label: 'Mentők', icon: 'medkit' as const, color: '#F56C9A' },
  { number: '105', label: 'Tűzoltók', icon: 'flame' as const, color: '#F59E0B' },
  { number: '107', label: 'Rendőrség', icon: 'shield' as const, color: '#5B8CFF' },
];

const relationOptions: [string, string][] = [
  ['all', 'Mind'],
  ['orvos', 'Orvos'],
  ['mentő', 'Mentő'],
  ['család', 'Család'],
  ['műszaki', 'Műszaki'],
  ['egyesület', 'Egyéb szervezet'],
];

function createStyles(palette: Palette, isDark: boolean) {
  const teal = colors.teal;

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
    title: {
      flex: 1,
      marginHorizontal: spacing.sm,
      color: palette.textPrimary,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    headerIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 21,
      backgroundColor: isDark ? '#123E3A' : '#E4F8F3',
    },
    searchRow: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    search: {
      flex: 1,
      minHeight: 50,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.surface,
    },
    searchInput: { flex: 1, color: palette.textPrimary, fontSize: 14 },
    filterButton: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.surface,
    },
    filterButtonActive: {
      borderColor: teal,
      backgroundColor: isDark ? '#123E3A' : '#E4F8F3',
    },
    filterBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      backgroundColor: teal,
    },
    filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md },
    loader: { paddingVertical: spacing.xl },
    hero: {
      padding: spacing.lg,
      gap: spacing.md,
      borderRadius: radius.xl,
      overflow: 'hidden',
      ...shadows.floating,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    heroIcon: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    heroTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    heroText: {
      marginTop: 3,
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      lineHeight: 17,
    },
    quickRow: { flexDirection: 'row', gap: spacing.sm },
    quickButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      gap: 3,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    quickNumber: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    quickLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '800' },
    resultText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
    card: {
      minHeight: 92,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.surface,
      ...shadows.card,
    },
    cardPrimary: { borderColor: teal, borderWidth: 1.5 },
    avatar: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 26,
      backgroundColor: palette.primarySoft,
    },
    avatarPrimary: { backgroundColor: teal },
    avatarText: { color: palette.primary, fontSize: 20, fontWeight: '900' },
    avatarTextPrimary: { color: '#FFFFFF' },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    cardTitle: { color: palette.textPrimary, fontSize: 15, fontWeight: '900' },
    primaryBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderRadius: radius.round,
      backgroundColor: teal,
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    relationChip: {
      alignSelf: 'flex-start',
      marginTop: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.round,
      backgroundColor: palette.surfaceElevated,
    },
    relationText: { color: palette.textSecondary, fontSize: 11, fontWeight: '800' },
    phone: { marginTop: 6, color: palette.primary, fontSize: 14, fontWeight: '900' },
    notes: { marginTop: 4, color: palette.textMuted, fontSize: 11, lineHeight: 15 },
    cardActions: { alignItems: 'center', gap: 10 },
    callButton: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 23,
      backgroundColor: teal,
      ...shadows.floating,
    },
    deleteButton: { padding: 2 },
    emptyCard: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: palette.borderStrong,
      borderRadius: radius.xl,
      backgroundColor: palette.surface,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 32,
      backgroundColor: isDark ? '#123E3A' : '#E4F8F3',
    },
    emptyTitle: {
      color: palette.textPrimary,
      fontSize: 15,
      fontWeight: '900',
      textAlign: 'center',
    },
    emptyText: { color: palette.textMuted, fontSize: 12, textAlign: 'center' },
    clearLink: { marginTop: 4, padding: 6 },
    clearLinkText: { color: teal, fontSize: 13, fontWeight: '900' },
    hint: { color: palette.textMuted, fontSize: 11, textAlign: 'center' },
    pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      width: 58,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 29,
      backgroundColor: teal,
      ...shadows.floating,
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)',
    },
    overlayDismiss: { flex: 1 },
    modal: {
      maxHeight: '92%',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderColor: palette.border,
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
    modalHeader: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    modalIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 19,
      backgroundColor: isDark ? '#123E3A' : '#E4F8F3',
    },
    modalTitle: { flex: 1, color: palette.textPrimary, fontSize: 20, fontWeight: '900' },
    modalContent: { padding: spacing.xl, gap: spacing.md },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    option: {
      minHeight: 38,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.round,
      backgroundColor: palette.surfaceElevated,
    },
    optionActive: { backgroundColor: teal },
    optionText: { color: palette.textSecondary, fontSize: 13, fontWeight: '800' },
    optionTextActive: { color: '#FFFFFF' },
    fieldLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: '900' },
    input: {
      minHeight: 50,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.background,
      color: palette.textPrimary,
    },
    textArea: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
    primaryRow: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.background,
    },
    primaryRowTitle: { color: palette.textPrimary, fontSize: 13, fontWeight: '900' },
    primaryRowText: { marginTop: 3, color: palette.textMuted, fontSize: 11 },
    batchList: { gap: spacing.xs },
    batchTitle: {
      marginBottom: spacing.xs,
      color: palette.textPrimary,
      fontSize: 12,
      fontWeight: '900',
    },
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
    batchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: teal },
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
      borderColor: teal,
      borderRadius: radius.lg,
    },
    addToBatchText: { color: teal, fontWeight: '900' },
    save: {
      minHeight: 48,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg,
      backgroundColor: teal,
    },
    saveText: { color: '#FFFFFF', fontWeight: '900' },
    disabled: { opacity: 0.55 },
  });
}

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  const [loading, setLoading] = useState(true);
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
  const [search, setSearch] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [primaryFilter, setPrimaryFilter] = useState<'all' | 'primary' | 'regular'>('all');
  const [relationFilter, setRelationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'priority' | 'newest'>('priority');

  async function reload(id = familyId) {
    if (id) setItems(await getEmergencyContacts(id));
  }

  useEffect(() => {
    let active = true;

    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        if (!active) return;

        setFamilyId(id);

        if (id) {
          const loaded = await getEmergencyContacts(id);
          if (active) setItems(loaded);
        }
      })
      .catch((error) => {
        if (active) {
          Alert.alert(
            'Betöltés sikertelen',
            error instanceof Error ? error.message : 'Próbáld újra.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('hu-HU');

    return [...items]
      .filter((item) => {
        const haystack = `${item.name} ${item.relation ?? ''} ${item.phone} ${item.email ?? ''} ${item.notes ?? ''}`;

        if (!haystack.toLocaleLowerCase('hu-HU').includes(needle)) return false;
        if (primaryFilter === 'primary' && !item.is_primary) return false;
        if (primaryFilter === 'regular' && item.is_primary) return false;

        if (
          relationFilter !== 'all' &&
          (item.relation ?? '').toLocaleLowerCase('hu-HU') !== relationFilter
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'hu');
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.priority - b.priority;
      });
  }, [items, search, primaryFilter, relationFilter, sortBy]);

  const activeFilterCount =
    (primaryFilter !== 'all' ? 1 : 0) +
    (relationFilter !== 'all' ? 1 : 0) +
    (sortBy !== 'priority' ? 1 : 0);

  function clearFilters() {
    setPrimaryFilter('all');
    setRelationFilter('all');
    setSortBy('priority');
    setSearch('');
  }

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
    if (!Number.isInteger(parsedPriority) || parsedPriority < 1 || parsedPriority > 100) {
      return null;
    }

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
        Alert.alert(
          'Mentés sikertelen',
          error instanceof Error ? error.message : 'Próbáld újra.',
        );
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
      await saveEmergencyContacts(
        itemsToSave.map((item) => ({
          familyId,
          profileId: profile.id,
          name: item.name,
          relation: item.relation,
          phone: item.phone,
          email: item.email,
          priority: item.priority,
          isPrimary: item.isPrimary,
          notes: item.notes,
        })),
      );

      await reload();
      setVisible(false);
    } catch (error) {
      Alert.alert(
        'Mentés sikertelen',
        error instanceof Error ? error.message : 'Próbáld újra.',
      );
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
              Alert.alert(
                'Hiba',
                error instanceof Error ? error.message : 'A törlés sikertelen.',
              ),
            ),
      },
    ]);
  }

  async function call(number: string) {
    const url = `tel:${number.replace(/[^\d+]/g, '')}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Nem sikerült hívni', 'A készülék nem tudja elindítani a tárcsázást.');
    }
  }

  const tealGradient: [string, string] = isDark
    ? ['#157A6C', '#0E4A43']
    : ['#20BFA7', '#0F8F7B'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={styles.title} numberOfLines={1}>
          Sürgősségi kapcsolatok
        </Text>
        <View style={styles.headerIcon}>
          <Ionicons name="call" size={20} color={colors.teal} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.teal} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Kapcsolat keresése..."
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityLabel="Keresés törlése"
            >
              <Ionicons name="close-circle" size={18} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kapcsolat szűrők"
          onPress={() => setFilterVisible(true)}
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
        >
          <Ionicons name="options-outline" size={21} color={colors.teal} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={tealGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={27} color="#FFFFFF" />
            </View>

            <View style={styles.flex}>
              <Text style={styles.heroTitle}>Fontos telefonszámok egy helyen</Text>
              <Text style={styles.heroText}>
                Orvosi, családi és műszaki sürgősségi kapcsolatok.
              </Text>
            </View>
          </View>

          <View style={styles.quickRow}>
            {quickNumbers.map((item) => (
              <Pressable
                key={item.number}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} hívása: ${item.number}`}
                onPress={() => void call(item.number)}
                style={({ pressed }) => [
                  styles.quickButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={item.icon} size={18} color="#FFFFFF" />
                <Text style={styles.quickNumber}>{item.number}</Text>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={styles.loader} />
        ) : null}

        {!loading && items.length > 0 ? (
          <Text style={styles.resultText}>
            {visibleItems.length === items.length
              ? `${items.length} kapcsolat`
              : `${visibleItems.length} találat, összesen ${items.length} kapcsolat`}
          </Text>
        ) : null}

        {visibleItems.map((item) => (
          <View
            key={item.id}
            style={[styles.card, item.is_primary && styles.cardPrimary]}
          >
            <View style={[styles.avatar, item.is_primary && styles.avatarPrimary]}>
              <Text
                style={[
                  styles.avatarText,
                  item.is_primary && styles.avatarTextPrimary,
                ]}
              >
                {item.name.charAt(0).toLocaleUpperCase('hu-HU')}
              </Text>
            </View>

            <Pressable
              style={styles.flex}
              onPress={() => openForm(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} szerkesztése`}
            >
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>

                {item.is_primary ? (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="star" size={8} color="#FFFFFF" />
                    <Text style={styles.primaryText}>ELSŐDLEGES</Text>
                  </View>
                ) : null}
              </View>

              {item.relation ? (
                <View style={styles.relationChip}>
                  <Text style={styles.relationText}>{item.relation}</Text>
                </View>
              ) : null}

              <Text style={styles.phone}>{item.phone}</Text>

              {item.notes ? (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}
            </Pressable>

            <View style={styles.cardActions}>
              <Pressable
                onPress={() => void call(item.phone)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} felhívása`}
                style={({ pressed }) => [
                  styles.callButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={() => remove(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} törlése`}
                hitSlop={10}
                style={styles.deleteButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={palette.textMuted}
                />
              </Pressable>
            </View>
          </View>
        ))}

        {!loading && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={30} color={colors.teal} />
            </View>
            <Text style={styles.emptyTitle}>
              Még nincs sürgősségi kapcsolat
            </Text>
            <Text style={styles.emptyText}>
              Az alsó + gombbal adhatod meg az első fontos telefonszámot.
            </Text>
          </View>
        ) : null}

        {!loading && items.length > 0 && visibleItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={30} color={palette.textMuted} />
            <Text style={styles.emptyTitle}>Nincs találat</Text>
            <Text style={styles.emptyText}>
              A keresésnek vagy a szűrőknek nem felel meg egy kapcsolat sem.
            </Text>
            <Pressable onPress={clearFilters} style={styles.clearLink}>
              <Text style={styles.clearLinkText}>Szűrők törlése</Text>
            </Pressable>
          </View>
        ) : null}

        {visibleItems.length > 0 ? (
          <Text style={styles.hint}>
            Koppints a kapcsolatra a szerkesztéshez.
          </Text>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={() => openForm()}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.lg },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Új sürgősségi kapcsolat"
      >
        <Ionicons name="add" size={31} color="#FFFFFF" />
      </Pressable>

      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={styles.overlayDismiss}
            onPress={() => setFilterVisible(false)}
          />

          <View style={[styles.modal, { paddingBottom: insets.bottom }]}>
            <View style={styles.grabber} />

            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="options" size={20} color={colors.teal} />
              </View>

              <Text style={styles.modalTitle}>Kapcsolatszűrők</Text>

              <Pressable
                onPress={() => setFilterVisible(false)}
                hitSlop={8}
                accessibilityLabel="Bezárás"
              >
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.fieldLabel}>Rendezés</Text>

              <View style={styles.optionRow}>
                {(
                  [
                    ['priority', 'Fontosság'],
                    ['name', 'ABC'],
                    ['newest', 'Legújabb'],
                  ] as const
                ).map(([value, label]) => {
                  const active = sortBy === value;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setSortBy(value)}
                      style={[
                        styles.option,
                        active && styles.optionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Fontosság</Text>

              <View style={styles.optionRow}>
                {(
                  [
                    ['all', 'Mind'],
                    ['primary', 'Elsődleges'],
                    ['regular', 'Egyéb'],
                  ] as const
                ).map(([value, label]) => {
                  const active = primaryFilter === value;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setPrimaryFilter(value)}
                      style={[
                        styles.option,
                        active && styles.optionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Kapcsolat típusa</Text>

              <View style={styles.optionRow}>
                {relationOptions.map(([value, label]) => {
                  const key =
                    value === 'all'
                      ? 'all'
                      : label.toLocaleLowerCase('hu-HU');

                  const active = relationFilter === key;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setRelationFilter(key)}
                      style={[
                        styles.option,
                        active && styles.optionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.actions}>
                <Pressable onPress={clearFilters} style={styles.cancel}>
                  <Text style={styles.cancelText}>Szűrők törlése</Text>
                </Pressable>

                <Pressable
                  onPress={() => setFilterVisible(false)}
                  style={styles.save}
                >
                  <Text style={styles.saveText}>Megjelenítés</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.overlayDismiss}
            onPress={() => setVisible(false)}
          />

          <View style={[styles.modal, { paddingBottom: insets.bottom }]}>
            <View style={styles.grabber} />

            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name={editing ? 'create' : 'person-add'}
                  size={20}
                  color={colors.teal}
                />
              </View>

              <Text style={styles.modalTitle}>
                {editing
                  ? 'Kapcsolat szerkesztése'
                  : 'Új sürgősségi kapcsolat'}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Név"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />

              <TextInput
                value={relation}
                onChangeText={setRelation}
                placeholder="Kapcsolat, például anya vagy mentő"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />

              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Telefonszám"
                keyboardType="phone-pad"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="E-mail (opcionális)"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />

              <TextInput
                value={priority}
                onChangeText={setPriority}
                placeholder="Prioritás 1–100"
                keyboardType="number-pad"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Megjegyzés, elérhetőségi idő, stb."
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
              />

              <View style={styles.primaryRow}>
                <Ionicons
                  name="star-outline"
                  size={22}
                  color={palette.textSecondary}
                />

                <View style={styles.flex}>
                  <Text style={styles.primaryRowTitle}>
                    Elsődleges kapcsolat
                  </Text>
                  <Text style={styles.primaryRowText}>
                    A lista elején jelenik meg.
                  </Text>
                </View>

                <Switch
                  value={isPrimary}
                  onValueChange={setIsPrimary}
                  trackColor={{
                    false: palette.border,
                    true: colors.teal,
                  }}
                  thumbColor={isPrimary ? '#FFFFFF' : undefined}
                />
              </View>

              {!editing && pendingItems.length > 0 ? (
                <View style={styles.batchList}>
                  <Text style={styles.batchTitle}>
                    Hozzáadásra vár ({pendingItems.length})
                  </Text>

                  {pendingItems.map((item, index) => (
                    <View
                      key={`${item.name}-${index}`}
                      style={styles.batchItem}
                    >
                      <View style={styles.batchDot} />

                      <Text
                        numberOfLines={1}
                        style={styles.batchItemText}
                      >
                        {item.name}
                      </Text>

                      <Pressable
                        accessibilityLabel={`${item.name} eltávolítása a listából`}
                        onPress={() =>
                          setPendingItems((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        hitSlop={8}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={palette.textMuted}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={() => setVisible(false)}
                  style={styles.cancel}
                >
                  <Text style={styles.cancelText}>Mégse</Text>
                </Pressable>

                {!editing ? (
                  <Pressable
                    disabled={busy}
                    onPress={addToBatch}
                    style={styles.addToBatch}
                  >
                    <Ionicons name="add" size={17} color={colors.teal} />
                    <Text style={styles.addToBatchText}>Újabb</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  disabled={busy}
                  onPress={() => void save()}
                  style={[styles.save, busy && styles.disabled]}
                >
                  <Text style={styles.saveText}>
                    {busy
                      ? 'Mentés…'
                      : !editing && pendingItems.length > 0
                        ? 'Összes mentése'
                        : 'Mentés'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
