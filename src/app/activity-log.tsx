import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import {
  getFamilyActivityTimeline,
  type ActivityLog,
  type ActivityType,
} from '@/services/activity';
import { getMyFamilies, getFamilyMembers, type FamilyMember } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterType = 'all' | 'task' | 'event' | 'document' | 'memory' | 'family_member' | 'health';

const filterMeta: { key: FilterType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'all', label: 'Összes', icon: 'time-outline' },
  { key: 'task', label: 'Teendők', icon: 'checkbox-outline' },
  { key: 'event', label: 'Események', icon: 'calendar-outline' },
  { key: 'document', label: 'Dokumentumok', icon: 'document-text-outline' },
  { key: 'memory', label: 'Emlékek', icon: 'image-outline' },
  { key: 'family_member', label: 'Családtagok', icon: 'people-outline' },
  { key: 'health', label: 'Egészség', icon: 'medkit-outline' },
];

function activityIcon(type: ActivityType): React.ComponentProps<typeof Ionicons>['name'] {
  if (type.startsWith('task')) return 'checkbox-outline';
  if (type.startsWith('event')) return 'calendar-outline';
  if (type.startsWith('document')) return 'document-text-outline';
  if (type.startsWith('memory')) return 'image-outline';
  if (type.startsWith('family_member')) return 'people-outline';
  if (type.includes('medication')) return 'medkit-outline';
  if (type.includes('emergency')) return 'call-outline';
  return 'time-outline';
}

function activityColor(type: ActivityType, palette: typeof colors | typeof darkColors) {
  if (type.startsWith('task')) return palette.purple;
  if (type.startsWith('event')) return palette.primary;
  if (type.startsWith('document')) return palette.teal;
  if (type.startsWith('memory')) return palette.pink;
  if (type.startsWith('family_member')) return palette.warning;
  if (type.includes('medication')) return palette.pink;
  if (type.includes('emergency')) return palette.teal;
  return palette.textMuted;
}

function formatDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Ma';
  if (date.toDateString() === yesterday.toDateString()) return 'Tegnap';
  return date.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });
}

