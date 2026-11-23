
import { PresenceDot } from '@/components/presence-dot';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { usePresence } from '@/providers/presence-provider';
import { useTheme } from '@/providers/theme-provider';
import { getProfile } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Member = {
  profileId?: string;
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

type Palette = typeof colors | typeof darkColors;

function InfoRow({
  icon,
  color,
  label,
  value,
  palette,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
  palette: Palette;
  last?: boolean;
}) {
  return (
    <View>
      <View style={styles.infoRow}>
        <View
          style={[
            styles.infoIcon,
            { backgroundColor: `${color}18` },
          ]}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>

        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>
            {label}
          </Text>
          <Text style={[styles.infoValue, { color: palette.textPrimary }]}>
            {value}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={17}
          color={palette.textMuted}
        />
      </View>

      {!last && (
        <View
          style={[
            styles.infoDivider,
            { backgroundColor: palette.border },
          ]}
        />
      )}
    </View>
  );
}

function MemberAvatar({
  member,
  size = 'large',
}: {
  member: Member;
  size?: 'small' | 'large';
}) {
  const { isProfileOnline } = usePresence();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.avatar,
        isSmall ? styles.avatarSmall : styles.avatarLarge,
        { backgroundColor: member.color },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          isSmall ? styles.avatarTextSmall : styles.avatarTextLarge,
          { color: member.textColor },
        ]}
      >
        {member.initial}
      </Text>

      <PresenceDot
        visible={
          member.profileId
            ? isProfileOnline(member.profileId)
            : false
        }
        size={isSmall ? 12 : 17}
        style={isSmall ? styles.smallPresenceDot : styles.largePresenceDot}
      />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
  palette,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: palette.surface },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.quickIcon,
          { backgroundColor: `${color}18` },
        ]}
      >
        <Ionicons name={icon} size={23} color={color} />
      </View>

      <Text style={[styles.quickLabel, { color: palette.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FamilyMemberProfileScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const isGroup = memberId === 'family';

  const [loadedMember, setLoadedMember] = useState<{
    id: string;
    member: Member;
  } | null>(null);

  const [failedMemberId, setFailedMemberId] = useState<string | null>(null);

  const groupMembers = groupMemberIds.map((id) => members[id]);

  useEffect(() => {
    let active = true;

    if (!memberId || isGroup || members[memberId]) {
      return;
    }

    void getProfile(memberId)
      .then((profile) => {
        if (!active) return;

        const name = profile.display_name;

        const remoteMember: Member = {
          profileId: profile.id,
          name,
          role: 'Családtag',
          birthDate: profile.birth_date
            ? new Date(profile.birth_date).toLocaleDateString('hu-HU')
            : 'Születési dátum nincs megadva',
          initial: name.charAt(0).toLocaleUpperCase('hu-HU'),
          color: '#C9D8E5',
          textColor: '#325773',
          school: 'Nincs megadva',
          allergy: 'Nincs megadva',
          medicine: 'Nincs megadva',
        };

        setLoadedMember({
          id: memberId,
          member: remoteMember,
        });
      })
      .catch(() => {
        if (active) {
          setFailedMemberId(memberId);
        }
      });

    return () => {
      active = false;
    };
  }, [isGroup, memberId]);

  const remoteMember =
    loadedMember && loadedMember?.id === memberId
      ? loadedMember.member
      : null;

  const profileLoading =
    !!memberId &&
    !isGroup &&
    !members[memberId] &&
    !remoteMember &&
    failedMemberId !== memberId;

  const member =
    remoteMember ??
    members[memberId ?? 'lili'] ??
    members.lili;

  if (isGroup) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <View style={styles.navigationHeader}>
          <ScreenCloseButton accessibilityLabel="Vissza a beszélgetéshez" />

          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
            Családi csoport
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.groupHeroCard,
              { backgroundColor: palette.surface },
            ]}
          >
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={43} color={colors.primary} />
            </View>

            <Text style={[styles.profileName, { color: palette.textPrimary }]}>
              Családi csoport
            </Text>

            <Text style={[styles.profileMeta, { color: palette.textSecondary }]}>
              {groupMembers.length + 1} résztvevő
            </Text>

            <View
              style={[
                styles.memberCountBadge,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Ionicons name="people-outline" size={15} color={colors.primary} />
              <Text style={styles.memberCountText}>Családi közösség</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                Csoporttagok
              </Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                A családod tagjai
              </Text>
            </View>

            <View
              style={[
                styles.sectionCount,
                { backgroundColor: palette.surface },
              ]}
            >
              <Text style={[styles.sectionCountText, { color: palette.textPrimary }]}>
                {groupMembers.length + 1}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.memberCard,
              { backgroundColor: palette.surface },
            ]}
          >
            {[...groupMembers, members.gergely].map((groupMember, index) => {
              const id = Object.keys(members).find(
                (key) => members[key] === groupMember,
              );

              return (
                <View key={groupMember.name}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/family-member-profile',
                        params: { memberId: id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.memberRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MemberAvatar member={groupMember} size="small" />

                    <View style={styles.infoContent}>
                      <Text
                        style={[
                          styles.memberName,
                          { color: palette.textPrimary },
                        ]}
                      >
                        {groupMember.name}
                      </Text>

                      <Text
                        style={[
                          styles.memberRole,
                          { color: palette.textSecondary },
                        ]}
                      >
                        {groupMember.role}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color={palette.textMuted}
                    />
                  </Pressable>

                  {index !== groupMembers.length && (
                    <View
                      style={[
                        styles.memberDivider,
                        { backgroundColor: palette.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navigationHeader}>
          <ScreenCloseButton accessibilityLabel="Vissza a beszélgetéshez" />

          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
            Profil
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profilbeállítások"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.moreButton,
              { backgroundColor: palette.surface },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={21}
              color={palette.textPrimary}
            />
          </Pressable>
        </View>

        {profileLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
              Profil betöltése...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.profileHero,
                { backgroundColor: palette.surface },
              ]}
            >
              <View style={styles.avatarWrapper}>
                <MemberAvatar member={member} />
              </View>

              <Text style={[styles.profileName, { color: palette.textPrimary }]}>
                {member.name}
              </Text>

              <View style={styles.profileMetaRow}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={13}
                    color={colors.primary}
                  />
                  <Text style={styles.roleBadgeText}>{member.role}</Text>
                </View>
              </View>

              <View style={styles.birthDateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={palette.textMuted}
                />
                <Text style={[styles.profileMeta, { color: palette.textSecondary }]}>
                  {member.birthDate}
                </Text>
              </View>
            </View>

            <View style={styles.quickActions}>
              <QuickAction
                icon="chatbubble-ellipses"
                label="Üzenet"
                color={colors.primary}
                onPress={() => router.back()}
                palette={palette}
              />

              <QuickAction
                icon="location"
                label="Helye"
                color={colors.success}
                onPress={() => router.push('/location-sharing')}
                palette={palette}
              />

              <QuickAction
                icon="images"
                label="Emlékek"
                color={colors.purple}
                onPress={() => router.push('/memories')}
                palette={palette}
              />

              <QuickAction
                icon="ellipsis-horizontal"
                label="Több"
                color={colors.pink}
                onPress={() => router.push('/more')}
                palette={palette}
              />
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                  Fontos információk
                </Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                  A családtag legfontosabb adatai
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Információk szerkesztése"
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [
                  styles.editButton,
                  { backgroundColor: `${colors.primary}15` },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={19}
                  color={colors.primary}
                />
              </Pressable>
            </View>

            <View
              style={[
                styles.infoCard,
                { backgroundColor: palette.surface },
              ]}
            >
              <InfoRow
                icon="school-outline"
                color={colors.primary}
                label="Iskola"
                value={member.school}
                palette={palette}
              />

              <InfoRow
                icon="medical-outline"
                color={colors.pink}
                label="Allergia"
                value={member.allergy}
                palette={palette}
              />

              <InfoRow
                icon="medkit-outline"
                color={colors.success}
                label="Gyógyszerek"
                value={member.medicine}
                palette={palette}
                last
              />
            </View>

            <View style={styles.bottomNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={palette.textMuted}
              />
              <Text style={[styles.bottomNoteText, { color: palette.textMuted }]}>
                A családi adatok biztonságosan kezelve.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  navigationHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  headerPlaceholder: {
    width: 42,
  },

  moreButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },

  profileHero: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    ...shadows.card,
  },

  avatarWrapper: {
    marginBottom: spacing.xs,
  },

  avatar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    ...shadows.card,
  },

  avatarLarge: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },

  avatarSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },

  avatarText: {
    fontWeight: '900',
  },

  avatarTextLarge: {
    fontSize: 46,
  },

  avatarTextSmall: {
    fontSize: 22,
  },

  largePresenceDot: {
    right: 2,
    bottom: 8,
  },

  smallPresenceDot: {
    right: 0,
    bottom: 2,
  },

  profileName: {
    marginTop: spacing.md,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  profileMetaRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.round,
  },

  roleBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  birthDateRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  profileMeta: {
    fontSize: 13,
    fontWeight: '600',
  },

  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  quickAction: {
    flex: 1,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    ...shadows.card,
  },

  quickIcon: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },

  quickLabel: {
    fontSize: 11,
    fontWeight: '800',
  },

  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },

  editButton: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },

  infoCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    ...shadows.card,
  },

  infoRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  infoIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },

  infoContent: {
    flex: 1,
    gap: 5,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  infoValue: {
    fontSize: 13,
    fontWeight: '800',
  },

  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },

  bottomNote: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },

  bottomNoteText: {
    fontSize: 11,
    fontWeight: '500',
  },

  groupHeroCard: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: radius.xl,
    ...shadows.card,
  },

  groupIcon: {
    width: 94,
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
  },

  memberCountBadge: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.round,
  },

  memberCountText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  sectionCount: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },

  sectionCountText: {
    fontSize: 13,
    fontWeight: '900',
  },

  memberCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    ...shadows.card,
  },

  memberRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },

  memberName: {
    fontSize: 14,
    fontWeight: '900',
  },

  memberRole: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },

  memberDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },

  loadingContainer: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
