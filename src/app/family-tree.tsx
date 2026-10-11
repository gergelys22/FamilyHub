import { colors, radius, shadows, spacing } from '@/constants/theme';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

type Person = { id: string; name: string; year: string; initial: string; color: string };
const avatarColors = ['#D6B38D', '#F3C7B3', '#C9D8E5', '#EAC9A8'];
function toPerson(member: FamilyMember, index: number): Person {
  const name = member.nickname?.trim() || member.display_name;
  return { id: member.profile_id, name, year: member.birth_date ? new Date(member.birth_date).getFullYear().toString() : 'Évszám nincs megadva', initial: name.charAt(0).toLocaleUpperCase('hu-HU'), color: avatarColors[index % avatarColors.length] };
}

function PersonCard({ person, onPress }: { person: Person; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.personCard, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.personAvatar, { backgroundColor: person.color }]}>
        <Text style={styles.personInitial}>{person.initial}</Text>
      </View>
      <Text style={styles.personName}>{person.name}</Text>
      <Text style={styles.personYear}>{person.year}</Text>
    </Pressable>
  );
}

export default function FamilyTreeScreen() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getMyFamilies()
      .then((families) => families[0] ? getFamilyMembers(families[0].id) : [])
      .then((members) => setPeople(members.map(toPerson)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'A családtagok betöltése sikertelen.'));
  }, []);
  function openPerson(person: Person) {
    router.push({ pathname: '/family-member-profile', params: { memberId: person.id } });
  }
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Családfa</Text>
        <Ionicons name="options-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.tabs}>
        <View style={styles.activeTab}>
          <Text style={styles.activeTabText}>Családfa</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabText}>Történet</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>A család története és kapcsolatai</Text>
        {error ? <Text style={styles.subtitle}>{error}</Text> : null}
        <View style={styles.tree}>
          <Text style={styles.generation}>CSALÁDTAGOK</Text>
          <View style={styles.childrenRow}>
            {people.map((person) => (
              <PersonCard
                key={person.name}
                person={person}
                onPress={() => openPerson(person)}
              />
            ))}
          </View>
          {people.length === 0 && !error ? <Text style={styles.subtitle}>Még nincs megjeleníthető családtag.</Text> : null}
        </View>
        <Pressable
          onPress={() => router.push('/invite-member')}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={22} color={colors.white} />
          <Text style={styles.addText}>Családtag hozzáadása</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
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
    backgroundColor: colors.surface,
  },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' },
  tabs: {
    marginHorizontal: spacing.lg,
    padding: 4,
    flexDirection: 'row',
    borderRadius: radius.round,
    backgroundColor: '#EEF4FC',
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  activeTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  tabText: { color: colors.textSecondary, fontWeight: '800' },
  activeTabText: { color: colors.white, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: 40 },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  tree: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: '#F7FBFF',
    ...shadows.card,
  },
  generation: {
    marginVertical: spacing.sm,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-evenly', gap: spacing.sm },
  childrenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  personCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minWidth: 64,
  },
  personAvatar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.card,
  },
  personInitial: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  personName: {
    marginTop: 5,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  personYear: { marginTop: 2, color: colors.textMuted, fontSize: 10 },
  connectorVertical: {
    alignSelf: 'center',
    width: 2,
    height: 24,
    backgroundColor: colors.borderStrong,
  },
  addButton: {
    minHeight: 54,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  addText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
