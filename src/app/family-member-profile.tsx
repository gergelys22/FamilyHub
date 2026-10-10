import { colors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Member = {
  name: string;
  role: string;
  birthDate: string;
  initial: string;
  color: string;
  textColor: string;
  school: string;
  allergy: string;
  medicine: string;
};

const members: Record<string, Member> = {
  anna: {
    name: 'Anna',
    role: 'Anya',
    birthDate: '1987. június 8.',
    initial: 'A',
    color: '#F3C7B3',
    textColor: '#9A4F39',
    school: 'Budapesti Általános Iskola',
    allergy: 'Nincs megadva',
    medicine: 'Nincs megadva',
  },
  mate: {
    name: 'Máté',
    role: 'Testvér',
    birthDate: '1991. március 24.',
    initial: 'M',
    color: '#C9D8E5',
    textColor: '#325773',
    school: 'Budapesti Műszaki Egyetem',
    allergy: 'Mogyoró',
    medicine: 'Nincs megadva',
  },
  lili: {
    name: 'Lili',
    role: 'Lány',
    birthDate: '2015. április 12.',
    initial: 'L',
    color: '#EAC9A8',
    textColor: '#7D4C24',
    school: 'Kölcsey Általános Iskola',
    allergy: 'Mogyoró',
    medicine: 'Loratadin (szükség esetén)',
  },
  gergely: {
    name: 'Gergely',
    role: 'Családszervező',
    birthDate: '1988. február 3.',
    initial: 'G',
    color: '#D6B38D',
    textColor: '#5F351D',
    school: 'Nincs megadva',
    allergy: 'Nincs megadva',
    medicine: 'Nincs megadva',
  },
};

const groupMemberIds = ['anna', 'mate', 'lili'];

function InfoRow({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function MemberAvatar({ member }: { member: Member }) {
  return (
    <View style={[styles.avatar, { backgroundColor: member.color }]}>
      <Text style={[styles.avatarText, { color: member.textColor }]}>{member.initial}</Text>
    </View>
  );
}

export default function FamilyMemberProfileScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const isGroup = memberId === 'family';
  const member = members[memberId ?? 'lili'] ?? members.lili;
  const groupMembers = groupMemberIds.map((id) => members[id]);

  if (isGroup) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vissza a beszélgetéshez"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Családi csoport</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.groupHero}>
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={42} color={colors.primary} />
            </View>
            <Text style={styles.profileName}>Családi csoport</Text>
            <Text style={styles.profileMeta}>{groupMembers.length + 1} résztvevő</Text>
          </View>
          <Text style={styles.sectionTitle}>Csoporttagok</Text>
          <View style={styles.memberCard}>
            {[...groupMembers, members.gergely].map((groupMember) => (
              <Pressable
                key={groupMember.name}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/family-member-profile',
                    params: { memberId: Object.keys(members).find((key) => members[key] === groupMember) },
                  })
                }
                style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}
              >
                <MemberAvatar member={groupMember} />
                <View style={styles.infoContent}>
                  <Text style={styles.memberName}>{groupMember.name}</Text>
                  <Text style={styles.infoValue}>{groupMember.role}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vissza a beszélgetéshez"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profilbeállítások"
            onPress={() => undefined}
            style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </Pressable>
          <MemberAvatar member={member} />
          <Text style={styles.profileName}>{member.name}</Text>
          <Text style={styles.profileMeta}>
            {member.role} · {member.birthDate}
          </Text>
        </View>

        <View style={styles.quickActions}>
          <QuickAction icon="chatbubble-ellipses" label="Üzenet" color={colors.primary} onPress={() => router.back()} />
          <QuickAction icon="location" label="Helye" color={colors.success} onPress={() => undefined} />
          <QuickAction icon="images" label="Emlékek" color={colors.purple} onPress={() => undefined} />
          <QuickAction icon="ellipsis-horizontal" label="Több" color={colors.pink} onPress={() => undefined} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fontos információk</Text>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.infoCard}>
          <InfoRow icon="school-outline" color={colors.primary} label="Iskola" value={member.school} />
          <InfoRow icon="medical-outline" color={colors.pink} label="Allergia" value={member.allergy} />
          <InfoRow icon="medkit-outline" color={colors.success} label="Gyógyszerek" value={member.medicine} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={23} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  headerPlaceholder: { width: 42 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  profileHeader: { alignItems: 'center', paddingVertical: spacing.md },
  backButton: { position: 'absolute', top: 0, left: 0, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  moreButton: { position: 'absolute', top: 0, right: 0, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  avatar: { width: 116, height: 116, alignItems: 'center', justifyContent: 'center', borderRadius: 58, borderWidth: 4, borderColor: colors.white, ...shadows.card },
  avatarText: { fontSize: 48, fontWeight: '900' },
  profileName: { marginTop: spacing.md, color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
  profileMeta: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.sm },
  quickAction: { flex: 1, alignItems: 'center', gap: spacing.xs },
  quickIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  quickLabel: { fontSize: 11, fontWeight: '900' },
  sectionHeader: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900' },
  infoCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surface, ...shadows.card },
  infoRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  infoContent: { flex: 1, gap: 3 },
  infoLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  infoValue: { color: colors.textSecondary, fontSize: 12 },
  groupHero: { alignItems: 'center', paddingVertical: spacing.xl },
  groupIcon: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', borderRadius: 52, backgroundColor: colors.primarySoft },
  memberCard: { marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.xl, backgroundColor: colors.surface, ...shadows.card },
  memberRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  memberName: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
