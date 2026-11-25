import { PresenceDot } from '@/components/presence-dot';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { usePresence } from '@/providers/presence-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { confirmAction, notify, removeFamilyMember } from '@/services/family-remove';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;
type Group = 'adult' | 'child' | 'unknown';
type Person = {
  id: string;
  name: string;
  year: string;
  initial: string;
  color: string;
  group: Group;
};

const avatarColors = ['#D6B38D', '#F3C7B3', '#C9D8E5', '#EAC9A8'];

const groupMeta: Record<Group, { title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  adult: { title: 'Felnőttek', icon: 'people' },
  child: { title: 'Gyermekek', icon: 'happy' },
  unknown: { title: 'További családtagok', icon: 'person' },
};

function getGroup(member: FamilyMember, now: Date): Group {
  if (!member.birth_date) return 'unknown';
  const birth = new Date(member.birth_date);
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age < 18 ? 'child' : 'adult';
}

function toPerson(member: FamilyMember, index: number, now: Date): Person {
  const name = member.nickname?.trim() || member.display_name;
  return {
    id: member.profile_id,
    name,
    year: member.birth_date ? new Date(member.birth_date).getFullYear().toString() : 'Évszám nincs megadva',
    initial: name.charAt(0).toLocaleUpperCase('hu-HU'),
    color: avatarColors[index % avatarColors.length],
    group: getGroup(member, now),
  };
}

function PersonCard({
  person,
  onPress,
  onRemove,
  palette,
}: {
  person: Person;
  onPress: () => void;
  /** Ha meg van adva, szerkesztő módban látszik az eltávolító gomb. */
  onRemove?: () => void;
  palette: Palette;
}) {
  const { isProfileOnline } = usePresence();
  return (
    <View style={styles.personCard}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.name} profiljának megnyitása`}
      style={({ pressed }) => [styles.personPress, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.personAvatar, { backgroundColor: person.color, borderColor: palette.surface }]}>
        <Text style={styles.personInitial}>{person.initial}</Text>
        <PresenceDot
          visible={isProfileOnline(person.id)}
          size={14}
          style={{ right: -3, bottom: 1, borderColor: palette.surface }}
        />
      </View>
      <Text numberOfLines={1} style={[styles.personName, { color: palette.textPrimary }]}>
        {person.name}
      </Text>
      <Text numberOfLines={1} style={[styles.personYear, { color: palette.textMuted }]}>
        {person.year}
      </Text>
    </Pressable>
    {onRemove ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.name} eltávolítása a családból`}
        hitSlop={8}
        onPress={onRemove}
        style={[styles.removeBadge, { backgroundColor: palette.danger, borderColor: palette.surface }]}
      >
        <Ionicons name="remove" size={16} color="#FFFFFF" />
      </Pressable>
    ) : null}
    </View>
  );
}

