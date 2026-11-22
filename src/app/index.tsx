import { FamilyHeader } from '@/components/family-header';
import { FamilySwitcher } from '@/components/family-switcher';
import { PresenceDot } from '@/components/presence-dot';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { useAuth } from '@/providers/auth-provider';
import { usePresence } from '@/providers/presence-provider';
import { useTheme } from '@/providers/theme-provider';
import { getChatConversations } from '@/services/chat';
import { getFamilyEvents, type FamilyEvent } from '@/services/events';
import type { Family } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type HomeRoute = '/calendar' | '/create-event' | '/invite-member' | '/memories' | '/vault';

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Jó reggelt';
  if (hour >= 12 && hour < 18) return 'Jó napot';
  if (hour >= 18 && hour < 22) return 'Jó estét';
  return 'Jó éjszakát';
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function relativeDayLabel(eventDate: Date, now: Date) {
  const days = Math.round((startOfDay(eventDate) - startOfDay(now)) / 86_400_000);
  if (days <= 0) return 'MA';
  if (days === 1) return 'HOLNAP';
  return `${days} NAP`;
}

function SectionHeader({
  title,
  action,
  onPress,
  palette,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  palette: Palette;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${action}`}
          hitSlop={8}
          onPress={onPress}
          style={styles.sectionActionRow}
        >
          <Text style={[styles.sectionAction, { color: palette.primary }]}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={palette.primary} />
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
  palette,
}: {
  icon: IoniconName;
  color: string;
  value: number;
  label: string;
  palette: Palette;
}) {
  return (
    <View style={styles.todayStat}>
      <View style={[styles.todayStatIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.todayStatValue, { color: palette.textPrimary }]}>{value}</Text>
      <Text style={[styles.todayStatLabel, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

function NextEventCard({
  title,
  meta,
  eventDate,
  badge,
  color,
  onPress,
  palette,
}: {
  title: string;
  meta: string;
  eventDate: Date | null;
  badge: string | null;
  color: string;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Következő esemény megnyitása"
      onPress={onPress}
      style={({ pressed }) => [
        styles.nextEventCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.dateTile, { backgroundColor: eventDate ? color : palette.surfaceMuted }]}>
        {eventDate ? (
          <>
            <Text style={styles.dateTileMonth}>
              {eventDate.toLocaleDateString('hu-HU', { month: 'short' }).replace('.', '').toUpperCase()}
            </Text>
            <Text style={styles.dateTileDay}>{eventDate.getDate()}</Text>
          </>
        ) : (
          <Ionicons name="calendar-outline" size={26} color={palette.textMuted} />
        )}
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.listTitle, { color: palette.textPrimary }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[styles.listMeta, { color: palette.textSecondary }]}>
          {meta}
        </Text>
      </View>
      {badge ? (
        <View style={[styles.todayBadge, { backgroundColor: palette.primarySoft }]}>
          <Text style={[styles.todayBadgeText, { color: palette.primary }]}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
    </Pressable>
  );
}

function QuickAccessCard({
  title,
  subtitle,
  icon,
  color,
  onPress,
  palette,
}: {
  title: string;
  subtitle: string;
  icon: IoniconName;
  color: string;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAccessCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.quickAccessIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={styles.quickAccessContent}>
        <Text style={[styles.quickAccessTitle, { color: palette.textPrimary }]}>{title}</Text>
        <Text style={[styles.quickAccessSubtitle, { color: palette.textMuted }]}>{subtitle}</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={color} style={styles.quickAccessArrow} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const router = useRouter();
  const { profile, profileError } = useAuth();
  const { isProfileOnline } = usePresence();
  const [now] = useState(() => new Date());
  const greeting = getGreeting(now);
  const { unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const unreadMessageCount = useUnreadMessages(activeFamily?.id, profile?.id);
  const [upcomingEvents, setUpcomingEvents] = useState<FamilyEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const displayName = profile?.display_name?.trim() || 'Felhasználó';
  const userInitial = displayName.charAt(0).toLocaleUpperCase('hu-HU') || '?';
  const firstName = displayName.split(/\s+/)[0];
  const todayLabel = new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);

  useEffect(() => {
    if (!activeFamily) return;
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + 90);
    void getFamilyEvents(activeFamily.id, from, to)
      .then((events) => {
        setUpcomingEvents(events);
        setEventsError(null);
      })
      .catch((error: unknown) => {
        setEventsError(error instanceof Error ? error.message : 'Az események betöltése sikertelen.');
      });
    void getChatConversations(activeFamily.id)
      .then((conversations) => setConversationCount(conversations.length))
      .catch(() => setConversationCount(0));
  }, [activeFamily]);

  const nextEvent = upcomingEvents[0] ?? null;
  const nextEventDate = nextEvent ? new Date(nextEvent.starts_at) : null;
  const eventMeta = nextEventDate
    ? `${nextEventDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })} · ${nextEventDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}${nextEvent?.location_name ? ` · ${nextEvent.location_name}` : ''}`
    : 'Hozz létre egy közös családi programot.';
  const todayEventCount = upcomingEvents.filter(
    (event) => new Date(event.starts_at).toDateString() === now.toDateString(),
  ).length;

  function openRoute(route: HomeRoute) {
    if ((route === '/invite-member' || route === '/create-event') && activeFamily) {
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FamilyHeader
          userInitial={userInitial}
          unreadNotificationCount={unreadCount}
          unreadMessageCount={unreadMessageCount}
          onNotificationsPress={() => router.push('/notifications')}
          onMessagesPress={() => router.push('/messages')}
          onProfilePress={() => router.push('/profile')}
        />

        <LinearGradient
          colors={isDark ? ['#1B4FC4', '#12307A'] : ['#2F6BFF', '#1B3FD8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          <Text style={styles.greeting}>
            {greeting}, {firstName}! <Text style={styles.wave}>👋</Text>
          </Text>
          <Text style={styles.heroDate}>{todayLabel}</Text>
          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroPillText}>
                {todayEventCount > 0 ? `${todayEventCount} mai esemény` : 'Ma nincs esemény'}
              </Text>
            </View>
            {unreadCount > 0 ? (
              <View style={styles.heroPill}>
                <Ionicons name="notifications-outline" size={14} color="#FFFFFF" />
                <Text style={styles.heroPillText}>{unreadCount} új értesítés</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.familySwitcherSource}>
          <FamilySwitcher compact onActiveFamilyChange={setActiveFamily} />
        </View>

        {profileError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: isDark ? '#3B1622' : '#FFF1F3',
                borderColor: isDark ? '#7F2439' : '#F9C5CC',
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={20} color={isDark ? '#FDA4AF' : '#C64052'} />
            <Text style={[styles.errorText, { color: isDark ? '#FDA4AF' : '#C64052' }]}>
              A profil betöltése sikertelen: {profileError}
            </Text>
          </View>
        ) : null}

        <ScrollView
          horizontal
          contentContainerStyle={styles.peopleRow}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.person}>
            <View style={[styles.avatarRing, { borderColor: palette.primary }]}>
              <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <PresenceDot
                visible={isProfileOnline(profile?.id)}
                size={14}
                style={StyleSheet.flatten([styles.onlineDot, { borderColor: palette.background }])}
              />
            </View>
            <Text numberOfLines={1} style={[styles.personName, { color: palette.textPrimary }]}>
              {firstName}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Családtag meghívása"
            onPress={() => openRoute('/invite-member')}
            style={({ pressed }) => [styles.person, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.addPerson,
                { borderColor: palette.primary, backgroundColor: palette.primarySoft },
              ]}
            >
              <Ionicons name="person-add-outline" size={22} color={palette.primary} />
            </View>
            <Text style={[styles.personName, { color: palette.textSecondary }]}>Meghívás</Text>
          </Pressable>
        </ScrollView>

        <View style={[styles.todayCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.todayCardHeader}>
            <View style={[styles.todayTitleIcon, { backgroundColor: `${colors.warning}26` }]}>
              <Ionicons name="sunny" size={22} color={colors.warning} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.todayTitle, { color: palette.textPrimary }]}>Ma a családban</Text>
              <Text style={[styles.todaySubtitle, { color: palette.textMuted }]}>
                Minden fontos egy helyen
              </Text>
            </View>
          </View>
          <View style={styles.todayStats}>
            <TodayStat
              value={todayEventCount}
              label="esemény"
              color={colors.primary}
              palette={palette}
              icon="calendar"
            />
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <TodayStat
              value={unreadCount}
              label="értesítés"
              color={colors.purple}
              palette={palette}
              icon="notifications"
            />
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <TodayStat
              value={conversationCount}
              label="beszélgetés"
              color={colors.teal}
              palette={palette}
              icon="chatbubbles"
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Következő esemény"
            action="Naptár"
            onPress={() => openRoute('/calendar')}
            palette={palette}
          />
          <NextEventCard
            color={colors.primary}
            title={nextEvent?.title ?? 'Nincs közelgő esemény'}
            meta={eventMeta}
            eventDate={nextEventDate}
            badge={nextEventDate ? relativeDayLabel(nextEventDate, now) : null}
            onPress={() => openRoute('/calendar')}
            palette={palette}
          />
          {eventsError ? (
            <Text style={[styles.errorText, { color: isDark ? '#FDA4AF' : '#C64052' }]}>{eventsError}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Gyors hozzáférés" palette={palette} />
          <View style={styles.quickAccessGrid}>
            <QuickAccessCard
              color={colors.purple}
              icon="images"
              subtitle="Képek és videók"
              title="Emlékek"
              onPress={() => openRoute('/memories')}
              palette={palette}
            />
            <QuickAccessCard
              color={colors.teal}
              icon="shield-checkmark"
              subtitle="Biztonságos adatok"
              title="Páncélterem"
              onPress={() => openRoute('/vault')}
              palette={palette}
            />
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Új esemény létrehozása"
        onPress={() => openRoute('/create-event')}
        style={({ pressed }) => [
          styles.floatingAddButton,
          { backgroundColor: palette.primary },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 112, gap: spacing.lg },
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  heroCard: {
    padding: spacing.xl,
    gap: spacing.xs,
    overflow: 'hidden',
    borderRadius: radius.xl,
    ...shadows.floating,
  },
  heroCircleLarge: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroCircleSmall: {
    position: 'absolute',
    bottom: -40,
    right: 60,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  greeting: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  wave: { fontSize: 24 },
  heroDate: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  heroPills: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heroPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.round,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  familySwitcherSource: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: { flexShrink: 1, fontSize: 18, fontWeight: '900' },
  sectionActionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionAction: { fontSize: 13, fontWeight: '800' },
  errorCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 12 },
  peopleRow: { gap: spacing.lg, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  person: { width: 74, alignItems: 'center', gap: spacing.xs },
  avatarRing: {
    width: 60,
    height: 60,
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
  },
  avatar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  personName: { fontSize: 12, fontWeight: '700' },
  addPerson: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  todayCard: {
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  todayCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  todayTitleIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  todayTitle: { fontSize: 17, fontWeight: '900' },
  todaySubtitle: { marginTop: 2, fontSize: 12 },
  todayStats: { flexDirection: 'row', alignItems: 'stretch' },
  todayStat: { flex: 1, alignItems: 'center', gap: 4 },
  todayStatIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  todayStatValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  todayStatLabel: { fontSize: 12, fontWeight: '800' },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  nextEventCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  dateTile: {
    width: 58,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dateTileMonth: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  dateTileDay: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 28 },
  listTitle: { fontSize: 16, fontWeight: '900' },
  listMeta: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  todayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
  },
  todayBadgeText: { fontSize: 11, fontWeight: '900' },
  quickAccessGrid: { flexDirection: 'row', gap: spacing.md },
  quickAccessCard: {
    flex: 1,
    minHeight: 150,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  quickAccessIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  quickAccessContent: { alignSelf: 'stretch' },
  quickAccessTitle: { fontSize: 17, fontWeight: '900' },
  quickAccessSubtitle: { marginTop: 3, fontSize: 12 },
  quickAccessArrow: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  floatingAddButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 92,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    ...shadows.floating,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});