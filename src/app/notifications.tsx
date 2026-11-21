import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type AppNotification,
  type NotificationPreferences,
} from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NotificationFilter = 'all' | 'events' | 'system';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

function getNotificationIcon(type: string, palette: typeof colors | typeof darkColors): {
  name: IconName;
  color: string;
  backgroundColor: string;
} {
  switch (type) {
    case 'family_invite':
      return { name: 'person-add', color: '#E97932', backgroundColor: palette.surfaceMuted };

    case 'calendar':
      return { name: 'calendar', color: palette.primary, backgroundColor: palette.primarySoft };

    case 'task':
      return { name: 'checkbox-outline', color: palette.purple, backgroundColor: palette.surfaceMuted };

    case 'location':
      return { name: 'location', color: palette.primary, backgroundColor: palette.primarySoft };

    case 'memory':
      return { name: 'image', color: palette.purple, backgroundColor: palette.surfaceMuted };

    case 'medicine':
      return { name: 'medkit', color: palette.teal, backgroundColor: palette.surfaceMuted };

    case 'reminder':
      return { name: 'alarm', color: palette.warning, backgroundColor: palette.surfaceMuted };

    case 'document':
      return { name: 'document-text', color: palette.primary, backgroundColor: palette.primarySoft };

    default:
      return { name: 'shield-checkmark', color: palette.danger, backgroundColor: palette.surfaceMuted };
  }
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  }
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 1) return 'Tegnap';
  if (days > 1 && days < 7) return `${days} napja`;
  return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

