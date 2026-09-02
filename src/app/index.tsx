import { FamilyHeader } from '@/components/family-header';
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, radius, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import type { Family } from '@/services/families';
import type { AppNotification } from '@/services/notifications';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = SymbolViewProps['name'];

const quickActions: {
  label: string;
  color: string;
  icon: IconName;
  route?: '/map' | '/invite-member' | '/create-event';
}[] = [
  {
    label: 'Új esemény',
    color: '#8B5CF6',
    icon: { ios: 'calendar.badge.plus', android: 'event_upcoming', web: 'event_upcoming' },
    route: '/create-event',
  },
  {
    label: 'Új feladat',
    color: '#34D399',
    icon: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  },
  {
    label: 'Gyógyszer',
    color: '#F55B91',
    icon: { ios: 'pills.fill', android: 'medication', web: 'medication' },
  },
  {
    label: 'Helyzetjelzés',
    color: '#38BDF8',
    icon: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
    route: '/map',
  },
  {
    label: 'Meghívás',
    color: '#7C6CF2',
    icon: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
    route: '/invite-member',
  },
];

function AppSymbol({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      type="hierarchical"
      weight={{ ios: 'semibold', android: medium }}
      style={{ width: size + 3, height: size + 3 }}
    />
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}  ›</Text> : null}
    </View>
  );
}

