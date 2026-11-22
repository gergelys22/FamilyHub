import { GlassSurface } from '@/components/glass-surface';
import { colors, darkColors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type FamilyHeaderProps = {
  userInitial?: string;
  unreadNotificationCount?: number;
  unreadMessageCount?: number;
  onNotificationsPress?: () => void;
  onMessagesPress?: () => void;
  onProfilePress?: () => void;
};

function formatBadge(count: number) {
  return count > 99 ? '99+' : String(count);
}

export function FamilyHeader({
  userInitial = 'A',
  unreadNotificationCount = 0,
  unreadMessageCount = 0,
  onNotificationsPress,
  onMessagesPress,
  onProfilePress,
}: FamilyHeaderProps) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const hasNotifications = unreadNotificationCount > 0;
  const hasMessages = unreadMessageCount > 0;

  return (
    <GlassSurface
      dark={isDark}
      style={[
        styles.container,
        { borderBottomColor: palette.glassBorder, backgroundColor: palette.glassBackground },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: palette.primarySoft }]}>
          <SymbolView
            name={{
              ios: 'house.and.flag.fill',
              android: 'family_home',
              web: 'family_home',
            }}
            size={22}
            tintColor={palette.primary}
            type="hierarchical"
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
        </View>
        <Text style={[styles.brandText, { color: palette.textPrimary }]}>CsaládTér</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            hasMessages
              ? `Üzenetek megnyitása. ${unreadMessageCount} olvasatlan.`
              : 'Üzenetek megnyitása'
          }
          hitSlop={8}
          onPress={onMessagesPress}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={hasMessages ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
            size={22}
            color={hasMessages ? palette.primary : palette.textSecondary}
          />
          {hasMessages ? (
            <View style={[styles.badge, { borderColor: palette.surface, backgroundColor: palette.danger }]}>
              <Text style={styles.badgeText}>{formatBadge(unreadMessageCount)}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Értesítések megnyitása. ${unreadNotificationCount} olvasatlan.`}
          hitSlop={8}
          onPress={onNotificationsPress}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              ios: hasNotifications ? 'bell.badge.fill' : 'bell.fill',
              android: hasNotifications ? 'notifications_active' : 'notifications',
              web: hasNotifications ? 'notifications_active' : 'notifications',
            }}
            size={22}
            tintColor={hasNotifications ? palette.primary : palette.textSecondary}
            type="hierarchical"
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
          {hasNotifications ? (
            <View style={[styles.badge, { borderColor: palette.surface, backgroundColor: palette.danger }]}>
              <Text style={styles.badgeText}>{formatBadge(unreadNotificationCount)}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil megnyitása"
          hitSlop={8}
          onPress={onProfilePress}
          style={({ pressed }) => [
            styles.profileRing,
            { borderColor: palette.primarySoft },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.profileButton, { backgroundColor: palette.primary }]}>
            <Text style={styles.profileText}>{userInitial.charAt(0).toUpperCase()}</Text>
          </View>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  symbol: {
    width: 24,
    height: 24,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.round,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radius.round,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  profileRing: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radius.round,
  },
  profileButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});