import { PresenceDot } from '@/components/presence-dot';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { usePresence } from '@/providers/presence-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;

function getAge(birthDate: string | null, today: Date) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
}

function ChildCard({
  member,
  age,
  sharingEnabled,
  selected,
  palette,
  onPress,
}: {
  member: FamilyMember;
  age: number | null;
  sharingEnabled: boolean;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  const { isProfileOnline } = usePresence();
  const childName = member.nickname?.trim() || member.display_name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${childName} helyadatának megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: selected ? palette.primary : palette.border,
        },
        selected && styles.selectedCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: '#C9D8E5', borderColor: palette.surface }]}>
        <Text style={styles.avatarText}>{childName.charAt(0).toLocaleUpperCase('hu-HU')}</Text>
        <PresenceDot
          visible={isProfileOnline(member.profile_id)}
          size={14}
          style={{ right: -2, bottom: 0, borderColor: palette.surface }}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.name, { color: palette.textPrimary }]}>
          {childName}{' '}
          <Text style={[styles.age, { color: palette.textMuted }]}>
            {age === null ? 'Életkor nincs megadva' : `${age} éves`}
          </Text>
        </Text>
        <View
          style={[
            styles.statusChip,
            { backgroundColor: sharingEnabled ? `${colors.success}22` : palette.surfaceMuted },
          ]}
        >
          <Ionicons
            name={sharingEnabled ? 'location' : 'location-outline'}
            size={13}
            color={sharingEnabled ? colors.success : palette.textMuted}
          />
          <Text style={[styles.statusText, { color: sharingEnabled ? colors.success : palette.textMuted }]}>
            {sharingEnabled ? 'Nincs elérhető helyadat' : 'Helymegosztás kikapcsolva'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={19} color={palette.textMuted} />
    </Pressable>
  );
}

export default function LocationSharingScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [now] = useState(() => new Date());
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getMyFamilies()
      .then((families) => (families[0] ? getFamilyMembers(families[0].id) : []))
      .then((result) => {
        if (!active) return;
        setMembers(
          result.filter((member) => {
            const age = getAge(member.birth_date, now);
            return age !== null && age < 14;
          }),
        );
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Helymegosztás</Text>
        <View style={[styles.shield, { backgroundColor: `${colors.success}22` }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.notice,
            { backgroundColor: palette.primarySoft, borderColor: palette.border },
          ]}
        >
          <Ionicons name="information-circle" size={22} color={palette.primary} />
          <Text style={[styles.noticeText, { color: palette.textSecondary }]}>
            A 14 éven aluli családtagok helye csak a szülők és gondviselők számára látható.
          </Text>
        </View>

        <View style={[styles.map, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ['#17335C', '#102B4C00'] : ['#DCEBFF', '#EAF2FF00']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.mapGlow}
          />
          <View style={[styles.mapIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="map" size={34} color={palette.primary} />
          </View>
          <Text style={[styles.mapTitle, { color: palette.textPrimary }]}>Családi térkép</Text>
          <Text style={[styles.mapText, { color: palette.textMuted }]}>
            A térképes követés megnyitásához válassz ki egy családtagot.
          </Text>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View
            style={[
              styles.settingsIcon,
              { backgroundColor: sharingEnabled ? `${colors.success}22` : palette.surfaceMuted },
            ]}
          >
            <Ionicons
              name={sharingEnabled ? 'navigate' : 'navigate-outline'}
              size={20}
              color={sharingEnabled ? colors.success : palette.textMuted}
            />
          </View>
          <View style={styles.settingsText}>
            <Text style={[styles.settingsTitle, { color: palette.textPrimary }]}>
              Helymegosztás {sharingEnabled ? 'bekapcsolva' : 'kikapcsolva'}
            </Text>
            <Text style={[styles.settingsSubtitle, { color: palette.textMuted }]}>
              A gondviselők értesítést kapnak.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Helymegosztás"
            value={sharingEnabled}
            onValueChange={setSharingEnabled}
            trackColor={{ false: palette.border, true: '#9BE5D5' }}
            thumbColor={sharingEnabled ? colors.success : undefined}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>14 éven aluli gyermekek</Text>
          {members.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: palette.primarySoft }]}>
              <Text style={[styles.countText, { color: palette.primary }]}>{members.length}</Text>
            </View>
          ) : null}
        </View>

        {loading ? <ActivityIndicator color={palette.primary} style={styles.loader} /> : null}

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

        {members.map((member) => {
          const childName = member.nickname?.trim() || member.display_name;
          return (
            <ChildCard
              key={member.profile_id}
              member={member}
              age={getAge(member.birth_date, now)}
              sharingEnabled={sharingEnabled}
              selected={selectedChild === member.profile_id}
              palette={palette}
              onPress={() => {
                setSelectedChild(member.profile_id);
                Alert.alert(
                  childName,
                  sharingEnabled ? 'Nincs elérhető friss helyadat.' : 'A helymegosztás ki van kapcsolva.',
                );
              }}
            />
          );
        })}

        {!loading && members.length === 0 && !error ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="happy-outline" size={28} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Nincs rögzített, 14 éven aluli családtag.
            </Text>
          </View>
        ) : null}
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
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.5 },
  shield: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  content: { padding: spacing.lg, paddingBottom: 36, gap: spacing.md },
  notice: {
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  map: {
    minHeight: 190,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  mapGlow: { position: 'absolute', top: 0, right: 0, width: '80%', height: 160 },
  mapIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 34 },
  mapTitle: { fontSize: 18, fontWeight: '900' },
  mapText: { maxWidth: 260, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  settingsCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  settingsIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  settingsText: { flex: 1, gap: 3 },
  settingsTitle: { fontSize: 14, fontWeight: '900' },
  settingsSubtitle: { fontSize: 12 },
  sectionHeader: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  countText: { fontSize: 12, fontWeight: '900' },
  loader: { paddingVertical: spacing.lg },
  card: {
    minHeight: 84,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  selectedCard: { borderWidth: 2 },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 3,
  },
  avatarText: { color: '#243447', fontSize: 22, fontWeight: '900' },
  cardContent: { flex: 1, gap: 6 },
  name: { fontSize: 15, fontWeight: '900' },
  age: { fontSize: 12, fontWeight: '700' },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.round,
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  errorCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});