import { colors, radius, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import type { AppNotification } from '@/services/notifications';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getNotificationIcon(
  type: string,
): SymbolViewProps['name'] {
  switch (type) {
    case 'family_invite':
      return {
        ios: 'person.badge.plus',
        android: 'person_add',
        web: 'person_add',
      };

    case 'calendar':
      return {
        ios: 'calendar',
        android: 'calendar_month',
        web: 'calendar_month',
      };

    case 'task':
      return {
        ios: 'checklist',
        android: 'checklist',
        web: 'checklist',
      };

    case 'location':
      return {
        ios: 'location.fill',
        android: 'location_on',
        web: 'location_on',
      };

    case 'memory':
      return {
        ios: 'photo.fill',
        android: 'photo',
        web: 'photo',
      };

    case 'medicine':
      return {
        ios: 'pills.fill',
        android: 'medication',
        web: 'medication',
      };

    default:
      return {
        ios: 'bell.fill',
        android: 'notifications',
        web: 'notifications',
      };
  }
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('hu-HU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const unread = !notification.read_at;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.notification,
        unread && styles.unreadNotification,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconBox, unread && styles.unreadIconBox]}>
        <SymbolView
          name={getNotificationIcon(notification.notification_type)}
          size={23}
          tintColor={
            unread ? colors.primaryLight : colors.textMuted
          }
          type="hierarchical"
          weight={{ ios: 'semibold', android: medium }}
          style={styles.symbol}
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeading}>
          <Text
            numberOfLines={1}
            style={[
              styles.notificationTitle,
              unread && styles.unreadTitle,
            ]}>
            {notification.title}
          </Text>

          {unread ? <View style={styles.unreadDot} /> : null}
        </View>

        <Text style={styles.notificationBody}>
          {notification.body}
        </Text>

        <Text style={styles.notificationDate}>
          {formatNotificationDate(notification.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Vissza"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{
              ios: 'chevron.left',
              android: 'arrow_back',
              web: 'arrow_back',
            }}
            size={23}
            tintColor={colors.textPrimary}
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
        </Pressable>

        <Text style={styles.headerTitle}>Értesítések</Text>

        <Pressable
          accessibilityLabel="Összes megjelölése olvasottként"
          accessibilityRole="button"
          disabled={unreadCount === 0}
          onPress={() => void markAllAsRead()}
          style={({ pressed }) => [
            styles.headerButton,
            unreadCount === 0 && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{
              ios: 'checkmark.circle.fill',
              android: 'done_all',
              web: 'done_all',
            }}
            size={23}
            tintColor={colors.primaryLight}
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            color={colors.primaryLight}
            size="large"
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              tintColor={colors.primaryLight}
              onRefresh={() => void refresh()}
            />
          }
          showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          ) : null}

          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <SymbolView
                  name={{
                    ios: 'bell.slash.fill',
                    android: 'notifications_off',
                    web: 'notifications_off',
                  }}
                  size={34}
                  tintColor={colors.textMuted}
                  type="hierarchical"
                  weight={{ ios: 'semibold', android: medium }}
                  style={styles.largeSymbol}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Nincs új értesítés
              </Text>

              <Text style={styles.emptyText}>
                Az új családi események, meghívók és emlékeztetők
                itt jelennek meg.
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onPress={() => {
                  if (!notification.read_at) {
                    void markAsRead(notification.id);
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
    fontSize: 19,
    fontWeight: '800',
  },

  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notification: {
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  unreadNotification: {
    borderColor: '#2859A3',
    backgroundColor: '#102855',
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
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
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
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },

  unreadTitle: {
    color: colors.textPrimary,
    fontWeight: '900',
  },

  notificationBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  notificationDate: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
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
