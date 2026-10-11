import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { GlassSurface } from '@/components/glass-surface';
import { useTheme } from '@/providers/theme-provider';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type FamilyHeaderProps = {
  userInitial?: string;
  unreadNotificationCount?: number;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
};

export function FamilyHeader({
  userInitial = 'A',
  unreadNotificationCount = 0,
  onNotificationsPress,
  onProfilePress,
}: FamilyHeaderProps) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const badgeText =
    unreadNotificationCount > 99 ? '99+' : String(unreadNotificationCount);

  return (
    <GlassSurface
      dark={isDark}
      style={[
        styles.container,
        { borderBottomColor: palette.glassBorder, backgroundColor: palette.glassBackground },
      ]}
    >
      <View style={styles.brand}>
        <View style={styles.logo}>
          <SymbolView
            name={{
              ios: 'house.and.flag.fill',
              android: 'family_home',
              web: 'family_home',
            }}
            size={22}
            tintColor={palette.textPrimary}
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
          accessibilityLabel={`Értesítések megnyitása. ${unreadNotificationCount} olvasatlan.`}
          hitSlop={8}
          onPress={onNotificationsPress}
          style={({ pressed }) => [
            styles.notificationsButton,
            { borderColor: palette.border, backgroundColor: palette.surface },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              ios: unreadNotificationCount > 0 ? 'bell.badge.fill' : 'bell.fill',
              android:
                unreadNotificationCount > 0 ? 'notifications_active' : 'notifications',
              web: unreadNotificationCount > 0 ? 'notifications_active' : 'notifications',
            }}
            size={23}
            tintColor={
              unreadNotificationCount > 0 ? palette.primaryLight : palette.textSecondary
            }
            type="hierarchical"
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />

          {unreadNotificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil megnyitása"
          hitSlop={8}
          onPress={onProfilePress}
          style={({ pressed }) => [
            styles.profileButton,
            { borderColor: palette.surface },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.profileText}>{userInitial}</Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
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
    backgroundColor: colors.primarySoft,
  },
  symbol: {
    width: 26,
    height: 26,
  },
  brandText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: radius.round,
    backgroundColor: colors.danger,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  profileButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: radius.round,
    backgroundColor: '#F4C7A1',
    ...shadows.card,
  },
  profileText: {
    color: '#75431E',
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
