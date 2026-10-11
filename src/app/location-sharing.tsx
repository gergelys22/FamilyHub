import { colors, radius, shadows, spacing } from '@/constants/theme';
import { darkColors } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

function getAge(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
}

export default function LocationSharingScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getMyFamilies()
      .then((families) => families[0] ? getFamilyMembers(families[0].id) : [])
      .then((result) => setMembers(result.filter((member) => {
        const age = getAge(member.birth_date);
        return age !== null && age < 14;
      })))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'A családtagok betöltése sikertelen.'));
  }, []);
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={palette.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: palette.textPrimary }]}>Helymegosztás</Text>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.success} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.notice, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="information-circle" size={22} color={colors.primary} />
          <Text style={[styles.noticeText, { color: palette.textSecondary }]}>
            A 14 éven aluli családtagok helye csak a szülők és gondviselők számára
            látható.
          </Text>
        </View>
        <View style={[styles.map, { backgroundColor: palette.surface }]}>
          <Ionicons name="map" size={46} color={colors.primary} />
          <Text style={[styles.mapTitle, { color: palette.textPrimary }]}>Családi térkép</Text>
          <Text style={[styles.mapText, { color: palette.textMuted }]}>
            A térképes követés megnyitásához válassz ki egy családtagot.
          </Text>
        </View>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>14 éven aluli gyermekek</Text>
        {error ? <Text style={[styles.updated, { color: palette.textMuted }]}>{error}</Text> : null}
        {members.map((member) => {
          const childName = member.nickname?.trim() || member.display_name;
          const age = getAge(member.birth_date);
          return (
          <Pressable
            key={member.profile_id}
            onPress={() => {
              setSelectedChild(member.profile_id);
              Alert.alert(childName, sharingEnabled ? 'Nincs elérhető friss helyadat.' : 'A helymegosztás ki van kapcsolva.');
            }}
            style={({ pressed }) => [
              [styles.card, { backgroundColor: palette.surface }],
              selectedChild === member.profile_id && styles.selectedCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: '#C9D8E5' }]}>
              <Text style={styles.avatarText}>{childName.charAt(0).toLocaleUpperCase('hu-HU')}</Text>
              <View style={styles.online} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.name, { color: palette.textPrimary }]}>
                {childName} <Text style={styles.age}>{age === null ? 'Életkor nincs megadva' : `${age} éves`}</Text>
              </Text>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location"
                  size={15}
                  color={sharingEnabled ? colors.success : colors.textMuted}
                />
                <Text style={styles.location}>
                  {sharingEnabled ? 'Nincs elérhető helyadat' : 'Helymegosztás kikapcsolva'}
                </Text>
              </View>
              <Text style={[styles.updated, { color: palette.textMuted }]}>
                {sharingEnabled ? 'Nincs aktív helyadat' : 'Nincs aktív helyadat'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
          </Pressable>
          );
        })}
        {members.length === 0 && !error ? <Text style={[styles.updated, { color: palette.textMuted }]}>Nincs rögzített, 14 éven aluli családtag.</Text> : null}
        <View style={[styles.settingsCard, { backgroundColor: palette.surface }]}>
          <View style={styles.settingsText}>
            <Text style={[styles.settingsTitle, { color: palette.textPrimary }]}>
              Helymegosztás {sharingEnabled ? 'bekapcsolva' : 'kikapcsolva'}
            </Text>
            <Text style={[styles.settingsSubtitle, { color: palette.textMuted }]}>A gondviselők értesítést kapnak.</Text>
          </View>
          <Switch
            value={sharingEnabled}
            onValueChange={setSharingEnabled}
            trackColor={{ false: colors.border, true: '#9BE5D5' }}
            thumbColor={sharingEnabled ? colors.success : undefined}
          />
        </View>
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
  content: { padding: spacing.lg, paddingBottom: 36, gap: spacing.md },
  notice: {
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  noticeText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  map: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: '#EAF2FF',
    ...shadows.card,
  },
  mapTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  mapText: {
    maxWidth: 250,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  card: {
    minHeight: 82,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  avatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarText: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  online: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  cardContent: { flex: 1, gap: 3 },
  name: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  age: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { color: colors.textSecondary, fontSize: 12 },
  updated: { color: colors.textMuted, fontSize: 10 },
  settingsCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  settingsText: { flex: 1, gap: 3 },
  settingsTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  settingsSubtitle: { color: colors.textMuted, fontSize: 11 },
  selectedCard: { borderWidth: 2, borderColor: colors.primary },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