function NotificationItem({
  notification,
  onPress,
  palette,
}: {
  notification: AppNotification;
  onPress: () => void;
  palette: typeof colors | typeof darkColors;
}) {
  const unread = !notification.read_at;
  const icon = getNotificationIcon(notification.notification_type, palette);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.notification,
        { backgroundColor: unread ? palette.primarySoft : 'transparent' },
        unread && styles.unreadNotification,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: icon.backgroundColor }]}>
        <Ionicons name={icon.name} size={24} color={icon.color} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeading}>
          <Text
            numberOfLines={1}
            style={[styles.notificationTitle, { color: palette.textPrimary }, unread && styles.unreadTitle]}
          >
            {notification.title}
          </Text>

          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        {notification.body ? (
          <Text numberOfLines={2} style={[styles.notificationBody, { color: palette.textSecondary }]}>
            {notification.body}
          </Text>
        ) : null}

      </View>
      <Text style={[styles.notificationDate, { color: palette.textMuted }]}>{formatNotificationDate(notification.created_at)}</Text>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const [markingAll, setMarkingAll] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  useEffect(() => {
    if (!profile?.id) return;
    void getMyFamilies()
      .then(async (families) => {
        const active = families[0] ?? null;
        setFamilyId(active?.id ?? null);
        if (!active) {
          setMembers([]);
          setPreferences(null);
          return;
        }
        const [familyMembers, saved] = await Promise.all([
          getFamilyMembers(active.id),
          getNotificationPreferences(profile.id, active.id),
        ]);
        setMembers(familyMembers);
        const next =
          saved ?? {
            profile_id: profile.id,
            family_id: active.id,
            enabled_types: [
              'family_invite',
              'calendar',
              'task',
              'medicine',
              'reminder',
              'document',
              'location',
              'memory',
            ],
            muted_member_ids: [],
            quiet_start: null,
            quiet_end: null,
          };
        setPreferences(next);
        setQuietStart(next.quiet_start !== null ? String(next.quiet_start).padStart(2, '0') + ':00' : '');
        setQuietEnd(next.quiet_end !== null ? String(next.quiet_end).padStart(2, '0') + ':00' : '');
      })
      .catch((caught: unknown) => {
        Alert.alert(
          'Beállítások betöltése sikertelen',
          caught instanceof Error ? caught.message : 'Próbáld újra később.',
        );
      });
  }, [profile?.id]);

  function isQuietHours() {
    if (!preferences?.quiet_start && preferences?.quiet_start !== 0) return false;
    if (!preferences?.quiet_end && preferences?.quiet_end !== 0) return false;
    const now = new Date().getHours();
    const start = preferences.quiet_start;
    const end = preferences.quiet_end;
    if (start === null || end === null) return false;
    return start <= end
      ? now >= start && now < end
      : now >= start || now < end;
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (isQuietHours()) return false;
    if (
      preferences &&
      !preferences.enabled_types.includes(notification.notification_type)
    ) return false;
    if (preferences?.muted_member_ids.length) {
      const actorId =
        (notification.data.profileId as string | undefined) ??
        (notification.data.memberId as string | undefined) ??
        (notification.data.actorProfileId as string | undefined);
      if (actorId && preferences.muted_member_ids.includes(actorId)) return false;
    }
    if (filter === 'all') return true;
    if (filter === 'events') {
      return ['calendar', 'memory', 'medicine', 'task', 'reminder', 'document'].includes(
        notification.notification_type,
      );
    }
    return !['calendar', 'memory', 'medicine', 'task', 'reminder', 'document'].includes(
      notification.notification_type,
    );
  });

  const notificationTypes: { key: string; label: string; icon: IconName }[] = [
    { key: 'family_invite', label: 'Meghívások', icon: 'person-add-outline' },
    { key: 'calendar', label: 'Események', icon: 'calendar-outline' },
    { key: 'task', label: 'Teendők', icon: 'checkbox-outline' },
    { key: 'medicine', label: 'Gyógyszerek', icon: 'medkit-outline' },
    { key: 'reminder', label: 'Emlékeztetők', icon: 'alarm-outline' },
    { key: 'document', label: 'Dokumentumok', icon: 'document-text-outline' },
    { key: 'memory', label: 'Emlékek', icon: 'image-outline' },
  ];

  function toggleType(type: string) {
    setPreferences((current) => {
      if (!current) return current;
      const enabled = current.enabled_types.includes(type);
      return {
        ...current,
        enabled_types: enabled
          ? current.enabled_types.filter((item) => item !== type)
          : [...current.enabled_types, type],
      };
    });
  }

  function toggleMember(memberId: string) {
    setPreferences((current) => {
      if (!current) return current;
      const muted = current.muted_member_ids.includes(memberId);
      return {
        ...current,
        muted_member_ids: muted
          ? current.muted_member_ids.filter((item) => item !== memberId)
          : [...current.muted_member_ids, memberId],
      };
    });
  }

  async function savePreferences() {
    if (!preferences) return;
    const parseHour = (value: string) => {
      const match = /^([01]\d|2[0-3]):00$/.exec(value.trim());
      return match ? Number(match[1]) : null;
    };
    const start = quietStart ? parseHour(quietStart) : null;
    const end = quietEnd ? parseHour(quietEnd) : null;
    if ((quietStart && start === null) || (quietEnd && end === null)) {
      Alert.alert('Hibás idő', 'Használd ezt a formátumot: 22:00');
      return;
    }
    setSavingPreferences(true);
    try {
      await saveNotificationPreferences({
        ...preferences,
        quiet_start: start,
        quiet_end: end,
      });
      setPreferences((current) => current ? { ...current, quiet_start: start, quiet_end: end } : current);
      setSettingsVisible(false);
    } catch (caught) {
      Alert.alert(
        'Mentés sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra később.',
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Értesítések</Text>

        <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel="Összes megjelölése olvasottként"
          accessibilityRole="button"
          disabled={unreadCount === 0 || markingAll}
          onPress={() => {
            setMarkingAll(true);
            void markAllAsRead()
              .catch((caught: unknown) => {
                Alert.alert(
                  'Sikertelen művelet',
                  caught instanceof Error ? caught.message : 'Az értesítések frissítése sikertelen.',
                );
              })
              .finally(() => setMarkingAll(false));
          }}
          style={({ pressed }) => [
            [styles.headerButton, { backgroundColor: palette.surface, borderColor: palette.border }],
            (unreadCount === 0 || markingAll) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name={markingAll ? 'hourglass-outline' : 'checkmark-done'} size={23} color={palette.primary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Értesítési beállítások"
          accessibilityRole="button"
          onPress={() => setSettingsVisible(true)}
          style={({ pressed }) => [
            [styles.headerButton, { backgroundColor: palette.surface, borderColor: palette.border }],
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="options-outline" size={22} color={palette.primary} />
        </Pressable>
        </View>
      </View>

      <View style={[styles.filters, { backgroundColor: palette.surfaceElevated }]}>
        {([
          ['all', 'Összes'],
          ['events', 'Események'],
          ['system', 'Rendszer'],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === key }}
            onPress={() => setFilter(key)}
            style={[styles.filter, filter === key && [styles.activeFilter, { backgroundColor: palette.primary }]]}
          >
            <Text style={[styles.filterText, { color: palette.textSecondary }, filter === key && styles.activeFilterText]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              tintColor={palette.primaryLight}
              onRefresh={() => void refresh()}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={[styles.errorCard, { backgroundColor: palette.surfaceMuted }]}>
              <Text style={[styles.errorText, { color: palette.danger }]}>{error.message}</Text>
            </View>
          ) : null}

          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.surface }]}>
                <Ionicons name="notifications-off-outline" size={34} color={palette.textMuted} />
              </View>

              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Nincs új értesítés</Text>

              <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                Az új családi események, meghívók és emlékeztetők itt jelennek meg.
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                palette={palette}
                onPress={() => {
                  if (!notification.read_at) {
                    void markAsRead(notification.id);
                  }
                  if (notification.notification_type === 'family_invite') {
                    router.push('/invitations');
                  }
                }}
              />
            ))
          )}
        </ScrollView>
      )}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={[styles.settingsOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.settingsModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, { color: palette.textPrimary }]}>Értesítési központ</Text>
              <Pressable onPress={() => setSettingsVisible(false)} accessibilityLabel="Beállítások bezárása" hitSlop={8}>
                <Ionicons name="close" size={24} color={palette.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.settingsSection, { color: palette.textMuted }]}>Értesítések fajtája</Text>
              {notificationTypes.map((type) => {
                const enabled = preferences?.enabled_types.includes(type.key) ?? true;
                return (
                  <View key={type.key} style={[styles.settingRow, { borderColor: palette.border }]}>
                    <View style={[styles.settingIcon, { backgroundColor: palette.primarySoft }]}>
                      <Ionicons name={type.icon} size={20} color={palette.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{type.label}</Text>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggleType(type.key)}
                      trackColor={{ false: palette.border, true: palette.primaryLight }}
                      thumbColor={enabled ? colors.white : undefined}
                    />
                  </View>
                );
              })}

              <Text style={[styles.settingsSection, { color: palette.textMuted }]}>Csendes időszak</Text>
              <View style={styles.quietRow}>
                <View style={styles.quietField}>
                  <Text style={[styles.quietLabel, { color: palette.textSecondary }]}>Kezdés</Text>
                  <TextInput
                    value={quietStart}
                    onChangeText={setQuietStart}
                    placeholder="22:00"
                    placeholderTextColor={palette.textMuted}
                    style={[styles.quietInput, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
                  />
                </View>
                <View style={styles.quietField}>
                  <Text style={[styles.quietLabel, { color: palette.textSecondary }]}>Befejezés</Text>
                  <TextInput
                    value={quietEnd}
                    onChangeText={setQuietEnd}
                    placeholder="07:00"
                    placeholderTextColor={palette.textMuted}
                    style={[styles.quietInput, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
                  />
                </View>
              </View>

              {members.length > 0 ? (
                <>
                  <Text style={[styles.settingsSection, { color: palette.textMuted }]}>Családtagok elnémítása</Text>
                  {members.filter((member) => member.profile_id !== profile?.id).map((member) => {
                    const muted = preferences?.muted_member_ids.includes(member.profile_id) ?? false;
                    return (
                      <View key={member.profile_id} style={[styles.settingRow, { borderColor: palette.border }]}>
                        <View style={[styles.memberInitial, { backgroundColor: palette.primarySoft }]}>
                          <Text style={[styles.memberInitialText, { color: palette.primary }]}>
                            {(member.nickname || member.display_name).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>
                          {member.nickname || member.display_name}
                        </Text>
                        <Switch
                          value={muted}
                          onValueChange={() => toggleMember(member.profile_id)}
                          trackColor={{ false: palette.border, true: palette.danger }}
                          thumbColor={muted ? colors.white : undefined}
                        />
                      </View>
                    );
                  })}
                </>
              ) : null}
            </ScrollView>
            <Pressable
              disabled={savingPreferences}
              onPress={() => void savePreferences()}
              style={[styles.saveSettings, { backgroundColor: palette.primary, opacity: savingPreferences ? 0.65 : 1 }]}
            >
              <Text style={styles.saveSettingsText}>{savingPreferences ? 'Mentés…' : 'Beállítások mentése'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  headerTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  filters: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 4,
    flexDirection: 'row',
    borderRadius: radius.round,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filter: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },

  activeFilter: {
    backgroundColor: colors.primary,
    ...shadows.floating,
  },

  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },

  activeFilterText: {
    color: colors.white,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notification: {
    minHeight: 74,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },

  unreadNotification: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },

  unreadIconBox: {
    backgroundColor: colors.primarySoft,
  },

  symbol: {
    width: 26,
    height: 26,
  },

  largeSymbol: {
    width: 40,
    height: 40,
  },

  notificationContent: {
    flex: 1,
    gap: spacing.xs,
  },

  notificationHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  notificationTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },

  unreadTitle: {
    color: colors.textPrimary,
    fontWeight: '900',
  },

  notificationBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  notificationDate: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.round,
    backgroundColor: colors.primaryLight,
  },

  emptyState: {
    paddingVertical: 80,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },

  emptyText: {
    maxWidth: 300,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  errorCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#3B1622',
  },

  errorText: {
    color: '#FDA4AF',
    fontSize: 12,
  },

  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  settingsModal: {
    maxHeight: '88%',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
  },

  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  settingsTitle: {
    fontSize: 20,
    fontWeight: '900',
  },

  settingsSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  settingRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },

  quietRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  quietField: {
    flex: 1,
    gap: spacing.xs,
  },

  quietLabel: {
    fontSize: 11,
    fontWeight: '800',
  },

  quietInput: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },

  memberInitial: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberInitialText: {
    fontSize: 14,
    fontWeight: '900',
  },

  saveSettings: {
    minHeight: 52,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveSettingsText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },

  disabled: {
    opacity: 0.4,
  },
});