export default function FamilyTreeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [now] = useState(() => new Date());
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tree' | 'story'>('tree');

  useEffect(() => {
    let active = true;
    void getMyFamilies()
      .then((families) => {
        if (active) setFamilyId(families[0]?.id ?? null);
        return families[0] ? getFamilyMembers(families[0].id) : [];
      })
      .then((members) => {
        if (active) setPeople(members.map((member, index) => toPerson(member, index, now)));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'A családtagok betöltése sikertelen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [now]);

  function openPerson(person: Person) {
    router.push({ pathname: '/family-member-profile', params: { memberId: person.id } });
  }

  async function removePerson(person: Person) {
    if (!familyId) return;
    const confirmed = await confirmAction({
      title: 'Családtag eltávolítása',
      message: `Eltávolítod ${person.name} nevű családtagot a családi körből? Elveszíti a hozzáférést a közös tartalmakhoz.`,
      confirmLabel: 'Eltávolítás',
    });
    if (!confirmed) return;
    try {
      await removeFamilyMember(familyId, person.id);
      setPeople((current) => current.filter((item) => item.id !== person.id));
    } catch (caught) {
      notify('Az eltávolítás nem sikerült', caught instanceof Error ? caught.message : 'Próbáld újra később.');
    }
  }

  const groups = (['adult', 'child', 'unknown'] as const)
    .map((group) => ({ group, members: people.filter((person) => person.group === group) }))
    .filter((entry) => entry.members.length > 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.background }]}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Családfa</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editMode ? 'Szerkesztés befejezése' : 'Családtagok szerkesztése'}
          onPress={() => setEditMode((current) => !current)}
          style={styles.headerSpacer}
        >
          <Ionicons
            name={editMode ? 'checkmark-circle' : 'create-outline'}
            size={26}
            color={editMode ? palette.success : palette.primary}
          />
        </Pressable>
      </View>

      <View style={[styles.tabs, { backgroundColor: palette.surfaceElevated }]} accessibilityRole="tablist">
        {(
          [
            ['tree', 'Családfa'],
            ['story', 'Történet'],
          ] as const
        ).map(([key, label]) => {
          const active = activeTab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setActiveTab(key)}
              style={[styles.tab, active && [{ backgroundColor: palette.primary }, shadows.floating]]}
            >
              <Text style={[styles.tabText, { color: active ? '#FFFFFF' : palette.textSecondary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>A család története és kapcsolatai</Text>

        {activeTab === 'story' ? (
          <View style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name="book-outline" size={28} color={palette.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: palette.textPrimary }]}>A családi történet hamarosan érkezik</Text>
            <Text style={[styles.stateText, { color: palette.textMuted }]}>
              Itt láthatod majd a család fontos pillanatait időrendben.
            </Text>
          </View>
        ) : (
          <>
            {error ? (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: isDark ? '#3B1622' : '#FFF1F3',
                    borderColor: isDark ? '#7F2439' : '#F8C8D0',
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={palette.danger} />
                <Text style={[styles.errorText, { color: isDark ? '#FDA4AF' : '#A52A3A' }]}>{error}</Text>
              </View>
            ) : null}

            {loading ? <ActivityIndicator color={palette.primary} size="large" style={styles.loader} /> : null}

            {!loading && !error && people.length === 0 ? (
              <View style={[styles.stateCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.stateIcon, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name="people-outline" size={28} color={palette.primary} />
                </View>
                <Text style={[styles.stateTitle, { color: palette.textPrimary }]}>
                  Még nincs megjeleníthető családtag
                </Text>
                <Text style={[styles.stateText, { color: palette.textMuted }]}>
                  Hívd meg a családtagokat, hogy itt megjelenjenek.
                </Text>
              </View>
            ) : null}

            {groups.length > 0 ? (
              <View style={[styles.tree, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                {groups.map((entry, index) => (
                  <View key={entry.group}>
                    {index > 0 ? (
                      <View style={styles.connector}>
                        <View style={[styles.connectorLine, { backgroundColor: palette.borderStrong }]} />
                        <View style={[styles.connectorDot, { backgroundColor: palette.borderStrong }]} />
                      </View>
                    ) : null}
                    <View style={styles.generationHeader}>
                      <Ionicons name={groupMeta[entry.group].icon} size={14} color={palette.primary} />
                      <Text style={[styles.generation, { color: palette.textMuted }]}>
                        {groupMeta[entry.group].title.toUpperCase()}
                      </Text>
                      <View style={[styles.generationCount, { backgroundColor: palette.primarySoft }]}>
                        <Text style={[styles.generationCountText, { color: palette.primary }]}>
                          {entry.members.length}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.grid}>
                      {entry.members.map((person) => (
                        <PersonCard
                          key={person.id}
                          person={person}
                          onPress={() => openPerson(person)}
                          onRemove={editMode && person.id !== profile?.id ? () => void removePerson(person) : undefined}
                          palette={palette}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/invite-member')}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: palette.primary },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="person-add" size={19} color="#FFFFFF" />
              <Text style={styles.addText}>Családtag hozzáadása</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
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
  headerSpacer: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.5 },
  tabs: {
    marginHorizontal: spacing.lg,
    padding: 4,
    flexDirection: 'row',
    borderRadius: radius.round,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  tabText: { fontWeight: '800' },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  subtitle: { fontSize: 13, textAlign: 'center' },
  loader: { paddingVertical: 50 },
  tree: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  generationHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  generation: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  generationCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  generationCountText: { fontSize: 11, fontWeight: '900' },
  connector: { alignItems: 'center', marginVertical: spacing.md },
  connectorLine: { width: 2, height: 22 },
  connectorDot: { width: 8, height: 8, marginTop: -1, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  personCard: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
  },
  personPress: { alignItems: 'center' },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: '22%',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
  },
  personAvatar: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    borderWidth: 3,
    ...shadows.card,
  },
  personInitial: { color: '#3B2415', fontSize: 23, fontWeight: '900' },
  personName: { marginTop: 6, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  personYear: { marginTop: 2, fontSize: 11, textAlign: 'center' },
  stateCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  stateIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30 },
  stateTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  stateText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  errorCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  addButton: {
    minHeight: 54,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    ...shadows.floating,
  },
  addText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});