function SummaryCard({
  icon,
  color,
  value,
  label,
  meta,
  compact,
}: {
  icon: IconName;
  color: string;
  value: number;
  label: string;
  meta: string;
  compact: boolean;
}) {
  return (
    <View style={[styles.summaryCard, compact && styles.summaryCardCompact]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}2B` }]}>
        <AppSymbol name={icon} color={color} size={22} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryMeta}>{meta}</Text>
      </View>
    </View>
  );
}

function EventRow({ day, title, meta, color }: { day: string; title: string; meta: string; color: string }) {
  return (
    <View style={styles.listRow}>
      <View style={[styles.dateBadge, { borderColor: `${color}88` }]}>
        <Text style={[styles.dateMonth, { color }]}>MÁJ</Text>
        <Text style={styles.dateDay}>{day}</Text>
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.listTitle}>{title}</Text>
        <Text style={styles.listMeta}>{meta}</Text>
      </View>
      <View style={styles.miniAvatarGroup}>
        <View style={styles.miniAvatar}><Text style={styles.miniAvatarText}>G</Text></View>
        <View style={[styles.miniAvatar, styles.miniAvatarOverlap]}><Text style={styles.miniAvatarText}>+2</Text></View>
      </View>
    </View>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const unread = !notification.read_at;
  return (
    <View style={styles.listRow}>
      <View style={[styles.noticeIcon, unread && styles.noticeIconUnread]}>
        <AppSymbol
          name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
          color={unread ? '#6EE7B7' : colors.textMuted}
          size={19}
        />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.listTitle}>{notification.title}</Text>
        <Text numberOfLines={1} style={styles.listMeta}>{notification.body}</Text>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </View>
  );
}

function MemoryPreview({ color, icon, title, meta }: { color: string; icon: IconName; title: string; meta: string }) {
  return (
    <View style={[styles.memoryCard, { backgroundColor: `${color}24`, borderColor: `${color}55` }]}>
      <View style={styles.memoryGlow} />
      <AppSymbol name={icon} color={color} size={31} />
      <View>
        <Text numberOfLines={2} style={styles.memoryTitle}>{title}</Text>
        <Text style={styles.memoryMeta}>{meta}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const { profile, profileError } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const displayName = profile?.display_name?.trim() || 'Felhasználó';
  const userInitial = displayName.charAt(0).toLocaleUpperCase('hu-HU') || '?';
  const firstName = displayName.split(/\s+/)[0];
  const visibleNotifications = notifications.slice(0, 3);

  function openQuickAction(route?: '/map' | '/invite-member' | '/create-event') {
    if (!route) return;
    if (route === '/invite-member' && activeFamily) {
      router.push({
        pathname: route,
        params: { familyId: activeFamily.id, familyName: activeFamily.name },
      });
      return;
    }
    if (route === '/create-event' && activeFamily) {
      router.push({
        pathname: './create-event',
        params: { familyId: activeFamily.id, familyName: activeFamily.name },
      });
      return;
    }
    if (route === '/map') router.push(route);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View pointerEvents="none" style={styles.backgroundGlow} />
      <ScrollView contentContainerStyle={[styles.content, wide && styles.contentWide]} showsVerticalScrollIndicator={false}>
        <FamilyHeader
          userInitial={userInitial}
          unreadNotificationCount={unreadCount}
          onNotificationsPress={() => router.push('/notifications')}
          onProfilePress={() => router.push('/profile')}
        />

        <View style={styles.hero}>
          <Text style={styles.greeting}>Szia, {firstName}! <Text style={styles.wave}>👋</Text></Text>
          <Text style={styles.heroSubtitle}>Nézd meg, mi történik ma a családi térben.</Text>
        </View>

        <FamilySwitcher onActiveFamilyChange={setActiveFamily} />

        {profileError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>A profil betöltése sikertelen: {profileError}</Text>
          </View>
        ) : null}

        {activeFamily ? (
          <View>
            <SectionHeader title="Családtagok" action="Meghívás" />
            <ScrollView horizontal contentContainerStyle={styles.peopleRow} showsHorizontalScrollIndicator={false}>
              <View style={styles.person}>
                <View style={styles.avatarRing}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{userInitial}</Text></View>
                  <View style={styles.onlineDot} />
                </View>
                <Text numberOfLines={1} style={styles.personName}>{firstName}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => openQuickAction('/invite-member')}
                style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
                <View style={styles.addPerson}>
                  <AppSymbol name={{ ios: 'plus', android: 'add', web: 'add' }} color={colors.textSecondary} size={26} />
                </View>
                <Text style={styles.personMuted}>Meghívás</Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : null}

        <SectionHeader title="Mai összefoglaló" action="Részletek" />
        <View style={styles.summaryGrid}>
          <SummaryCard compact={!wide} value={0} label="Feladat" meta="ma" color="#3B82F6" icon={{ ios: 'checkmark.circle.fill', android: 'task_alt', web: 'task_alt' }} />
          <SummaryCard compact={!wide} value={2} label="Esemény" meta="ma" color="#8B5CF6" icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} />
          <SummaryCard compact={!wide} value={unreadCount} label="Értesítés" meta="új" color="#4ADE80" icon={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }} />
          <SummaryCard compact={!wide} value={0} label="Emlék" meta="ma" color="#FB7A28" icon={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }} />
        </View>

        <SectionHeader title="Gyors műveletek" />
        <ScrollView horizontal contentContainerStyle={styles.quickActions} showsHorizontalScrollIndicator={false}>
          {quickActions.map((action) => (
            <Pressable
              accessibilityRole="button"
              key={action.label}
              onPress={() => openQuickAction(action.route)}
              style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
              <View style={[styles.quickIcon, { backgroundColor: `${action.color}22` }]}>
                <AppSymbol name={action.icon} color={action.color} size={24} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.dashboardColumns, !wide && styles.dashboardColumnsStacked]}>
          <View style={[styles.panel, styles.dashboardPanel]}>
            <SectionHeader title="Közelgő események" action="Összes" />
            <EventRow day="25" title="Családi program" meta="Szombat 18:00" color="#8B5CF6" />
            <View style={styles.divider} />
            <EventRow day="28" title="Közös vacsora" meta="Kedd 19:00" color="#F55B91" />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/notifications')}
            style={[styles.panel, styles.dashboardPanel]}>
            <SectionHeader title="Aktív értesítések" action={`Összes (${unreadCount})`} />
            {visibleNotifications.length ? visibleNotifications.map((notification, index) => (
              <View key={notification.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <NotificationRow notification={notification} />
              </View>
            )) : (
              <View style={styles.emptyNotice}>
                <AppSymbol name={{ ios: 'bell.slash.fill', android: 'notifications_off', web: 'notifications_off' }} color={colors.textMuted} size={24} />
                <Text style={styles.emptyNoticeText}>Nincs aktív értesítés.</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={[styles.dashboardColumns, !wide && styles.dashboardColumnsStacked]}>
          <View style={[styles.panel, styles.dashboardPanel]}>
            <SectionHeader title="Gyógyszer-emlékeztető" action="Beállítások" />
            <View style={styles.medicineRow}>
              <View style={styles.medicineIcon}>
                <AppSymbol name={{ ios: 'pills.fill', android: 'medication', web: 'medication' }} color="#F472B6" size={27} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.listTitle}>Nincs mai emlékeztető</Text>
                <Text style={styles.listMeta}>A gyógyszer-modul hamarosan elérhető.</Text>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/map')}
            style={[styles.panel, styles.mapPreview]}>
            <SectionHeader title="Család térképe" action="Megnyitás" />
            <View style={styles.mapCanvas}>
              <View style={[styles.mapRoad, styles.mapRoadOne]} />
              <View style={[styles.mapRoad, styles.mapRoadTwo]} />
              <View style={[styles.mapMarker, { left: '20%', top: 25 }]}><Text style={styles.markerText}>{userInitial}</Text></View>
              <View style={[styles.mapMarker, styles.mapMarkerSecondary, { right: '19%', bottom: 20 }]}><Text style={styles.markerText}>+</Text></View>
              <View style={styles.homeMarker}>
                <AppSymbol name={{ ios: 'house.fill', android: 'home', web: 'home' }} color="#FFFFFF" size={19} />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <SectionHeader title="Friss emlékek" action="Összes" />
          <ScrollView horizontal contentContainerStyle={styles.memoriesRow} showsHorizontalScrollIndicator={false}>
            <MemoryPreview color="#38BDF8" icon={{ ios: 'mountain.2.fill', android: 'landscape', web: 'landscape' }} title="Kirándulás a hegyekben" meta="Hamarosan" />
            <MemoryPreview color="#F59E0B" icon={{ ios: 'sun.max.fill', android: 'sunny', web: 'sunny' }} title="Nyári családi pillanatok" meta="Hamarosan" />
            <MemoryPreview color="#F55B91" icon={{ ios: 'birthday.cake.fill', android: 'cake', web: 'cake' }} title="Születésnapi emlékek" meta="Hamarosan" />
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071326' },
  backgroundGlow: { position: 'absolute', top: -120, right: -100, width: 330, height: 330, borderRadius: 165, backgroundColor: '#0B4A8F', opacity: 0.2 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg },
  contentWide: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: spacing.xl },
  hero: { gap: spacing.xs, paddingVertical: spacing.xs },
  greeting: { color: colors.textPrimary, fontSize: 31, fontWeight: '900', letterSpacing: -0.8 },
  wave: { fontSize: 28 },
  heroSubtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  sectionHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { flexShrink: 1, color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  sectionAction: { color: '#9AAAC2', fontSize: 11, fontWeight: '600' },
  errorCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#7F2439', backgroundColor: '#3B1622' },
  errorText: { color: '#FDA4AF', fontSize: 12 },
  peopleRow: { gap: spacing.lg, paddingTop: spacing.md, paddingRight: spacing.lg },
  person: { width: 66, alignItems: 'center', gap: spacing.sm },
  avatarRing: { width: 62, height: 62, padding: 3, borderRadius: 31, borderWidth: 2, borderColor: '#38BDF8' },
  avatar: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#D6B38D' },
  avatarText: { color: '#3B2415', fontSize: 20, fontWeight: '900' },
  onlineDot: { position: 'absolute', right: -2, bottom: 4, width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: '#071326', backgroundColor: colors.success },
  personName: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  personMuted: { color: colors.textMuted, fontSize: 10 },
  addPerson: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 31, borderWidth: 1, borderColor: '#315079', backgroundColor: '#152945' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  summaryCard: { minWidth: 180, flex: 1, minHeight: 105, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#112541' },
  summaryCardCompact: { minWidth: '46%', minHeight: 96, padding: spacing.md },
  summaryIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  summaryValue: { color: colors.textPrimary, fontSize: 23, fontWeight: '900' },
  summaryLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  summaryMeta: { marginTop: 2, color: colors.textMuted, fontSize: 10 },
  quickActions: { gap: spacing.md, paddingRight: spacing.lg },
  quickCard: { width: 126, minHeight: 94, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#112541' },
  quickIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  quickLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  dashboardColumns: { flexDirection: 'row', gap: spacing.md },
  dashboardColumnsStacked: { flexDirection: 'column' },
  dashboardPanel: { flex: 1, minWidth: 0 },
  panel: { padding: spacing.lg, gap: spacing.sm, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#10233E' },
  listRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateBadge: { width: 46, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, backgroundColor: '#142843' },
  dateMonth: { fontSize: 9, fontWeight: '900' },
  dateDay: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  listTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  listMeta: { marginTop: 3, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  divider: { height: 1, backgroundColor: '#203A5C' },
  flex: { flex: 1 },
  miniAvatarGroup: { flexDirection: 'row', paddingRight: 4 },
  miniAvatar: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2, borderColor: '#10233E', backgroundColor: '#D6B38D' },
  miniAvatarOverlap: { marginLeft: -8, backgroundColor: '#253C5D' },
  miniAvatarText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  noticeIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#1A304B' },
  noticeIconUnread: { backgroundColor: '#0C4A45' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryLight },
  emptyNotice: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyNoticeText: { color: colors.textMuted, fontSize: 11 },
  medicineRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  medicineIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: '#4A1F48' },
  mapPreview: { flex: 1, minHeight: 190 },
  mapCanvas: { height: 125, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#15304B' },
  mapRoad: { position: 'absolute', height: 5, borderRadius: 3, backgroundColor: '#315A75', opacity: 0.8 },
  mapRoadOne: { top: 56, left: -25, width: '125%', transform: [{ rotate: '-12deg' }] },
  mapRoadTwo: { top: 62, left: 5, width: '105%', transform: [{ rotate: '22deg' }] },
  mapMarker: { position: 'absolute', width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, borderWidth: 3, borderColor: '#60A5FA', backgroundColor: '#D6B38D' },
  mapMarkerSecondary: { borderColor: '#A78BFA', backgroundColor: '#263D61' },
  markerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  homeMarker: { position: 'absolute', left: '47%', bottom: 17, width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#3B6DF6' },
  memoriesRow: { gap: spacing.md, paddingTop: spacing.xs, paddingRight: spacing.lg },
  memoryCard: { width: 185, height: 150, padding: spacing.lg, justifyContent: 'space-between', overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1 },
  memoryGlow: { position: 'absolute', top: -35, right: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFFFFF', opacity: 0.05 },
  memoryTitle: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  memoryMeta: { marginTop: 3, color: colors.textMuted, fontSize: 10 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
