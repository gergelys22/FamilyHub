import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { getMyFamilies, getFamilyMembers, type FamilyMember } from '@/services/families';
import {
  createFamilySchoolItems,
  deleteFamilySchoolItem,
  getFamilySchoolItems,
  setFamilySchoolItemCompleted,
  type FamilySchoolItem,
  type SchoolItemType,
} from '@/services/family-content';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type ModuleType = SchoolItemType;

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

function ItemCard({
  item,
  palette,
  onToggle,
  onDelete,
}: {
  item: FamilySchoolItem;
  palette: typeof colors | typeof darkColors;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const meta = moduleMeta[item.item_type];
  return (
    <Pressable
      onPress={item.item_type === 'homework' ? onToggle : undefined}
      onLongPress={onDelete}
      style={({ pressed }) => [styles.itemCard, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}
    >
      {item.item_type === 'homework' ? (
        <View style={[styles.checkbox, item.completed && { backgroundColor: palette.success, borderColor: palette.success }]}>
          {item.completed ? <Ionicons name="checkmark" size={16} color={palette.white} /> : null}
        </View>
      ) : (
        <View style={[styles.itemIcon, { backgroundColor: `${meta.color}20` }]}>
          <Ionicons name={meta.icon} size={21} color={meta.color} />
        </View>
      )}
      <View style={styles.flex}>
        <Text style={[styles.itemTitle, { color: palette.textPrimary }, item.completed && styles.completed]}>{item.title}</Text>
        {item.metadata.subject ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>Tantárgy: {item.metadata.subject}</Text> : null}
        {item.metadata.examType ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>{String(item.metadata.examType)} · {item.metadata.topics ? String(item.metadata.topics) : 'Téma nincs megadva'}</Text> : null}
        {item.metadata.coachName ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>Edző: {String(item.metadata.coachName)}{item.metadata.coachContact ? ` · ${String(item.metadata.coachContact)}` : ''}</Text> : null}
        {item.metadata.agenda ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>Témák: {String(item.metadata.agenda)}</Text> : null}
        {item.detail ? <Text style={[styles.itemDetail, { color: palette.textSecondary }]}>{item.detail}</Text> : null}
        <Text style={[styles.itemMeta, { color: meta.color }]}>
          {item.location ? `${item.location} · ` : ''}{formatDate(item.due_at ?? item.starts_at)}
        </Text>
      </View>
      <Ionicons name="ellipsis-vertical" size={18} color={palette.textMuted} />
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
  const [pendingItems, setPendingItems] = useState<Array<{
    itemType: ModuleType;
    title: string;
    detail: string;
    location: string;
    metadata: Record<string, string | boolean | number | null>;
    startsAt: string | null;
    dueAt: string | null;
  }>>([]);
  const children = useMemo(() => members.filter(isChild), [members]);
  const selectedChild = children.find((child) => child.profile_id === selectedChildId) ?? children[0];

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
    void getMyFamilies().then(async (families) => {
      const id = families[0]?.id ?? null;
      setFamilyId(id);
      if (!id) return;
      const familyMembers = await getFamilyMembers(id);
      setMembers(familyMembers);
      const firstChild = familyMembers.find(isChild);
      setSelectedChildId(firstChild?.profile_id ?? null);
      await reload(id, firstChild?.profile_id);
    }).catch((error) => Alert.alert('Hiba', error instanceof Error ? error.message : 'A családi adatok betöltése sikertelen.'));
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
    setPeriod('');
    setExamType('');
    setTopics('');
    setCoachName('');
    setCoachContact('');
    setEquipment('');
    setAgenda('');
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
      await createFamilySchoolItems(itemsToSave.map((item) => ({
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
      })));
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
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry));
    } catch (error) {
      Alert.alert('Frissítés sikertelen', error instanceof Error ? error.message : 'Próbáld újra később.');
    }
  }

  function remove(item: FamilySchoolItem) {
    Alert.alert('Elem törlése', `Törlöd: ${item.title}?`, [
      { text: 'Mégse', style: 'cancel' },
      { text: 'Törlés', style: 'destructive', onPress: () => void deleteFamilySchoolItem(item.id).then(() => reload()).catch((error) => Alert.alert('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.')) },
    ]);
  }

  const count = (type: SchoolItemType) => items.filter((item) => item.item_type === type && !item.completed).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Iskolai központ</Text>
        <Pressable
          onPress={() => router.push({
            pathname: '/school-calendar',
            params: {
              childId: selectedChild?.profile_id,
              childName: selectedChild?.nickname || selectedChild?.display_name,
              familyId,
            },
          } as never)}
          accessibilityLabel="A gyermek naptárának megnyitása"
          style={[styles.headerButton, { backgroundColor: palette.surface }]}
        >
          <Ionicons name="calendar-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: palette.primarySoft }]}>
          <View style={[styles.heroIcon, { backgroundColor: palette.surface }]}>
            <Ionicons name="school-outline" size={30} color={palette.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>Tanulmányok és programok</Text>
            <Text style={[styles.heroText, { color: palette.textSecondary }]}>Minden gyermek iskolai információja egy helyen.</Text>
          </View>
        </View>
        {children.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childList}>
            {children.map((child) => (
              <Pressable key={child.profile_id} onPress={() => chooseChild(child.profile_id)} style={[styles.childChip, { backgroundColor: child.profile_id === selectedChild?.profile_id ? palette.primary : palette.surface, borderColor: palette.border }]}>
                <View style={[styles.childAvatar, { backgroundColor: child.profile_id === selectedChild?.profile_id ? palette.white : palette.primarySoft }]}>
                  <Text style={[styles.childInitial, { color: child.profile_id === selectedChild?.profile_id ? palette.primary : palette.primary }]}>{child.display_name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={{ color: child.profile_id === selectedChild?.profile_id ? palette.white : palette.textPrimary, fontWeight: '800' }}>{child.nickname || child.display_name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : <Text style={[styles.empty, { color: palette.textMuted }]}>Nincs gyermekhez kapcsolható családtag.</Text>}
        <View style={styles.summaryRow}>
          {(['homework', 'exam', 'workout'] as const).map((type) => (
            <View key={type} style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name={moduleMeta[type].icon} size={20} color={moduleMeta[type].color} />
              <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{count(type)}</Text>
              <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{type === 'homework' ? 'Feladat' : type === 'exam' ? 'Dolgozat' : 'Edzés'}</Text>
            </View>
          ))}
        </View>
        {loading ? <Text style={[styles.empty, { color: palette.textMuted }]}>Adatok betöltése…</Text> : null}
        {(['timetable', 'homework', 'exam', 'workout', 'meeting'] as const).map((type) => {
          const meta = moduleMeta[type];
          const typeItems = items.filter((item) => item.item_type === type);
          return (
            <View key={type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name={meta.icon} size={21} color={meta.color} />
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{meta.title}</Text>
                </View>
                <Pressable onPress={() => openCreate(type)} accessibilityLabel={`${meta.title}: új elem`}>
                  <Ionicons name="add-circle-outline" size={23} color={palette.primary} />
                </Pressable>
              </View>
              {type === 'timetable' && typeItems.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.table, { borderColor: palette.border }]}>
                    <View style={[styles.tableRow, { backgroundColor: palette.surfaceElevated }]}>
                      {weekdays.map((day) => <Text key={day} style={[styles.tableHeader, { color: palette.textPrimary }]}>{day}</Text>)}
                    </View>
                    <View style={styles.tableRow}>
                      {weekdays.map((day) => {
                        const dayItems = typeItems.filter((item) => item.metadata.dayOfWeek === day);
                        return (
                          <View key={day} style={[styles.tableCell, { borderColor: palette.border }]}>
                            {dayItems.length === 0 ? <Text style={[styles.tableEmpty, { color: palette.textMuted }]}>—</Text> : dayItems.map((item) => (
                              <Pressable key={item.id} onLongPress={() => remove(item)} style={[styles.lesson, { backgroundColor: `${meta.color}20` }]}>
                                <Text style={[styles.lessonTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                                <Text style={[styles.lessonMeta, { color: meta.color }]}>{item.metadata.period ? `${item.metadata.period}. óra` : ''} {item.metadata.weekType !== 'Mindkét hét' ? `· ${String(item.metadata.weekType)}` : ''}</Text>
                                {item.metadata.isBreak ? <Text style={[styles.lessonMeta, { color: palette.warning }]}>Szünet</Text> : null}
                                {item.metadata.isExempt ? <Text style={[styles.lessonMeta, { color: palette.danger }]}>Felmentés</Text> : null}
                              </Pressable>
                            ))}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>
              ) : typeItems.length === 0 ? <Text style={[styles.sectionEmpty, { color: palette.textMuted }]}>{meta.empty}</Text> : typeItems.map((item) => <ItemCard key={item.id} item={item} palette={palette} onToggle={() => void toggle(item)} onDelete={() => remove(item)} />)}
            </View>
          );
        })}
        <View style={[styles.tip, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="bulb-outline" size={22} color={palette.primary} />
          <Text style={[styles.tipText, { color: palette.textSecondary }]}>Hosszan nyomva törölhetsz egy elemet. A házi feladatra koppintva készre jelölheted.</Text>
        </View>
      </ScrollView>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: palette.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalHero, { backgroundColor: `${moduleMeta[itemType].color}18` }]}>
                <View style={[styles.modalIcon, { backgroundColor: moduleMeta[itemType].color }]}>
                  <Ionicons name={moduleMeta[itemType].icon} size={24} color={palette.white} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.modalEyebrow, { color: moduleMeta[itemType].color }]}>ÚJ BEJEGYZÉS</Text>
                  <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>{moduleMeta[itemType].title}</Text>
                  <Text style={[styles.modalDescription, { color: palette.textSecondary }]}>{modalDescriptions[itemType]}</Text>
                </View>
                <Pressable onPress={() => setVisible(false)} accessibilityLabel="Bezárás" style={styles.closeButton}>
                  <Ionicons name="close" size={21} color={palette.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.formSectionTitle, { color: palette.textPrimary }]}>Alapadatok</Text>
                <TextInput value={title} onChangeText={setTitle} placeholder={itemType === 'timetable' ? 'Óra neve, például Matematika' : itemType === 'homework' ? 'Feladat rövid neve' : itemType === 'exam' ? 'Számonkérés neve' : itemType === 'workout' ? 'Edzés megnevezése' : 'Értekezlet címe'} placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary }]} />

                {itemType === 'timetable' ? (
                  <View style={[styles.formGroup, { backgroundColor: palette.background }]}>
                    <View style={styles.fieldHeading}><Ionicons name="calendar-outline" size={16} color={moduleMeta[itemType].color} /><Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Heti időpont</Text></View>
                    <TextInput value={subject} onChangeText={setSubject} placeholder="Tantárgy" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                    <Text style={[styles.optionLabel, { color: palette.textSecondary }]}>Nap</Text>
                    <View style={styles.optionRow}>{weekdays.map((day) => <Pressable key={day} onPress={() => setDayOfWeek(day)} style={[styles.option, { backgroundColor: day === dayOfWeek ? moduleMeta[itemType].color : palette.surfaceElevated }]}><Text style={{ color: day === dayOfWeek ? palette.white : palette.textSecondary, fontSize: 11 }}>{day}</Text></Pressable>)}</View>
                    <Text style={[styles.optionLabel, { color: palette.textSecondary }]}>Hét típusa</Text>
                    <View style={styles.optionRow}>{weekOptions.map((option) => <Pressable key={option} onPress={() => setWeekType(option)} style={[styles.option, { backgroundColor: option === weekType ? moduleMeta[itemType].color : palette.surfaceElevated }]}><Text style={{ color: option === weekType ? palette.white : palette.textSecondary, fontSize: 11 }}>{option}</Text></Pressable>)}</View>
                    <TextInput value={period} onChangeText={setPeriod} placeholder="Hányadik óra? (például 3)" keyboardType="number-pad" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                    <View style={styles.optionRow}>
                      <Pressable onPress={() => setIsBreak((value) => !value)} style={[styles.option, { backgroundColor: isBreak ? palette.warning : palette.surfaceElevated }]}><Ionicons name="pause-circle-outline" size={14} color={isBreak ? palette.white : palette.textSecondary} /><Text style={{ color: isBreak ? palette.white : palette.textSecondary, fontSize: 11 }}>Szünet</Text></Pressable>
                      <Pressable onPress={() => setIsExempt((value) => !value)} style={[styles.option, { backgroundColor: isExempt ? palette.danger : palette.surfaceElevated }]}><Ionicons name="shield-outline" size={14} color={isExempt ? palette.white : palette.textSecondary} /><Text style={{ color: isExempt ? palette.white : palette.textSecondary, fontSize: 11 }}>Felmentés</Text></Pressable>
                    </View>
                  </View>
                ) : null}
                {itemType === 'homework' ? (
                  <View style={[styles.formGroup, { backgroundColor: palette.background }]}>
                    <View style={styles.fieldHeading}><Ionicons name="book-outline" size={16} color={moduleMeta[itemType].color} /><Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Feladat részletei</Text></View>
                    <TextInput value={subject} onChangeText={setSubject} placeholder="Tantárgy" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                  </View>
                ) : null}
                {itemType === 'exam' ? (
                  <View style={[styles.formGroup, { backgroundColor: palette.background }]}>
                    <View style={styles.fieldHeading}><Ionicons name="school-outline" size={16} color={moduleMeta[itemType].color} /><Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Felkészülés</Text></View>
                    <TextInput value={subject} onChangeText={setSubject} placeholder="Tantárgy" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                    <TextInput value={examType} onChangeText={setExamType} placeholder="Dolgozat, témazáró vagy vizsga" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                    <TextInput value={topics} onChangeText={setTopics} placeholder="Miből kell felkészülni?" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.surface, color: palette.textPrimary }]} multiline />
                  </View>
                ) : null}
                {itemType === 'workout' ? (
                  <View style={[styles.formGroup, { backgroundColor: palette.background }]}>
                    <View style={styles.fieldHeading}><Ionicons name="barbell-outline" size={16} color={moduleMeta[itemType].color} /><Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Edzésinformációk</Text></View>
                    <TextInput value={coachName} onChangeText={setCoachName} placeholder="Edző neve" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                    <TextInput value={coachContact} onChangeText={setCoachContact} placeholder="Edző elérhetősége" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                    <TextInput value={equipment} onChangeText={setEquipment} placeholder="Szükséges felszerelés" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.surface, color: palette.textPrimary }]} multiline />
                  </View>
                ) : null}
                {itemType === 'meeting' ? (
                  <View style={[styles.formGroup, { backgroundColor: palette.background }]}>
                    <View style={styles.fieldHeading}><Ionicons name="people-outline" size={16} color={moduleMeta[itemType].color} /><Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Napirend</Text></View>
                    <TextInput value={agenda} onChangeText={setAgenda} placeholder="Témák, kérdések és megjegyzések" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.surface, color: palette.textPrimary }]} multiline />
                  </View>
                ) : null}

                {itemType !== 'timetable' ? <TextInput value={detail} onChangeText={setDetail} placeholder="További részletek (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary }]} multiline /> : null}
                <View style={[styles.formGroup, { backgroundColor: palette.background }]}>
                  <View style={styles.fieldHeading}><Ionicons name={itemType === 'homework' || itemType === 'exam' ? 'alarm-outline' : 'location-outline'} size={16} color={moduleMeta[itemType].color} /><Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>{itemType === 'homework' ? 'Beadási határidő' : itemType === 'exam' ? 'A számonkérés időpontja' : 'Időpont és helyszín'}</Text></View>
                  <TextInput value={date} onChangeText={setDate} placeholder="2026-11-07 16:00 (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                  <TextInput value={location} onChangeText={setLocation} placeholder="Helyszín (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, styles.nestedInput, { backgroundColor: palette.surface, color: palette.textPrimary }]} />
                </View>
              </View>
              {pendingItems.length > 0 ? (
                <View style={styles.batchList}>
                  <Text style={[styles.batchTitle, { color: palette.textPrimary }]}>
                    Hozzáadásra vár ({pendingItems.length})
                  </Text>
                  {pendingItems.map((item, index) => (
                    <View
                      key={`${item.title}-${index}`}
                      style={[
                        styles.batchItem,
                        { backgroundColor: palette.background, borderColor: palette.border },
                      ]}
                    >
                      <View style={[styles.batchDot, { backgroundColor: moduleMeta[item.itemType].color }]} />
                      <Text numberOfLines={1} style={[styles.batchItemText, { color: palette.textPrimary }]}>
                        {item.title}
                      </Text>
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
                <Pressable disabled={busy} onPress={addToBatch} style={[styles.addToBatch, { borderColor: moduleMeta[itemType].color }]}>
                  <Ionicons name="add" size={17} color={moduleMeta[itemType].color} />
                  <Text style={{ color: moduleMeta[itemType].color, fontWeight: '900' }}>Újabb elem</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: moduleMeta[itemType].color }]}><Ionicons name="checkmark" size={17} color={palette.white} /><Text style={{ color: palette.white, fontWeight: '900' }}>{busy ? 'Mentés…' : pendingItems.length > 0 ? 'Összes mentése' : 'Mentés'}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  headerTitle: { fontSize: 21, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl },
  heroIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  heroTitle: { fontSize: 17, fontWeight: '900' },
  heroText: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  flex: { flex: 1 },
  childList: { gap: spacing.sm },
  childChip: { padding: spacing.sm, paddingRight: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.round },
  childAvatar: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  childInitial: { fontWeight: '900' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, minHeight: 86, padding: spacing.md, justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.lg, ...shadows.card },
  summaryValue: { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 10, fontWeight: '700' },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionEmpty: { paddingVertical: spacing.sm, fontSize: 12 },
  table: { minWidth: 720, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  tableHeader: { width: 140, padding: spacing.sm, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  tableCell: { width: 140, minHeight: 90, padding: spacing.xs, borderTopWidth: 1, borderRightWidth: 1, gap: spacing.xs },
  tableEmpty: { textAlign: 'center', paddingTop: spacing.lg },
  lesson: { padding: spacing.sm, borderRadius: radius.sm },
  lessonTitle: { fontSize: 11, fontWeight: '900' },
  lessonMeta: { marginTop: 2, fontSize: 9, fontWeight: '800' },
  fieldLabel: { fontSize: 12, fontWeight: '800' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.sm },
  itemCard: { minHeight: 70, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, ...shadows.card },
  itemIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  checkbox: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.sm },
  itemTitle: { fontSize: 13, fontWeight: '900' },
  itemDetail: { marginTop: 3, fontSize: 11 },
  itemMeta: { marginTop: 4, fontSize: 10, fontWeight: '800' },
  completed: { textDecorationLine: 'line-through', color: colors.textMuted },
  empty: { padding: spacing.lg, textAlign: 'center' },
  tip: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg },
  tipText: { flex: 1, fontSize: 11, lineHeight: 17 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#172B4D99' },
  modal: { maxHeight: '92%', paddingTop: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalHero: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg },
  modalIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  modalEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { marginTop: 2, fontSize: 19, fontWeight: '900' },
  modalDescription: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  modalBody: { paddingTop: spacing.lg, gap: spacing.md },
  formSectionTitle: { fontSize: 14, fontWeight: '900' },
  formGroup: { padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg },
  fieldHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  optionLabel: { marginTop: spacing.xs, fontSize: 11, fontWeight: '800' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, fontSize: 14 },
  nestedInput: { minHeight: 44 },
  textArea: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
  batchList: { marginTop: spacing.md, gap: spacing.xs },
  batchTitle: { marginBottom: spacing.xs, fontSize: 12, fontWeight: '900' },
  batchItem: { minHeight: 44, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md },
  batchDot: { width: 8, height: 8, borderRadius: 4 },
  batchItemText: { flex: 1, fontSize: 12, fontWeight: '800' },
  actions: { marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  cancel: { padding: spacing.md },
  addToBatch: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.md },
  save: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
