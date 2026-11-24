
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const sections = [
  {
    title: 'Milyen adatokat kezelünk?',
    text: 'A FamilyHub a családi használathoz szükséges profil-, családi kapcsolat-, esemény-, üzenet-, profilkép- és – ha bekapcsoljátok – hely- vagy gyógyszeradatokat tárolhat.',
    icon: 'folder-open-outline',
    color: '#6489E8',
  },
  {
    title: 'Ki láthatja ezeket?',
    text: 'Az adatokat csak a hozzájuk tartozó család és a beszélgetések résztvevői láthatják. A helymegosztást külön kell bekapcsolni, gyermekeknél pedig csak a kijelölt gondviselők számára használható.',
    icon: 'people-outline',
    color: '#36A887',
  },
  {
    title: 'Hol tárolódnak?',
    text: 'Az alkalmazás adatai a FamilyHub Supabase adatbázisában és tárhelyén vannak. A helyszínkereséshez a beírt keresési szöveg külső geokódoló szolgáltatáshoz kerülhet.',
    icon: 'cloud-outline',
    color: '#9A78D8',
  },
  {
    title: 'Meddig maradnak meg?',
    text: 'Az adatokat addig tartjuk meg, amíg a családi használathoz szükségesek, vagy amíg a felhasználó/adminisztrátor nem kéri a törlésüket. A prototípusban a törlés jelenleg adminisztrátori művelettel végezhető.',
    icon: 'time-outline',
    color: '#D69A45',
  },
  {
    title: 'Kérdés vagy törlési igény',
    text: 'Kérdés, hozzáférési vagy törlési igény esetén fordulj az alkalmazás készítőjéhez. Az alkalmazás szakdolgozati, szűk családi prototípus; nem nyilvános szolgáltatás.',
    icon: 'chatbubble-ellipses-outline',
    color: '#D77991',
  },
] as const;

export default function PrivacyScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
          Adatvédelem
        </Text>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={21} color={colors.success} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: palette.surface }]}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="shield-checkmark"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>
            A családotok adatai fontosak.
          </Text>

          <Text style={[styles.heroText, { color: palette.textSecondary }]}>
            Szeretnénk átláthatóvá tenni, milyen adatokat kezel a FamilyHub,
            és hogyan gondoskodunk azok védelméről.
          </Text>

          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.noticeText}>
              Ez a tájékoztató a FamilyHub jelenlegi, szakdolgozati és szűk
              családi prototípusára vonatkozik.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>
            TUDNIVALÓK
          </Text>
          <Text style={[styles.sectionHeadingTitle, { color: palette.textPrimary }]}>
            Hogyan kezeljük az adatokat?
          </Text>
        </View>

        {sections.map((section, index) => (
          <View
            key={section.title}
            style={[
              styles.section,
              { backgroundColor: palette.surface },
            ]}
          >
            <View style={styles.sectionTop}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${section.color}18` },
                ]}
              >
                <Ionicons
                  name={section.icon}
                  size={22}
                  color={section.color}
                />
              </View>

              <View style={styles.sectionTitleContainer}>
                <Text style={[styles.sectionNumber, { color: palette.textSecondary }]}>
                  0{index + 1}
                </Text>
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                  {section.title}
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionText, { color: palette.textSecondary }]}>
              {section.text}
            </Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Ionicons
            name="heart"
            size={15}
            color={colors.primary}
          />
          <Text style={[styles.footerText, { color: palette.textSecondary }]}>
            FamilyHub – együtt, biztonságban.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '900',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  hero: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 22,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  noticeText: {
    flex: 1,
    color: colors.primary,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },
  sectionHeading: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: 5,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sectionHeadingTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  section: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  sectionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
    gap: 3,
  },
  sectionNumber: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
