import { colors, radius, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const sections = [
  ['Milyen adatokat kezelünk?', 'A FamilyHub a családi használathoz szükséges profil-, családi kapcsolat-, esemény-, üzenet-, profilkép- és – ha bekapcsoljátok – hely- vagy gyógyszeradatokat tárolhat.'],
  ['Ki láthatja ezeket?', 'Az adatokat csak a hozzájuk tartozó család és a beszélgetések résztvevői láthatják. A helymegosztást külön kell bekapcsolni, gyermekeknél pedig csak a kijelölt gondviselők számára használható.'],
  ['Hol tárolódnak?', 'Az alkalmazás adatai a FamilyHub Supabase adatbázisában és tárhelyén vannak. A helyszínkereséshez a beírt keresési szöveg külső geokódoló szolgáltatáshoz kerülhet.'],
  ['Meddig maradnak meg?', 'Az adatokat addig tartjuk meg, amíg a családi használathoz szükségesek, vagy amíg a felhasználó/adminisztrátor nem kéri a törlésüket. A prototípusban a törlés jelenleg adminisztrátori művelettel végezhető.'],
  ['Kérdés vagy törlési igény', 'Kérdés, hozzáférési vagy törlési igény esetén fordulj az alkalmazás készítőjéhez. Az alkalmazás szakdolgozati, szűk családi prototípus; nem nyilvános szolgáltatás.'],
] as const;

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Vissza">
          <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Adatvédelem</Text>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.success} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Ionicons name="information-circle" size={23} color={colors.primary} />
          <Text style={styles.introText}>Ez a tájékoztató a FamilyHub jelenlegi, szakdolgozati és szűk családi prototípusára vonatkozik.</Text>
        </View>
        {sections.map(([title, text]) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionText}>{text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  intro: { padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  introText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  section: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  sectionTitle: { marginBottom: spacing.sm, color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  sectionText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
