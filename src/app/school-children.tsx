import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import {
  createFamilySchoolItems,
  deleteFamilySchoolItem,
  getFamilySchoolItems,
  setFamilySchoolItemCompleted,
  type FamilySchoolItem,
  type SchoolItemType,
} from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type ModuleType = SchoolItemType;
type Palette = typeof colors | typeof darkColors;

const moduleMeta: Record<SchoolItemType, { title: string; icon: IconName; color: string; empty: string }> = {
  timetable: { title: 'Órarend', icon: 'time-outline', color: colors.primary, empty: 'Még nincs órarend hozzáadva.' },
  homework: { title: 'Házi feladatok', icon: 'book-outline', color: colors.purple, empty: 'Még nincs rögzített házi feladat.' },
  exam: { title: 'Dolgozatok és vizsgák', icon: 'school-outline', color: colors.warning, empty: 'Még nincs közelgő dolgozat vagy vizsga.' },
  workout: { title: 'Edzések', icon: 'barbell-outline', color: colors.teal, empty: 'Még nincs edzés hozzáadva.' },
  meeting: { title: 'Szülői értekezletek', icon: 'people-outline', color: colors.pink, empty: 'Még nincs szülői értekezlet hozzáadva.' },
};

function formatDate(value: string | null) {
  if (!value) return 'Nincs dátum megadva';
  return new Date(value).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const weekdays = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
const weekOptions = ['Mindkét hét', 'Páros hét', 'Páratlan hét'];
const modalDescriptions: Record<SchoolItemType, string> = {
  timetable: 'Állítsd össze a heti órarendet nap, hét és tanóra szerint.',
  homework: 'Rögzítsd a feladatot és a beadási határidőt.',
  exam: 'Írd le, miből és milyen számonkérésre kell készülni.',
  workout: 'Minden fontos edzésinformáció egy helyen.',
  meeting: 'Készülj fel a szülői értekezlet témáira.',
};

function isChild(member: FamilyMember) {
  if (!member.birth_date) return true;
  const birth = new Date(member.birth_date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age < 18;
}

function Chip({
  label,
  selected,
  color,
  icon,
  palette,
  onPress,
}: {
  label: string;
  selected: boolean;
  color: string;
  icon?: IconName;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? color : palette.surfaceElevated },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? '#FFFFFF' : palette.textSecondary} /> : null}
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : palette.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function FormGroup({
  icon,
  title,
  color,
  palette,
  children,
}: {
  icon: IconName;
  title: string;
  color: string;
  palette: Palette;
  children: ReactNode;
}) {
  return (
    <View style={[styles.formGroup, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <View style={styles.fieldHeading}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ItemCard({
  item,
  palette,
  onToggle,
  onDelete,
}: {
  item: FamilySchoolItem;
  palette: Palette;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const meta = moduleMeta[item.item_type];
  const isHomework = item.item_type === 'homework';
  return (
    <Pressable
      accessibilityRole={isHomework ? 'checkbox' : 'button'}
      accessibilityState={isHomework ? { checked: item.completed } : undefined}
      onPress={isHomework ? onToggle : undefined}
      onLongPress={onDelete}
      style={({ pressed }) => [
        styles.itemCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.itemAccent, { backgroundColor: meta.color }]} />
      {isHomework ? (
        <View
          style={[
            styles.checkbox,
            { borderColor: palette.borderStrong },
            item.completed && { backgroundColor: palette.success, borderColor: palette.success },
          ]}
        >
          {item.completed ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
        </View>
      ) : (
        <View style={[styles.itemIcon, { backgroundColor: `${meta.color}22` }]}>
          <Ionicons name={meta.icon} size={21} color={meta.color} />
        </View>
      )}
      <View style={styles.flex}>
        <Text
          style={[
            styles.itemTitle,
            { color: palette.textPrimary },
            item.completed && { textDecorationLine: 'line-through', color: palette.textMuted },
          ]}
        >
          {item.title}
        </Text>
        {item.metadata.subject ? (
          <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>Tantárgy: {item.metadata.subject}</Text>
        ) : null}
        {item.metadata.examType ? (
          <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>
            {String(item.metadata.examType)} · {item.metadata.topics ? String(item.metadata.topics) : 'Téma nincs megadva'}
          </Text>
        ) : null}
        {item.metadata.coachName ? (
          <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>
            Edző: {String(item.metadata.coachName)}
            {item.metadata.coachContact ? ` · ${String(item.metadata.coachContact)}` : ''}
          </Text>
        ) : null}
        {item.metadata.agenda ? (
          <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>Témák: {String(item.metadata.agenda)}</Text>
        ) : null}
        {item.detail ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>{item.detail}</Text> : null}
        <View style={styles.itemMetaRow}>
          <Ionicons name="time-outline" size={12} color={meta.color} />
          <Text style={[styles.itemMeta, { color: meta.color }]}>
            {item.location ? `${item.location} · ` : ''}
            {formatDate(item.due_at ?? item.starts_at)}
          </Text>
        </View>
      </View>
      <Pressable accessibilityLabel={`${item.title} törlése`} hitSlop={10} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
      </Pressable>
    </Pressable>
  );
}

export default function SchoolChildren() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [items, setItems] = useState<FamilySchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [itemType, setItemType] = useState<ModuleType>('homework');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [subject, setSubject] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Hétfő');
  const [weekType, setWeekType] = useState('Mindkét hét');
  const [period, setPeriod] = useState('');
  const [isBreak, setIsBreak] = useState(false);
  const [isExempt, setIsExempt] = useState(false);
  const [examType, setExamType] = useState('');
  const [topics, setTopics] = useState('');
  const [coachName, setCoachName] = useState('');
  const [coachContact, setCoachContact] = useState('');
  const [equipment, setEquipment] = useState('');
  const [agenda, setAgenda] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingItems, setPendingItems] = useState<
    {
      itemType: ModuleType;
      title: string;
      detail: string;
      location: string;
      metadata: Record<string, string | boolean | number | null>;
      startsAt: string | null;
      dueAt: string | null;
    }[]
  >([]);
  const children = useMemo(() => members.filter(isChild), [members]);
  const selectedChild = children.find((child) => child.profile_id === selectedChildId) ?? children[0];
  const activeMeta = moduleMeta[itemType];

  async function reload(id = familyId, childId = selectedChild?.profile_id) {
    if (!id) return;
    setLoading(true);
    try {
      setItems(await getFamilySchoolItems(id, childId));
    } catch (error) {
      Alert.alert('Betöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra később.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        if (!id) return;
        const familyMembers = await getFamilyMembers(id);
        setMembers(familyMembers);
        const firstChild = familyMembers.find(isChild);
        setSelectedChildId(firstChild?.profile_id ?? null);
        await reload(id, firstChild?.profile_id);
      })
      .catch((error) =>
        Alert.alert('Hiba', error instanceof Error ? error.message : 'A családi adatok betöltése sikertelen.'),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseChild(childId: string) {
    setSelectedChildId(childId);
    void reload(familyId, childId);
  }

  function openCreate(type: ModuleType) {
    setItemType(type);
    setTitle('');
    setDetail('');
    setLocation('');
    setDate('');
    setSubject('');
    setDayOfWeek('Hétfő');
    setWeekType('Mindkét hét');
    setPeriod('');
    setIsBreak(false);
    setIsExempt(false);
    setExamType('');
    setTopics('');
    setCoachName('');
    setCoachContact('');
    setEquipment('');
    setAgenda('');
    setPendingItems([]);
    setVisible(true);
  }

  function buildMetadata() {
    return {
      subject: subject || null,
      dayOfWeek: itemType === 'timetable' ? dayOfWeek : null,
      weekType: itemType === 'timetable' ? weekType : null,
      period: itemType === 'timetable' ? period : null,
      isBreak: itemType === 'timetable' ? isBreak : null,
      isExempt: itemType === 'timetable' ? isExempt : null,
      examType: itemType === 'exam' ? examType : null,
      topics: itemType === 'exam' ? topics : null,
      coachName: itemType === 'workout' ? coachName : null,
      coachContact: itemType === 'workout' ? coachContact : null,
      equipment: itemType === 'workout' ? equipment : null,
      agenda: itemType === 'meeting' ? agenda : null,
    };
  }

  function buildCurrentItem() {
    const parsedDate = date.trim() ? new Date(date.trim().replace(' ', 'T')) : null;
    if (date.trim() && (!parsedDate || Number.isNaN(parsedDate.getTime()))) {
      return null;
    }
    return {
      itemType,
      title: title.trim(),
      detail: detail.trim(),
      location: location.trim(),
      metadata: buildMetadata(),
      startsAt: itemType !== 'homework' && itemType !== 'exam' ? parsedDate?.toISOString() ?? null : null,
      dueAt: itemType === 'homework' || itemType === 'exam' ? parsedDate?.toISOString() ?? null : null,
    };
  }

  function addToBatch() {
    if (!title.trim()) {
      Alert.alert('Hiányzó adat', 'Adj meg egy címet a hozzáadni kívánt elemhez.');
      return;
    }
    const item = buildCurrentItem();
    if (!item) {
      Alert.alert('Hibás dátum', 'Használd ezt a formátumot: 2026-11-07 16:00');
      return;
    }
    setPendingItems((current) => [...current, item]);
    setTitle('');
    setDetail('');
    setLocation('');
    setDate('');
  }

  async function save() {
    if (!familyId || !profile?.id || !selectedChild?.profile_id || !title.trim()) {
      if (pendingItems.length === 0) {
        Alert.alert('Hiányzó adat', 'Válassz gyermeket, és adj meg legalább egy elemet.');
        return;
      }
    }
    if (!familyId || !profile?.id || !selectedChild?.profile_id) {
      return;
    }
    setBusy(true);
    try {
      const itemsToSave = [...pendingItems];
      const currentItem = buildCurrentItem();
      if (title.trim()) {
        if (!currentItem) {
          Alert.alert('Hibás dátum', 'Használd ezt a formátumot: 2026-11-07 16:00');
          return;
        }
        itemsToSave.push(currentItem);
      }
      if (itemsToSave.length === 0) {
        Alert.alert('Hiányzó adat', 'Adj meg legalább egy elemet a mentéshez.');
        return;
      }
      await createFamilySchoolItems(
        itemsToSave.map((item) => ({
          familyId,
          childProfileId: selectedChild.profile_id,
          profileId: profile.id,
          itemType: item.itemType,
          title: item.title,
          detail: item.detail,
          location: item.location,
          metadata: item.metadata,
          startsAt: item.startsAt,
          dueAt: item.dueAt,
        })),
      );
      setVisible(false);
      await reload(familyId, selectedChild.profile_id);
    } catch (error) {
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra később.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: FamilySchoolItem) {
    try {
      await setFamilySchoolItemCompleted(item.id, !item.completed);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, completed: !entry.completed } : entry)),
      );
    } catch (error) {
      Alert.alert('Frissítés sikertelen', error instanceof Error ? error.message : 'Próbáld újra később.');
    }
  }

  function remove(item: FamilySchoolItem) {
    Alert.alert('Elem törlése', `Törlöd: ${item.title}?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deleteFamilySchoolItem(item.id)
            .then(() => reload())
            .catch((error) =>
              Alert.alert('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.'),
            ),
      },
    ]);
  }

  const count = (type: SchoolItemType) =>
    items.filter((item) => item.item_type === type && !item.completed).length;

  const inputStyle = (nested = false) => [
    styles.input,
    nested && styles.nestedInput,
    { backgroundColor: nested ? palette.surface : palette.background, color: palette.textPrimary },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Iskolai központ</Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/school-calendar',
              params: {
                childId: selectedChild?.profile_id,
                childName: selectedChild?.nickname || selectedChild?.display_name,
                familyId,
              },
            } as never)
          }
          accessibilityRole="button"
          accessibilityLabel="A gyermek naptárának megnyitása"
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="calendar-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={isDark ? ['#1B4FC4', '#12307A'] : ['#2F6BFF', '#1B3FD8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroCircle} />
          <View style={styles.heroIcon}>
            <Ionicons name="school" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>Tanulmányok és programok</Text>
            <Text style={styles.heroText}>Minden gyermek iskolai információja egy helyen.</Text>
          </View>
        </LinearGradient>

        {children.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childList}>
            {children.map((child) => {
              const selected = child.profile_id === selectedChild?.profile_id;
              return (
                <Pressable
                  key={child.profile_id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => chooseChild(child.profile_id)}
                  style={({ pressed }) => [
                    styles.childChip,
                    {
                      backgroundColor: selected ? palette.primary : palette.surface,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.childAvatar,
                      { backgroundColor: selected ? 'rgba(255,255,255,0.9)' : palette.primarySoft },
                    ]}
                  >
                    <Text style={[styles.childInitial, { color: palette.primary }]}>
                      {child.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.childName, { color: selected ? '#FFFFFF' : palette.textPrimary }]}>
                    {child.nickname || child.display_name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={[styles.empty, { color: palette.textMuted }]}>Nincs gyermekhez kapcsolható családtag.</Text>
        )}

        <View style={styles.summaryRow}>
          {(['homework', 'exam', 'workout'] as const).map((type) => (
            <View
              key={type}
              style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={[styles.summaryIcon, { backgroundColor: `${moduleMeta[type].color}22` }]}>
                <Ionicons name={moduleMeta[type].icon} size={19} color={moduleMeta[type].color} />
              </View>
              <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{count(type)}</Text>
              <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>
                {type === 'homework' ? 'Feladat' : type === 'exam' ? 'Dolgozat' : 'Edzés'}
              </Text>
            </View>
          ))}
        </View>

        {loading ? <ActivityIndicator color={palette.primary} style={styles.loader} /> : null}

        {(['timetable', 'homework', 'exam', 'workout', 'meeting'] as const).map((type) => {
          const meta = moduleMeta[type];
          const typeItems = items.filter((item) => item.item_type === type);
          return (
            <View key={type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: `${meta.color}22` }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{meta.title}</Text>
                  {typeItems.length > 0 ? (
                    <View style={[styles.countBadge, { backgroundColor: `${meta.color}22` }]}>
                      <Text style={[styles.countText, { color: meta.color }]}>{typeItems.length}</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openCreate(type)}
                  accessibilityLabel={`${meta.title}: új elem`}
                  style={({ pressed }) => [styles.addButton, { backgroundColor: meta.color }, pressed && styles.pressed]}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </Pressable>
              </View>

              {type === 'timetable' && typeItems.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.table, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                    <View style={[styles.tableRow, { backgroundColor: palette.surfaceElevated }]}>
                      {weekdays.map((day) => (
                        <Text key={day} style={[styles.tableHeader, { color: palette.textPrimary }]}>
                          {day}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.tableRow}>
                      {weekdays.map((day) => {
                        const dayItems = typeItems.filter((item) => item.metadata.dayOfWeek === day);
                        return (
                          <View key={day} style={[styles.tableCell, { borderColor: palette.border }]}>
                            {dayItems.length === 0 ? (
                              <Text style={[styles.tableEmpty, { color: palette.textMuted }]}>—</Text>
                            ) : (
                              dayItems.map((item) => (
                                <Pressable
                                  key={item.id}
                                  onLongPress={() => remove(item)}
                                  style={[styles.lesson, { backgroundColor: `${meta.color}22` }]}
                                >
                                  <Text style={[styles.lessonTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                                  <Text style={[styles.lessonMeta, { color: meta.color }]}>
                                    {item.metadata.period ? `${item.metadata.period}. óra` : ''}{' '}
                                    {item.metadata.weekType !== 'Mindkét hét' ? `· ${String(item.metadata.weekType)}` : ''}
                                  </Text>
                                  {item.metadata.isBreak ? (
                                    <Text style={[styles.lessonMeta, { color: palette.warning }]}>Szünet</Text>
                                  ) : null}
                                  {item.metadata.isExempt ? (
                                    <Text style={[styles.lessonMeta, { color: palette.danger }]}>Felmentés</Text>
                                  ) : null}
                                </Pressable>
                              ))
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>
              ) : typeItems.length === 0 ? (
                <View style={[styles.sectionEmpty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={[styles.sectionEmptyText, { color: palette.textMuted }]}>{meta.empty}</Text>
                </View>
              ) : (
                typeItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    palette={palette}
                    onToggle={() => void toggle(item)}
                    onDelete={() => remove(item)}
                  />
                ))
              )}
            </View>
          );
        })}

        <View style={[styles.tip, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="bulb-outline" size={22} color={palette.primary} />
          <Text style={[styles.tipText, { color: palette.textSecondary }]}>
            Hosszan nyomva törölhetsz egy elemet. A házi feladatra koppintva készre jelölheted.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ablak bezárása"
            onPress={() => setVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.modal, { backgroundColor: palette.surface }]}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalHero, { backgroundColor: `${activeMeta.color}1F` }]}>
                <View style={[styles.modalIcon, { backgroundColor: activeMeta.color }]}>
                  <Ionicons name={activeMeta.icon} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.modalEyebrow, { color: activeMeta.color }]}>ÚJ BEJEGYZÉS</Text>
                  <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>{activeMeta.title}</Text>
                  <Text style={[styles.modalDescription, { color: palette.textSecondary }]}>
                    {modalDescriptions[itemType]}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Bezárás"
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={21} color={palette.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.formSectionTitle, { color: palette.textPrimary }]}>Alapadatok</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={
                    itemType === 'timetable'
                      ? 'Óra neve, például Matematika'
                      : itemType === 'homework'
                        ? 'Feladat rövid neve'
                        : itemType === 'exam'
                          ? 'Számonkérés neve'
                          : itemType === 'workout'
                            ? 'Edzés megnevezése'
                            : 'Értekezlet címe'
                  }
                  placeholderTextColor={palette.textMuted}
                  style={inputStyle()}
                />

                {itemType === 'timetable' ? (
                  <FormGroup icon="calendar-outline" title="Heti időpont" color={activeMeta.color} palette={palette}>
                    <TextInput
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="Tantárgy"
                      placeholderTextColor={palette.textMuted}
                      style={inputStyle(true)}
                    />
                    <Text style={[styles.optionLabel, { color: palette.textSecondary }]}>Nap</Text>
                    <View style={styles.optionRow}>
                      {weekdays.map((day) => (
                        <Chip
                          key={day}
                          label={day}
                          selected={day === dayOfWeek}
                          color={activeMeta.color}
                          palette={palette}
                          onPress={() => setDayOfWeek(day)}
                        />
                      ))}
                    </View>
                    <Text style={[styles.optionLabel, { color: palette.textSecondary }]}>Hét típusa</Text>
                    <View style={styles.optionRow}>
                      {weekOptions.map((option) => (
                        <Chip
                          key={option}
                          label={option}
                          selected={option === weekType}
                          color={activeMeta.color}
                          palette={palette}
                          onPress={() => setWeekType(option)}
                        />
                      ))}
                    </View>
                    <TextInput
                      value={period}
                      onChangeText={setPeriod}
                      placeholder="Hányadik óra? (például 3)"
                      keyboardType="number-pad"
                      placeholderTextColor={palette.textMuted}
                      style={inputStyle(true)}
                    />
                    <View style={styles.optionRow}>
                      <Chip
                        label="Szünet"
                        icon="pause-circle-outline"
                        selected={isBreak}
                        color={palette.warning}
                        palette={palette}
                        onPress={() => setIsBreak((value) => !value)}
                      />
                      <Chip
                        label="Felmentés"
                        icon="shield-outline"
                        selected={isExempt}
                        color={palette.danger}
                        palette={palette}
                        onPress={() => setIsExempt((value) => !value)}
                      />
                    </View>
                  </FormGroup>
                ) : null}

                {itemType === 'homework' ? (
                  <FormGroup icon="book-outline" title="Feladat részletei" color={activeMeta.color} palette={palette}>
                    <TextInput
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="Tantárgy"
                      placeholderTextColor={palette.textMuted}
                      style={inputStyle(true)}
                    />
                  </FormGroup>
                ) : null}

                {itemType === 'exam' ? (
                  <FormGroup icon="school-outline" title="Felkészülés" color={activeMeta.color} palette={palette}>
                    <TextInput
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="Tantárgy"
                      placeholderTextColor={palette.textMuted}
                      style={inputStyle(true)}
                    />
                    <TextInput
                      value={examType}
                      onChangeText={setExamType}
                      placeholder="Dolgozat, témazáró vagy vizsga"
                      placeholderTextColor={palette.textMuted}
                      style={inputStyle(true)}
                    />
                    <TextInput
                      value={topics}
                      onChangeText={setTopics}
                      placeholder="Miből kell felkészülni?"
                      placeholderTextColor={palette.textMuted}
                      style={[inputStyle(true), styles.textArea]}
                      multiline
                    />
                  </FormGroup>
                ) : null}

                {itemType === 'workout' ? (
                  <FormGroup icon="barbell-outline" title="Edzésinformációk" color={activeMeta.color} palette={palette}>
                    <TextInput
                      value={coachName}
                      onChangeText={setCoachName}
                      placeholder="Edző neve"
                      placeholderTextColor={palette.textMuted}
                      style={inputStyle(true)}
                    />
                    <TextInput
                      value={coachContact}
                      onChangeText={setCoachContact}
                      placeholder="Edző elérhetősége"
                      placeholderTextColor={palette.textMuted}
                      style={inputStyle(true)}
                    />
                    <TextInput
                      value={equipment}
                      onChangeText={setEquipment}
                      placeholder="Szükséges felszerelés"
                      placeholderTextColor={palette.textMuted}
                      style={[inputStyle(true), styles.textArea]}
                      multiline
                    />
                  </FormGroup>
                ) : null}

                {itemType === 'meeting' ? (
                  <FormGroup icon="people-outline" title="Napirend" color={activeMeta.color} palette={palette}>
                    <TextInput
                      value={agenda}
                      onChangeText={setAgenda}
                      placeholder="Témák, kérdések és megjegyzések"
                      placeholderTextColor={palette.textMuted}
                      style={[inputStyle(true), styles.textArea]}
                      multiline
                    />
                  </FormGroup>
                ) : null}

                {itemType !== 'timetable' ? (
                  <TextInput
                    value={detail}
                    onChangeText={setDetail}
                    placeholder="További részletek (opcionális)"
                    placeholderTextColor={palette.textMuted}
                    style={[inputStyle(), styles.textArea]}
                    multiline
                  />
                ) : null}

                <FormGroup
                  icon={itemType === 'homework' || itemType === 'exam' ? 'alarm-outline' : 'location-outline'}
                  title={
                    itemType === 'homework'
                      ? 'Beadási határidő'
                      : itemType === 'exam'
                        ? 'A számonkérés időpontja'
                        : 'Időpont és helyszín'
                  }
                  color={activeMeta.color}
                  palette={palette}
                >
                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    placeholder="2026-11-07 16:00 (opcionális)"
                    placeholderTextColor={palette.textMuted}
                    style={inputStyle(true)}
                  />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Helyszín (opcionális)"
                    placeholderTextColor={palette.textMuted}
                    style={inputStyle(true)}
                  />
                </FormGroup>
              </View>

              {pendingItems.length > 0 ? (
                <View style={styles.batchList}>
                  <Text style={[styles.batchTitle, { color: palette.textPrimary }]}>
                    Hozzáadásra vár ({pendingItems.length})
                  </Text>
                  {pendingItems.map((item, index) => (
                    <View
                      key={`${item.title}-${index}`}
                      style={[styles.batchItem, { backgroundColor: palette.background, borderColor: palette.border }]}
                    >
                      <View style={[styles.batchDot, { backgroundColor: moduleMeta[item.itemType].color }]} />
                      <Text numberOfLines={1} style={[styles.batchItemText, { color: palette.textPrimary }]}>
                        {item.title}
                      </Text>
                      <Pressable
                        accessibilityLabel={`${item.title} eltávolítása a listából`}
                        onPress={() =>
                          setPendingItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                        hitSlop={8}
                      >
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
                <Pressable
                  disabled={busy}
                  onPress={addToBatch}
                  style={({ pressed }) => [
                    styles.addToBatch,
                    { borderColor: activeMeta.color },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="add" size={17} color={activeMeta.color} />
                  <Text style={{ color: activeMeta.color, fontWeight: '900' }}>Újabb elem</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => void save()}
                  style={({ pressed }) => [
                    styles.save,
                    { backgroundColor: activeMeta.color },
                    busy && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>
                    {busy ? 'Mentés…' : pendingItems.length > 0 ? 'Összes mentése' : 'Mentés'}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 21, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  hero: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    borderRadius: radius.xl,
    ...shadows.floating,
  },
  heroCircle: {
    position: 'absolute',
    top: -45,
    right: -35,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  heroText: { marginTop: 4, color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 18 },
  childList: { gap: spacing.sm },
  childChip: {
    padding: spacing.sm,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.round,
  },
  childAvatar: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  childInitial: { fontWeight: '900' },
  childName: { fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  summaryIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  summaryValue: { marginTop: 4, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 11, fontWeight: '800' },
  loader: { paddingVertical: spacing.md },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  sectionTitle: { flexShrink: 1, fontSize: 16, fontWeight: '900' },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  countText: { fontSize: 11, fontWeight: '900' },
  addButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  sectionEmpty: {
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  sectionEmptyText: { fontSize: 12, textAlign: 'center' },
  table: { minWidth: 720, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  tableHeader: { width: 140, padding: spacing.sm, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  tableCell: { width: 140, minHeight: 90, padding: spacing.xs, borderTopWidth: 1, borderRightWidth: 1, gap: spacing.xs },
  tableEmpty: { textAlign: 'center', paddingTop: spacing.lg },
  lesson: { padding: spacing.sm, borderRadius: radius.sm },
  lessonTitle: { fontSize: 11, fontWeight: '900' },
  lessonMeta: { marginTop: 2, fontSize: 9, fontWeight: '800' },
  itemCard: {
    minHeight: 72,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  itemAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  itemIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  checkbox: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 9 },
  itemTitle: { fontSize: 14, fontWeight: '900' },
  itemDetail: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  itemMetaRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemMeta: { fontSize: 11, fontWeight: '800' },
  empty: { padding: spacing.lg, textAlign: 'center' },
  tip: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23, 43, 77, 0.55)' },
  modal: {
    maxHeight: '92%',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, marginBottom: spacing.md, borderRadius: 2 },
  modalHero: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg },
  modalIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  modalEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { marginTop: 2, fontSize: 19, fontWeight: '900' },
  modalDescription: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  modalBody: { paddingTop: spacing.lg, gap: spacing.md },
  formSectionTitle: { fontSize: 14, fontWeight: '900' },
  formGroup: { padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  fieldHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '800' },
  optionLabel: { marginTop: spacing.xs, fontSize: 11, fontWeight: '800' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
  },
  chipText: { fontSize: 12, fontWeight: '800' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, fontSize: 14 },
  nestedInput: { minHeight: 44 },
  textArea: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
  batchList: { marginTop: spacing.md, gap: spacing.xs },
  batchTitle: { marginBottom: spacing.xs, fontSize: 12, fontWeight: '900' },
  batchItem: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  batchDot: { width: 8, height: 8, borderRadius: 4 },
  batchItemText: { flex: 1, fontSize: 12, fontWeight: '800' },
  actions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cancel: { padding: spacing.md },
  addToBatch: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  save: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
  },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});