export default function ActivityLogScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [memberFilter, setMemberFilter] = useState<string | 'all'>('all');

  async function load(id = familyId) {
    if (!id) {
      setLogs([]);
      setLoading(false);
      return;
    }
    try {
      setLogs(await getFamilyActivityTimeline(id, { limit: 200 }));
    } catch (caught) {
      Alert.alert(
        'Az aktivitásnapló betöltése sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra később.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        if (!id) {
          setLoading(false);
          return;
        }
        const [familyMembers, timeline] = await Promise.all([
          getFamilyMembers(id),
          getFamilyActivityTimeline(id, { limit: 200 }),
        ]);
        setMembers(familyMembers);
        setLogs(timeline);
        setLoading(false);
      })
      .catch((caught) => {
        setLoading(false);
        Alert.alert(
          'Betöltés sikertelen',
          caught instanceof Error ? caught.message : 'Próbáld újra később.',
        );
      });
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (memberFilter !== 'all' && log.actor_profile_id !== memberFilter) return false;
      if (filter === 'all') return true;
      if (filter === 'health') {
        return log.type.includes('medication') || log.type.includes('emergency');
      }
      return log.entity_type === filter;
    });
  }, [filter, logs, memberFilter]);

  const groupedLogs = useMemo(() => {
    const groups = new Map<string, ActivityLog[]>();
    filteredLogs.forEach((log) => {
      const key = new Date(log.created_at).toDateString();
      const current = groups.get(key) ?? [];
      current.push(log);
      groups.set(key, current);
    });
    return [...groups.entries()].map(([key, entries]) => ({
      key,
      label: formatDay(entries[0].created_at),
      entries,
    }));
  }, [filteredLogs]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Aktivitásnapló</Text>
        <Pressable
          accessibilityLabel="Aktivitásnapló szűrői"
          onPress={() => setFilterVisible(true)}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="options-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={palette.primary}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summary, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <View style={[styles.summaryIcon, { backgroundColor: palette.surface }]}>
            <Ionicons name="pulse-outline" size={25} color={palette.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.summaryTitle, { color: palette.textPrimary }]}>Családi események</Text>
            <Text style={[styles.summaryText, { color: palette.textSecondary }]}>
              {filteredLogs.length} látható művelet
            </Text>
          </View>
        </View>

        {loading ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>Aktivitások betöltése…</Text>
        ) : groupedLogs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="time-outline" size={38} color={palette.textMuted} />
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Még nincs aktivitás</Text>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              A családi műveletek itt jelennek meg időrendben.
            </Text>
          </View>
        ) : (
          groupedLogs.map((group) => (
            <View key={group.key} style={styles.dayGroup}>
              <Text style={[styles.dayLabel, { color: palette.textMuted }]}>{group.label}</Text>
              <View style={styles.timeline}>
                {group.entries.map((log, index) => {
                  const color = activityColor(log.type, palette);
                  const time = new Date(log.created_at).toLocaleTimeString('hu-HU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <View key={log.id} style={styles.timelineRow}>
                      <View style={styles.timelineRail}>
                        <View style={[styles.activityIcon, { backgroundColor: `${color}20`, borderColor: `${color}55` }]}>
                          <Ionicons name={activityIcon(log.type)} size={19} color={color} />
                        </View>
                        {index < group.entries.length - 1 ? (
                          <View style={[styles.timelineLine, { backgroundColor: palette.border }]} />
                        ) : null}
                      </View>
                      <View style={[styles.activityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        <View style={styles.activityHeader}>
                          <Text numberOfLines={2} style={[styles.activitySummary, { color: palette.textPrimary }]}>
                            {log.summary}
                          </Text>
                          <Text style={[styles.activityTime, { color: palette.textMuted }]}>{time}</Text>
                        </View>
                        {log.actorName ? (
                          <Text style={[styles.activityActor, { color: palette.textSecondary }]}>
                            {log.actorName}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={[styles.filterOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.filterModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Aktivitásszűrők</Text>
              <Pressable onPress={() => setFilterVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.modalLabel, { color: palette.textMuted }]}>Művelettípus</Text>
            <View style={styles.chipWrap}>
              {filterMeta.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: filter === item.key ? palette.primary : palette.surfaceElevated },
                  ]}
                >
                  <Ionicons name={item.icon} size={16} color={filter === item.key ? colors.white : palette.textSecondary} />
                  <Text style={{ color: filter === item.key ? colors.white : palette.textSecondary, fontWeight: '800' }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.modalLabel, { color: palette.textMuted }]}>Családtag</Text>
            <View style={styles.chipWrap}>
              <Pressable
                onPress={() => setMemberFilter('all')}
                style={[styles.filterChip, { backgroundColor: memberFilter === 'all' ? palette.primary : palette.surfaceElevated }]}
              >
                <Text style={{ color: memberFilter === 'all' ? colors.white : palette.textSecondary, fontWeight: '800' }}>Mind</Text>
              </Pressable>
              {members.map((member) => (
                <Pressable
                  key={member.profile_id}
                  onPress={() => setMemberFilter(member.profile_id)}
                  style={[styles.filterChip, { backgroundColor: memberFilter === member.profile_id ? palette.primary : palette.surfaceElevated }]}
                >
                  <Text style={{ color: memberFilter === member.profile_id ? colors.white : palette.textSecondary, fontWeight: '800' }}>
                    {member.nickname || member.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterActions}>
              <Pressable onPress={() => { setFilter('all'); setMemberFilter('all'); }} style={styles.cancelButton}>
                <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Szűrők törlése</Text>
              </Pressable>
              <Pressable onPress={() => setFilterVisible(false)} style={[styles.applyButton, { backgroundColor: palette.primary }]}>
                <Text style={styles.applyText}>Megjelenítés</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 25, fontWeight: '900' },
  headerButton: { width: 42, height: 42, borderWidth: 1, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  summary: { minHeight: 78, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 16, fontWeight: '900' },
  summaryText: { marginTop: 3, fontSize: 12 },
  empty: { padding: spacing.xl, textAlign: 'center' },
  emptyCard: { minHeight: 180, padding: spacing.xl, borderWidth: 1, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyText: { maxWidth: 280, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  dayGroup: { gap: spacing.sm },
  dayLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeline: { gap: spacing.sm },
  timelineRow: { minHeight: 74, flexDirection: 'row', gap: spacing.sm },
  timelineRail: { width: 44, alignItems: 'center' },
  activityIcon: { width: 40, height: 40, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -4, borderRadius: 1 },
  activityCard: { flex: 1, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg, ...shadows.card },
  activityHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  activitySummary: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '900' },
  activityTime: { fontSize: 10, fontWeight: '800' },
  activityActor: { marginTop: 5, fontSize: 11, fontWeight: '700' },
  filterOverlay: { flex: 1, justifyContent: 'flex-end' },
  filterModal: { maxHeight: '82%', padding: spacing.xl, gap: spacing.md, borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: { minHeight: 38, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.round },
  filterActions: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  cancelButton: { padding: spacing.md },
  applyButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
