import { FamilyHeader } from '@/components/family-header';
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import type { Family } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = {
  ios: string;
  android?: string;
  web?: string;
};
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type HomeRoute =
  | '/calendar'
  | '/create-event'
  | '/invite-member'
  | '/memories'
  | '/vault';

function getCrossPlatformIcon(name: IconName): IoniconName {
  switch (name.ios) {
    case 'sun.max.fill':
      return 'sunny';
    case 'calendar':
      return 'calendar';
    case 'bell.fill':
      return 'notifications';
    case 'bubble.left.and.bubble.right.fill':
      return 'chatbubbles';
    case 'photo.on.rectangle.angled':
      return 'images';
    case 'lock.shield.fill':
      return 'shield-checkmark';
    case 'chevron.right':
      return 'chevron-forward';
    case 'plus':
      return 'add';
    default:
      return 'help-circle-outline';
  }
}

function AppSymbol({
  name,
  color,
  size = 22,
}: {
  name: IconName;
  color: string;
  size?: number;
}) {
  return (
    <Ionicons
      name={getCrossPlatformIcon(name)}
      size={size}
      color={color}
    />
  );
}

function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${action}`}
          hitSlop={8}
          onPress={onPress}
        >
          <Text style={styles.sectionAction}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TodayStat({
  icon,
  color,
  value,
  label,
}: {
  icon: IconName;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.todayStat}>
      <View style={[styles.todayStatIcon, { backgroundColor: `${color}20` }]}>
        <AppSymbol name={icon} color={color} size={18} />
      </View>
      <Text style={styles.todayStatValue}>{value}</Text>
      <Text style={styles.todayStatLabel}>{label}</Text>
    </View>
  );
}

function NextEventCard({
  title,
  meta,
  color,
  onPress,
}: {
  title: string;
  meta: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Következő esemény megnyitása"
      onPress={onPress}
      style={({ pressed }) => [styles.nextEventCard, pressed && styles.pressed]}
    >
      <View style={[styles.nextEventIcon, { backgroundColor: color }]}>
        <AppSymbol
          name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
          color={colors.white}
          size={27}
        />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.listTitle}>
          {title}
        </Text>
        <Text style={styles.listMeta}>{meta}</Text>
      </View>
      <View style={styles.todayBadge}>
        <Text style={styles.todayBadgeText}>MA</Text>
      </View>
      <AppSymbol
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        color={colors.primary}
        size={16}
      />
    </Pressable>
  );
}

function QuickAccessCard({
  title,
  subtitle,
  icon,
  color,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAccessCard, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.quickAccessIcon,
          { backgroundColor: color === colors.purple ? '#E8D7FF' : '#C9F4E9' },
        ]}
      >
        <AppSymbol name={icon} color={color} size={29} />
      </View>
      <View style={styles.quickAccessContent}>
        <Text style={styles.quickAccessTitle}>{title}</Text>
        <Text style={styles.quickAccessSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, profileError } = useAuth();
  const { unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const displayName = profile?.display_name?.trim() || 'Felhasználó';
  const userInitial = displayName.charAt(0).toLocaleUpperCase('hu-HU') || '?';
  const firstName = displayName.split(/\s+/)[0];
  const todayLabel = new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  function openRoute(route: HomeRoute) {
    if (route === '/invite-member' && activeFamily) {
      router.push({
        pathname: route,
        params: { familyId: activeFamily.id, familyName: activeFamily.name },
      });
      return;
    }
    if (route === '/create-event' && activeFamily) {
      router.push({
        pathname: route,
        params: { familyId: activeFamily.id, familyName: activeFamily.name },
      });
      return;
    }
    if (route !== '/invite-member' && route !== '/create-event') {
      router.push(route);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View pointerEvents="none" style={styles.backgroundGlow} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FamilyHeader
          userInitial={userInitial}
          unreadNotificationCount={unreadCount}
          onNotificationsPress={() => router.push('/notifications')}
          onProfilePress={() => router.push('/profile')}
        />

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Text style={styles.greeting}>
            Jó reggelt, {firstName}! <Text style={styles.wave}>👋</Text>
          </Text>
          <Text style={styles.heroDate}>{todayLabel}</Text>
        </View>

        <View style={styles.familySwitcherSource}>
          <FamilySwitcher compact onActiveFamilyChange={setActiveFamily} />
        </View>

        {profileError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              A profil betöltése sikertelen: {profileError}
            </Text>
          </View>
        ) : null}

        <View>
          <ScrollView
            horizontal
            contentContainerStyle={styles.peopleRow}
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.person}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userInitial}</Text>
                </View>
                <View style={styles.onlineDot} />
              </View>
              <Text numberOfLines={1} style={styles.personName}>
                {firstName}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => openRoute('/invite-member')}
              style={({ pressed }) => [styles.person, pressed && styles.pressed]}
            >
              <View style={styles.addPerson}>
                <Text style={styles.familyCount}>+1</Text>
              </View>
              <Text style={styles.personMuted}>Családtag</Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.todayCard}>
          <View pointerEvents="none" style={styles.todayCardGlow} />
          <View style={styles.todayCardHeader}>
            <View style={styles.todayTitleRow}>
              <View style={styles.todayTitleIcon}>
                <AppSymbol
                  name={{ ios: 'sun.max.fill', android: 'wb_sunny', web: 'light_mode' }}
                  color={colors.warning}
                  size={29}
                />
              </View>
              <Text style={styles.todayTitle}>Ma a családban</Text>
            </View>
            <Text style={styles.todaySubtitle}>Minden fontos egy helyen</Text>
          </View>
          <View style={styles.todayStats}>
            <TodayStat
              value={3}
              label="esemény"
              color={colors.primary}
              icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            />
            <TodayStat
              value={unreadCount}
              label="értesítés"
              color={colors.purple}
              icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            />
            <TodayStat
              value={2}
              label="üzenet"
              color={colors.teal}
              icon={{ ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' }}
            />
          </View>
        </View>

        <View>
          <SectionHeader
            title="Következő esemény"
            action="Naptár"
            onPress={() => openRoute('/calendar')}
          />
          <NextEventCard
            color={colors.primary}
            title="Orvosi időpont"
            meta="Ma · 09:30 · Anna"
            onPress={() => openRoute('/calendar')}
          />
        </View>

        <View>
          <SectionHeader title="Gyors hozzáférés" />
          <View style={styles.quickAccessGrid}>
            <QuickAccessCard
              color={colors.purple}
              icon={{ ios: 'photo.on.rectangle.angled', android: 'photo_library', web: 'photo_library' }}
              subtitle="Képek és videók"
              title="Emlékek"
              onPress={() => openRoute('/memories')}
            />
            <QuickAccessCard
              color={colors.teal}
              icon={{ ios: 'lock.shield.fill', android: 'shield_lock', web: 'shield_lock' }}
              subtitle="Biztonságos adatok"
              title="Páncélterem"
              onPress={() => openRoute('/vault')}
            />
          </View>
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Új esemény létrehozása"
        onPress={() => openRoute('/create-event')}
        style={({ pressed }) => [styles.floatingAddButton, pressed && styles.pressed]}
      >
        <AppSymbol
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          color={colors.white}
          size={28}
        />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  backgroundGlow: {
    position: 'absolute',
    top: -132,
    right: -112,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#DDEBFF',
    opacity: 0.9,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 36, gap: spacing.md },
  contentWide: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
  hero: { gap: spacing.xs, paddingVertical: spacing.xs },
  heroCard: {
    minHeight: 92,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFF4D5',
    opacity: 0.35,
  },
  familySwitcherSource: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  heroDate: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  wave: { fontSize: 24 },
  sectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionAction: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  errorCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F9C5CC',
    backgroundColor: '#FFF1F3',
  },
  errorText: { color: '#C64052', fontSize: 12 },
  peopleRow: { gap: spacing.lg, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  person: { width: 74, alignItems: 'center', gap: spacing.xs },
  avatarRing: {
    width: 58,
    height: 58,
    padding: 3,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  avatar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: '#D6B38D',
  },
  avatarText: { color: '#3B2415', fontSize: 18, fontWeight: '900' },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.success,
  },
  personName: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  personMuted: { color: colors.textMuted, fontSize: 10 },
  addPerson: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 0,
    backgroundColor: '#EEF5FF',
    ...shadows.card,
  },
  familyCount: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  todayCard: {
    minHeight: 140,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: '#E9F5FF',
  },
  todayCardGlow: {
    position: 'absolute',
    top: -55,
    right: -45,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#C4F4EA',
    opacity: 0.52,
  },
  todayCardHeader: { gap: spacing.xs },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  todayTitleIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFF5D9',
  },
  todayTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '900' },
  todaySubtitle: { color: colors.textMuted, fontSize: 11 },
  todayStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  todayStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  todayStatIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  todayStatValue: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  todayStatLabel: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  nextEventCard: {
    minHeight: 94,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#EEF2F8',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  nextEventIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  todayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
  todayBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  quickAccessGrid: { flexDirection: 'row', gap: spacing.md },
  quickAccessCard: {
    flex: 1,
    minHeight: 144,
    padding: spacing.lg,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  quickAccessContent: { alignSelf: 'stretch' },
  quickAccessTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  quickAccessSubtitle: { marginTop: 3, color: colors.textMuted, fontSize: 11 },
  floatingAddButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  summaryCard: {
    minWidth: 180,
    flex: 1,
    minHeight: 105,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  summaryCardCompact: { minWidth: '46%', minHeight: 96, padding: spacing.md },
  summaryIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  summaryValue: { color: colors.textPrimary, fontSize: 23, fontWeight: '900' },
  summaryLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  summaryMeta: { marginTop: 2, color: colors.textMuted, fontSize: 10 },
  quickActions: { gap: spacing.md, paddingRight: spacing.lg },
  quickCard: {
    width: 126,
    minHeight: 94,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  quickIcon: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  quickLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  dashboardColumns: { flexDirection: 'row', gap: spacing.md },
  dashboardColumnsStacked: { flexDirection: 'column' },
  dashboardPanel: { flex: 1, minWidth: 0 },
  panel: {
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  listRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateBadge: {
    width: 46,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.primarySoft,
  },
  dateMonth: { fontSize: 9, fontWeight: '900' },
  dateDay: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  listTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  listMeta: { marginTop: 3, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  divider: { height: 1, backgroundColor: colors.border },
  flex: { flex: 1 },
  miniAvatarGroup: { flexDirection: 'row', paddingRight: 4 },
  miniAvatar: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: '#D6B38D',
  },
  miniAvatarOverlap: { marginLeft: -8, backgroundColor: colors.primaryLight },
  miniAvatarText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  noticeIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noticeIconUnread: { backgroundColor: '#DCF8F2' },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
  emptyNotice: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyNoticeText: { color: colors.textMuted, fontSize: 11 },
  medicineRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  medicineIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: '#FDEBF2',
  },
  mapPreview: { flex: 1, minHeight: 190 },
  mapCanvas: {
    height: 125,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#D2E1F7',
    backgroundColor: '#EAF4FF',
  },
  mapRoad: {
    position: 'absolute',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#B3CCE9',
    opacity: 0.8,
  },
  mapRoadOne: { top: 56, left: -25, width: '125%', transform: [{ rotate: '-12deg' }] },
  mapRoadTwo: { top: 62, left: 5, width: '105%', transform: [{ rotate: '22deg' }] },
  mapMarker: {
    position: 'absolute',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: '#F2C8A7',
  },
  mapMarkerSecondary: { borderColor: colors.purple, backgroundColor: '#DCCFFF' },
  markerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  homeMarker: {
    position: 'absolute',
    left: '47%',
    bottom: 17,
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  memoriesRow: { gap: spacing.md, paddingTop: spacing.xs, paddingRight: spacing.lg },
  memoryCard: {
    width: 185,
    height: 150,
    padding: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  memoryGlow: {
    position: 'absolute',
    top: -35,
    right: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    opacity: 0.52,
  },
  memoryTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  memoryMeta: { marginTop: 3, color: colors.textMuted, fontSize: 10 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
