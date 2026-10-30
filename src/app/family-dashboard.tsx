// components/family-dashboard.tsx
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useFamilyDashboard } from '@/hooks/use-family-dashboard';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import type { Family } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type DashboardTarget = 'calendar' | 'tasks' | 'medications' | 'chat';

type Props = {
  familyId: string | null | undefined;
  profileId: string | null | undefined;
  /** A kártyákra koppintáskor hívódik; a route-okat a hívó oldalon döntöd el. */
  onNavigate?: (target: DashboardTarget) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}. ${d.getDate()}.`;
}

function formatActivityDate(iso: string): string {
  return new Date(iso).toLocaleString('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function birthdayLabel(daysAway: number): string {
  if (daysAway === 0) return 'Ma';
  if (daysAway === 1) return 'Holnap';
  return `${daysAway} nap múlva`;
}

export function FamilyDashboard({ familyId, profileId, onNavigate }: Props) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const styles = createStyles(palette);
  const { data, loading, failedCount } = useFamilyDashboard({ familyId, profileId });

  if (!familyId) return null;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  const { todayEvents, overdueTasks, overdueTaskTotal, medications, unreadMessages, birthdays, activityLogs } = data;
  const allEmpty =
    todayEvents.length === 0 &&
    overdueTaskTotal === 0 &&
    medications.length === 0 &&
    unreadMessages === 0 &&
    birthdays.length === 0 &&
    activityLogs.length === 0;

  const tiles: {
    key: DashboardTarget;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
    alert?: boolean;
  }[] = [
    { key: 'calendar', icon: 'calendar-outline', label: 'Mai esemény', value: todayEvents.length },
    { key: 'tasks', icon: 'alarm-outline', label: 'Lejárt teendő', value: overdueTaskTotal, alert: overdueTaskTotal > 0 },
    { key: 'medications', icon: 'medkit-outline', label: 'Mai gyógyszer', value: medications.length },
    { key: 'chat', icon: 'chatbubbles-outline', label: 'Olvasatlan üzenet', value: unreadMessages, alert: unreadMessages > 0 },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable key={tile.key} onPress={() => onNavigate?.(tile.key)} style={styles.tile} accessibilityRole="button">
            <Ionicons name={tile.icon} size={22} color={tile.alert ? palette.warning : palette.primary} />
            <Text style={[styles.tileValue, tile.alert && { color: palette.warning }]}>{tile.value}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>

      {failedCount > 0 ? (
        <Text style={styles.warn}>
          {failedCount === 1 ? 'Egy adatforrást' : `${failedCount} adatforrást`} most nem sikerült frissíteni.
        </Text>
      ) : null}

      {allEmpty ? (
        <View style={styles.card}>
          <Ionicons name="sunny-outline" size={26} color={palette.primary} />
          <Text style={styles.emptyText}>Ma nincs semmi sürgős – élvezzétek a napot!</Text>
        </View>
      ) : null}

      {todayEvents.length > 0 ? (
        <Section title="Mai események" palette={palette} onMore={() => onNavigate?.('calendar')}>
          {todayEvents.map((event) => (
            <Row
              key={event.id}
              icon="time-outline"
              title={event.title}
              meta={[formatTime(event.starts_at), event.location_name].filter(Boolean).join(' · ')}
              palette={palette}
            />
          ))}
        </Section>
      ) : null}

      {medications.length > 0 ? (
        <Section title="Gyógyszer-emlékeztetők" palette={palette} onMore={() => onNavigate?.('medications')}>
          {medications.map((med) => (
            <Row
              key={med.id}
              icon="medkit-outline"
              title={`${med.name}${med.dosageText ? ` (${med.dosageText})` : ''}`}
              meta={[med.person, formatTime(med.nextAt), med.late ? 'késésben' : null].filter(Boolean).join(' · ')}
              danger={med.late}
              palette={palette}
            />
          ))}
        </Section>
      ) : null}

      {birthdays.length > 0 ? (
        <Section title="Közelgő születésnapok" palette={palette}>
          {birthdays.map((b) => (
            <Row
              key={b.profileId}
              icon="gift-outline"
              title={b.name}
              meta={`${birthdayLabel(b.daysAway)}${b.turning ? ` · ${b.turning} éves lesz` : ''}`}
              palette={palette}
            />
          ))}
        </Section>
      ) : null}

      {overdueTasks.length > 0 ? (
        <Section title="Lejárt teendők" palette={palette} onMore={() => onNavigate?.('tasks')}>
          {overdueTasks.slice(0, 5).map((task) => (
            <Row key={task.id} icon="alert-circle-outline" title={task.title} meta={`Határidő: ${formatDueDate(task.due_at)}`} danger palette={palette} />
          ))}
          {overdueTaskTotal > 5 ? <Text style={styles.more}>+ {overdueTaskTotal - 5} további</Text> : null}
        </Section>
      ) : null}
      {activityLogs.length > 0 ? (
        <Section title="CsalĂˇdi aktivitĂˇs" palette={palette}>
          {activityLogs.slice(0, 5).map((entry) => (
            <Row
              key={entry.id}
              icon={activityIcon(entry.type)}
              title={entry.summary}
              meta={[entry.actorName, formatActivityDate(entry.created_at)].filter(Boolean).join(' Â· ')}
              palette={palette}
            />
          ))}
        </Section>
      ) : null}
    </View>
  );
}

function activityIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'task_completed':
      return 'checkmark-circle-outline';
    case 'task_reopened':
      return 'refresh-circle-outline';
    case 'task_deleted':
      return 'trash-outline';
    default:
      return 'sparkles-outline';
  }
}

export default function FamilyDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const styles = createStyles(palette);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);

  function navigate(target: DashboardTarget) {
    switch (target) {
      case 'calendar':
        router.push('/calendar');
        break;
      case 'tasks':
        router.push('/tasks');
        break;
      case 'medications':
        router.push('/medications');
        break;
      case 'chat':
        router.push('/messages');
        break;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Vissza">
          <Ionicons name="chevron-back" size={25} color={palette.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.screenTitle}>Vezérlőpult</Text>
          <Text numberOfLines={1} style={styles.screenSubtitle}>
            {activeFamily?.name ?? 'Családi áttekintő'}
          </Text>
        </View>
        <Ionicons name="analytics-outline" size={23} color={palette.primary} />
      </View>

      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <FamilySwitcher onActiveFamilyChange={setActiveFamily} />
        <FamilyDashboard
          familyId={activeFamily?.id}
          profileId={profile?.id}
          onNavigate={navigate}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type Palette = typeof colors | typeof darkColors;

function Section({
  title,
  palette,
  onMore,
  children,
}: {
  title: string;
  palette: Palette;
  onMore?: () => void;
  children: React.ReactNode;
}) {
  const styles = createStyles(palette);
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onMore ? (
          <Pressable onPress={onMore} hitSlop={8}>
            <Text style={styles.link}>Összes</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  meta,
  danger,
  palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta?: string;
  danger?: boolean;
  palette: Palette;
}) {
  const styles = createStyles(palette);
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={danger ? palette.warning : palette.primary} />
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={[styles.rowMeta, danger && { color: palette.warning }]} numberOfLines={1}>{meta}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.background },
    header: {
      minHeight: 64,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    back: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.round,
      backgroundColor: palette.surface,
    },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    screenTitle: { color: palette.textPrimary, fontSize: 23, fontWeight: '900' },
    screenSubtitle: { color: palette.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
    screenContent: { padding: spacing.lg, paddingBottom: 36, gap: spacing.md },
    wrap: { gap: spacing.md },
    loading: { padding: spacing.xl, alignItems: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tile: {
      flexBasis: '48%',
      flexGrow: 1,
      padding: spacing.md,
      gap: 2,
      borderRadius: radius.lg,
      backgroundColor: palette.surface,
      ...shadows.card,
    },
    tileValue: { color: palette.textPrimary, fontSize: 26, fontWeight: '900', marginTop: spacing.xs },
    tileLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: '700' },
    warn: { color: palette.textMuted, fontSize: 11, textAlign: 'center' },
    card: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.xl, backgroundColor: palette.surface, ...shadows.card },
    emptyText: { color: palette.textSecondary, fontSize: 14, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: '900' },
    link: { color: palette.primary, fontSize: 12, fontWeight: '800' },
    rows: { gap: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    flex: { flex: 1 },
    rowTitle: { color: palette.textPrimary, fontSize: 14, fontWeight: '800' },
    rowMeta: { color: palette.textSecondary, fontSize: 11, marginTop: 2 },
    more: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
  });
}
