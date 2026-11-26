import { ActionSheet, ConfirmDialog, type SheetAction } from '@/components/action-sheet';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import {
  deleteMedication,
  getMedications,
  saveMedication,
  saveMedications,
  type Medication,
} from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
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
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [menuTarget, setMenuTarget] = useState<Medication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);

  function notify(title: string, message: string) {
    setNotice({ title, message });
  }
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
        notify(
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
      notify('Hiányzó adat', 'Add meg a gyógyszer nevét és adagját.');
      return;
    }

    const item = buildCurrentItem();

    if (item === false) {
      notify(
        'Hibás dátum',
        'Az időpontnál használd a 2026-10-11 09:30, a lejáratnál a 2026-10-11 formátumot.',
      );
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
        notify('Hiányzó adat', 'Add meg a gyógyszer nevét és adagját.');
        return;
      }

      if (item === false) {
        notify('Hibás dátum', 'Ellenőrizd az időpontok formátumát.');
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
        notify('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
      } finally {
        setBusy(false);
      }

      return;
    }

    const itemsToSave = [...pendingItems];

    if (name.trim()) {
      const current = buildCurrentItem();

      if (current === false) {
        notify('Hibás dátum', 'Ellenőrizd az időpontok formátumát.');
        return;
      }

      if (current) itemsToSave.push(current);
    }

    if (itemsToSave.length === 0) {
      notify('Hiányzó adat', 'Adj meg legalább egy gyógyszert.');
      return;
    }

    setBusy(true);

    try {
      await saveMedications(
        itemsToSave.map((item) => ({
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
        })),
      );

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
      await deleteMedication(item.id);
      await reload();
    } catch (error) {
      notify('Hiba', error instanceof Error ? error.message : 'A törlés sikertelen.');
    }
  }

  async function toggleActive(item: Medication) {
    if (!familyId || !profile?.id) return;

    try {
      await saveMedication({
        id: item.id,
        familyId,
        profileId: profile.id,
        personProfileId: item.person_profile_id,
        name: item.name,
        dosageText: item.dosage_text ?? '',
        instructions: item.instructions ?? '',
        nextAt: item.next_at,
        frequency: item.frequency ?? 'Napi',
        scheduleTime: item.schedule_time ?? '',
        isActive: !item.is_active,
        endsOn: item.ends_on,
      });
      await reload();
    } catch (error) {
      notify('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
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
            setTimeout(() => openForm(item), 250);
          },
        },
        {
          key: 'toggle',
          label: menuTarget.is_active ? 'Inaktiválás' : 'Újra aktiválás',
          icon: menuTarget.is_active ? 'pause-circle-outline' : 'play-circle-outline',
          onPress: () => {
            const item = menuTarget;
            setMenuTarget(null);
            void toggleActive(item);
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

  const filteredItems = [...items]
    .filter((item) => {
      const person = members.find((member) => member.profile_id === item.person_profile_id);
      const searchable =
        `${item.name} ${item.dosage_text ?? ''} ${item.instructions ?? ''} ${person?.display_name ?? ''}`
          .toLocaleLowerCase('hu-HU');

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
    });

  const activeCount = items.filter((item) => item.is_active).length;

  function renderOption(
    selected: boolean,
    label: string,
    onPress: () => void,
  ) {
    return (
      <Pressable
        key={label}
        onPress={onPress}
        style={[
          styles.option,
          {
            backgroundColor: selected ? palette.primary : palette.surfaceElevated,
            borderColor: selected ? palette.primary : palette.border,
          },
        ]}
      >
        <Text style={{ color: selected ? colors.white : palette.textSecondary, fontWeight: '800' }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Gyógyszerek</Text>
          <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>
            Családi gyógyszerlista
          </Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: isDark ? '#47283B' : '#FFE8F0' }]}>
          <Ionicons name="medkit" size={21} color={colors.pink} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.search,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={palette.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Gyógyszer keresése..."
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.textPrimary }]}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={19} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Gyógyszer szűrők"
          onPress={() => setFilterVisible(true)}
          style={[
            styles.filterButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Ionicons name="options-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: isDark ? '#352333' : '#FFF1F5',
              borderColor: isDark ? '#58374D' : '#F6D6E1',
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="medkit" size={26} color={colors.pink} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>
                Gyógyszeradagok és ütemezés
              </Text>
              <Text style={[styles.heroText, { color: palette.textSecondary }]}>
                Minden fontos információ egy helyen, személyekhez és időpontokhoz rendelve.
              </Text>
            </View>
          </View>

          <View style={[styles.heroDivider, { backgroundColor: isDark ? '#674456' : '#F0D3DF' }]} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: palette.textPrimary }]}>{items.length}</Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Összes</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#674456' : '#F0D3DF' }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: colors.pink }]}>{activeCount}</Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Aktív</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#674456' : '#F0D3DF' }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: palette.textPrimary }]}>
                {items.length - activeCount}
              </Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Inaktív</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              Gyógyszerlista
            </Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>
              {filteredItems.length} találat
            </Text>
          </View>
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={[styles.sortChip, { backgroundColor: palette.surfaceElevated }]}
          >
            <Ionicons name="filter-outline" size={15} color={palette.primary} />
            <Text style={[styles.sortChipText, { color: palette.primary }]}>Szűrés</Text>
          </Pressable>
        </View>

        {filteredItems.map((item) => {
          const person = members.find((member) => member.profile_id === item.person_profile_id);

          return (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Pressable
                onPress={() => openForm(item)}
                onLongPress={() => setMenuTarget(item)}
                style={styles.cardMain}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} szerkesztése`}
              >
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: isDark ? '#47283B' : '#FFF0F5' },
                ]}
              >
                <Ionicons name="medical-outline" size={25} color={colors.pink} />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.name, { color: palette.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: item.is_active
                          ? isDark ? '#244438' : '#E5F6ED'
                          : palette.surfaceMuted,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.is_active ? '#35A66C' : palette.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: item.is_active ? '#35A66C' : palette.textMuted },
                      ]}
                    >
                      {item.is_active ? 'Aktív' : 'Inaktív'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.dose, { color: palette.textSecondary }]}>
                  {item.dosage_text ?? 'Adagolás nincs megadva'}
                </Text>

                <View style={styles.tagsRow}>
                  {item.frequency ? (
                    <View style={[styles.infoTag, { backgroundColor: palette.surfaceElevated }]}>
                      <Ionicons name="repeat-outline" size={12} color={palette.textSecondary} />
                      <Text style={[styles.infoTagText, { color: palette.textSecondary }]}>
                        {item.frequency}
                      </Text>
                    </View>
                  ) : null}

                  {person ? (
                    <View style={[styles.infoTag, { backgroundColor: palette.surfaceElevated }]}>
                      <Ionicons name="person-outline" size={12} color={palette.textSecondary} />
                      <Text style={[styles.infoTagText, { color: palette.textSecondary }]}>
                        {person.nickname || person.display_name}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {item.schedule_time ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color={palette.textMuted} />
                    <Text style={[styles.detailText, { color: palette.textMuted }]}>
                      Bevétel: {item.schedule_time}
                    </Text>
                  </View>
                ) : null}

                {item.next_at ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={14} color={palette.textMuted} />
                    <Text style={[styles.detailText, { color: palette.textMuted }]}>
                      Következő: {new Date(item.next_at).toLocaleString('hu-HU', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ) : null}

                {item.instructions ? (
                  <Text numberOfLines={2} style={[styles.instructions, { color: palette.textMuted }]}>
                    {item.instructions}
                  </Text>
                ) : null}
              </View>

              </Pressable>

              <Pressable
                onPress={() => setMenuTarget(item)}
                hitSlop={8}
                style={styles.cardAction}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} műveletei`}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={palette.textMuted} />
              </Pressable>
            </View>
          );
        })}

        {filteredItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#47283B' : '#FFF0F5' }]}>
              <Ionicons name="medkit-outline" size={30} color={colors.pink} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
              {items.length === 0 ? 'Még nincs gyógyszer' : 'Nincs találat'}
            </Text>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {items.length === 0
                ? 'Add hozzá a család gyógyszereit, hogy minden fontos adat kéznél legyen.'
                : 'Próbálj más keresési kifejezést vagy módosítsd a szűrőket.'}
            </Text>
            {items.length === 0 ? (
              <Pressable onPress={() => openForm()} style={[styles.emptyButton, { backgroundColor: palette.primary }]}>
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.emptyButtonText}>Gyógyszer hozzáadása</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={[styles.hint, { color: palette.textMuted }]}>
          Tipp: koppints egy gyógyszerre a szerkesztéshez, vagy használd a ⋮ gombot további műveletekhez.
        </Text>
      </ScrollView>

      <Pressable
        onPress={() => openForm()}
        style={[styles.fab, { backgroundColor: palette.primary }]}
        accessibilityLabel="Új gyógyszer hozzáadása"
      >
        <Ionicons name="add" size={31} color={colors.white} />
      </Pressable>

      {/* Szűrők */}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.42)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.filterHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Gyógyszerszűrők</Text>
                  <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>
                    Állítsd be, mit szeretnél látni
                  </Text>
                </View>
                <Pressable onPress={() => setFilterVisible(false)} hitSlop={10} style={[styles.closeButton, { backgroundColor: palette.surfaceElevated }]}>
                  <Ionicons name="close" size={21} color={palette.textSecondary} />
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>RENDEZÉS</Text>
              <View style={styles.optionRow}>
                {([
                  ['name', 'ABC'],
                  ['next', 'Következő bevétel'],
                  ['person', 'Személy'],
                ] as const).map(([value, label]) =>
                  renderOption(sortBy === value, label, () => setSortBy(value)),
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>ÁLLAPOT</Text>
              <View style={styles.optionRow}>
                {([
                  ['all', 'Mind'],
                  ['active', 'Aktív'],
                  ['inactive', 'Inaktív'],
                ] as const).map(([value, label]) =>
                  renderOption(statusFilter === value, label, () => setStatusFilter(value)),
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>GYAKORISÁG</Text>
              <View style={styles.optionRow}>
                {(['all', 'Napi', 'Rendszeres', 'Szükség esetén'] as const).map((value) =>
                  renderOption(
                    frequencyFilter === value,
                    value === 'all' ? 'Mind' : value,
                    () => setFrequencyFilter(value),
                  ),
                )}
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    setStatusFilter('all');
                    setFrequencyFilter('all');
                    setSortBy('name');
                    setSearch('');
                  }}
                  style={styles.cancel}
                >
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>
                    Szűrők törlése
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFilterVisible(false)}
                  style={[styles.save, { backgroundColor: palette.primary }]}
                >
                  <Text style={styles.saveText}>Megjelenítés</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gyógyszer hozzáadása / szerkesztése */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.42)' }]}>
          <View style={[styles.modal, styles.formModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.modalHandle} />

              <View style={styles.filterHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                    {editing ? 'Gyógyszer szerkesztése' : 'Új gyógyszer'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>
                    Add meg a gyógyszer adatait
                  </Text>
                </View>
                <Pressable onPress={() => setVisible(false)} hitSlop={10} style={[styles.closeButton, { backgroundColor: palette.surfaceElevated }]}>
                  <Ionicons name="close" size={21} color={palette.textSecondary} />
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>GYÓGYSZER ADATAI</Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Gyógyszer neve"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
              />

              <TextInput
                value={dosage}
                onChangeText={setDosage}
                placeholder="Adagolás, például 10 mg"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
              />

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>GYAKORISÁG</Text>
              <View style={styles.optionRow}>
                {(['Napi', 'Rendszeres', 'Szükség esetén'] as const).map((option) =>
                  renderOption(frequency === option, option, () => setFrequency(option)),
                )}
              </View>

              {members.length > 0 ? (
                <>
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>KINEK SZÓL?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                    {renderOption(!personProfileId, 'Család', () => setPersonProfileId(null))}
                    {members.map((member) => (
                      <View key={member.profile_id}>
                        {renderOption(
                          personProfileId === member.profile_id,
                          member.nickname || member.display_name,
                          () => setPersonProfileId(member.profile_id),
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>IDŐZÍTÉS</Text>

              <TextInput
                value={scheduleTime}
                onChangeText={setScheduleTime}
                placeholder="Bevétel időpontja, például reggel 08:00"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
              />

              <TextInput
                value={nextAt}
                onChangeText={setNextAt}
                placeholder="Következő bevétel: 2026-10-11 09:30"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
              />

              <TextInput
                value={endsOn}
                onChangeText={setEndsOn}
                placeholder="Lejárat/vége: 2026-10-11 (opcionális)"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
              />

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>MEGJEGYZÉS</Text>

              <TextInput
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Utasítás vagy megjegyzés"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
                multiline
              />

              <View style={[styles.activeRow, { backgroundColor: palette.surfaceElevated }]}>
                <View>
                  <Text style={[styles.activeTitle, { color: palette.textPrimary }]}>Aktív gyógyszer</Text>
                  <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>
                    Jelenleg használatban van
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: palette.border, true: palette.primaryLight }}
                  thumbColor={isActive ? colors.white : undefined}
                />
              </View>

              {!editing && pendingItems.length > 0 ? (
                <View style={styles.batchList}>
                  <Text style={[styles.batchTitle, { color: palette.textPrimary }]}>
                    Hozzáadásra vár ({pendingItems.length})
                  </Text>
                  {pendingItems.map((item, index) => (
                    <View
                      key={`${item.name}-${index}`}
                      style={[styles.batchItem, { backgroundColor: palette.background, borderColor: palette.border }]}
                    >
                      <View style={[styles.batchDot, { backgroundColor: colors.pink }]} />
                      <Text numberOfLines={1} style={[styles.batchItemText, { color: palette.textPrimary }]}>
                        {item.name}
                      </Text>
                      <Pressable
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
                <Pressable onPress={() => setVisible(false)} style={styles.cancel}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
                </Pressable>

                {!editing ? (
                  <Pressable
                    disabled={busy}
                    onPress={addToBatch}
                    style={[styles.addToBatch, { borderColor: palette.primary }]}
                  >
                    <Ionicons name="add" size={17} color={palette.primary} />
                    <Text style={{ color: palette.primary, fontWeight: '900' }}>Újabb</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  disabled={busy}
                  onPress={() => void save()}
                  style={[styles.save, { backgroundColor: palette.primary, opacity: busy ? 0.7 : 1 }]}
                >
                  <Text style={styles.saveText}>
                    {busy ? 'Mentés…' : !editing && pendingItems.length > 0 ? 'Összes mentése' : 'Mentés'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
          {visible ? noticeDialog : null}
        </View>
      </Modal>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name ?? ''}
        subtitle={menuTarget?.dosage_text ?? undefined}
        actions={menuActions}
        onClose={() => setMenuTarget(null)}
        palette={palette}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Gyógyszer törlése"
        message={`Törlöd a(z) ${deleteTarget?.name ?? ''} gyógyszert?`}
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

  header: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: { flex: 1, marginLeft: spacing.md },
  title: { fontSize: 25, fontWeight: '900', letterSpacing: -0.7 },
  headerSubtitle: { marginTop: 2, fontSize: 11, fontWeight: '600' },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 17,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  filterButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 17,
  },

  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },

  hero: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 23,
    gap: spacing.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFDCE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  heroText: { marginTop: 5, fontSize: 11, lineHeight: 17 },
  heroDivider: { height: 1, marginVertical: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNumber: { fontSize: 21, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700' },
  statDivider: { width: 1, height: 28 },

  sectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
  sectionSubtitle: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.round,
  },
  sortChipText: { fontSize: 11, fontWeight: '800' },

  card: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 20,
    ...shadows.card,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 5 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '900' },
  dose: { fontSize: 12, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '900' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  infoTag: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.round,
  },
  infoTagText: { fontSize: 10, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  detailText: { fontSize: 10, fontWeight: '500' },
  instructions: { marginTop: 3, fontSize: 10, lineHeight: 15 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardAction: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },

  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyText: { marginTop: 7, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.lg,
  },
  emptyButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  hint: { marginTop: spacing.xs, fontSize: 10, lineHeight: 15, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 92,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    ...shadows.floating,
  },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    maxHeight: '88%',
    borderTopWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  formModal: { maxHeight: '94%' },
  modalContent: { padding: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A0A0A0',
    alignSelf: 'center',
    marginBottom: spacing.xs,
    opacity: 0.45,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.5 },
  modalSubtitle: { marginTop: 4, fontSize: 11, fontWeight: '500' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 15,
    fontSize: 13,
  },
  textArea: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' },
  fieldLabel: { marginTop: spacing.xs, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
  },
  activeRow: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
  },
  activeTitle: { fontSize: 13, fontWeight: '900' },
  batchList: { gap: spacing.xs },
  batchTitle: { marginBottom: spacing.xs, fontSize: 12, fontWeight: '900' },
  batchItem: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 13,
  },
  batchDot: { width: 8, height: 8, borderRadius: 4 },
  batchItemText: { flex: 1, fontSize: 12, fontWeight: '800' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancel: { padding: spacing.md },
  addToBatch: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 14,
  },
  save: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  saveText: { color: colors.white, fontWeight: '900' },
});