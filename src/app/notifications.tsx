import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useNotifications } from '@/hooks/use-notifications';
import type { AppNotification } from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
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

      </View>
      <Text style={[styles.notificationDate, { color: palette.textMuted }]}>{formatNotificationDate(notification.created_at)}</Text>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [markingAll, setMarkingAll] = useState(false);
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
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'events') {
      return ['calendar', 'memory', 'medicine', 'task'].includes(
        notification.notification_type,
      );
    }
    return !['calendar', 'memory', 'medicine', 'task'].includes(
      notification.notification_type,
    );
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Értesítések</Text>

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
    backgroundColor: '#EEF4FC',
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
    backgroundColor: 'transparent',
  },

  unreadNotification: {
    backgroundColor: 'rgba(232, 240, 255, 0.45)',
    borderRadius: radius.lg,
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

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },

  disabled: {
    opacity: 0.4,
  },
});
