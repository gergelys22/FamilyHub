import { colors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Person = { name: string; year: string; initial: string; color: string };
const grandparents: Person[] = [
  { name: 'Nagyapa', year: '1952–2020', initial: 'N', color: '#D6B38D' },
  { name: 'Nagymama', year: '1955–2023', initial: 'N', color: '#F3C7B3' },
];
const parents: Person[] = [
  { name: 'Apa', year: '1980', initial: 'A', color: '#C9D8E5' },
  { name: 'Anya', year: '1982', initial: 'A', color: '#EAC9A8' },
];
const children: Person[] = [
  { name: 'Anna', year: '2010', initial: 'A', color: '#F3C7B3' },
  { name: 'Bence', year: '2012', initial: 'B', color: '#C9D8E5' },
  { name: 'Lili', year: '2015', initial: 'L', color: '#EAC9A8' },
  { name: 'Máté', year: '2018', initial: 'M', color: '#D6B38D' },
];

function PersonCard({ person }: { person: Person }) {
  return (
    <Pressable style={({ pressed }) => [styles.personCard, pressed && styles.pressed]} onPress={() => Alert.alert(person.name, 'A családtag profilja hamarosan szerkeszthető.')}>
      <View style={[styles.personAvatar, { backgroundColor: person.color }]}><Text style={styles.personInitial}>{person.initial}</Text></View>
      <Text style={styles.personName}>{person.name}</Text>
      <Text style={styles.personYear}>{person.year}</Text>
    </Pressable>
  );
}

export default function FamilyTreeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={colors.textPrimary} /></Pressable>
        <Text style={styles.title}>Családfa</Text>
        <Ionicons name="options-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.tabs}><View style={styles.activeTab}><Text style={styles.activeTabText}>Családfa</Text></View><View style={styles.tab}><Text style={styles.tabText}>Történet</Text></View></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>A család története és kapcsolatai</Text>
        <View style={styles.tree}>
          <Text style={styles.generation}>NAGYSZÜLŐK</Text>
          <View style={styles.row}>{grandparents.map((person) => <PersonCard key={person.name} person={person} />)}</View>
          <View style={styles.connectorVertical} />
          <Text style={styles.generation}>SZÜLŐK</Text>
          <View style={styles.row}>{parents.map((person) => <PersonCard key={person.name} person={person} />)}</View>
          <View style={styles.connectorVertical} />
          <Text style={styles.generation}>GYERMEKEK</Text>
          <View style={styles.childrenRow}>{children.map((person) => <PersonCard key={person.name} person={person} />)}</View>
        </View>
        <Pressable onPress={() => router.push('/invite-member')} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Ionicons name="add" size={22} color={colors.white} /><Text style={styles.addText}>Családtag hozzáadása</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' },
  tabs: { marginHorizontal: spacing.lg, padding: 4, flexDirection: 'row', borderRadius: radius.round, backgroundColor: '#EEF4FC' },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  activeTab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.primary, ...shadows.floating },
  tabText: { color: colors.textSecondary, fontWeight: '800' }, activeTabText: { color: colors.white, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: 40 }, subtitle: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: spacing.md },
  tree: { padding: spacing.md, borderRadius: radius.xl, backgroundColor: '#F7FBFF', ...shadows.card },
  generation: { marginVertical: spacing.sm, color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-evenly', gap: spacing.sm }, childrenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  personCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, minWidth: 64 }, personAvatar: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, borderWidth: 3, borderColor: colors.white, ...shadows.card }, personInitial: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' }, personName: { marginTop: 5, color: colors.textPrimary, fontSize: 12, fontWeight: '900' }, personYear: { marginTop: 2, color: colors.textMuted, fontSize: 10 },
  connectorVertical: { alignSelf: 'center', width: 2, height: 24, backgroundColor: colors.borderStrong }, addButton: { minHeight: 54, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.primary, ...shadows.floating }, addText: { color: colors.white, fontSize: 14, fontWeight: '900' }, pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
