import { colors, radius, spacing } from '@/constants/theme';
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
  const badgeText =
    unreadNotificationCount > 99 ? '99+' : String(unreadNotificationCount);

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <SymbolView
            name={{
              ios: 'house.and.flag.fill',
              android: 'family_home',
              web: 'family_home',
            }}
            size={22}
            tintColor={colors.textPrimary}
            type="hierarchical"
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
        </View>

        <Text style={styles.brandText}>CsaládTér</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Értesítések megnyitása. ${unreadNotificationCount} olvasatlan.`}
          hitSlop={8}
          onPress={onNotificationsPress}
          style={({ pressed }) => [
            styles.notificationsButton,
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{
              ios:
                unreadNotificationCount > 0
                  ? 'bell.badge.fill'
                  : 'bell.fill',
              android:
                unreadNotificationCount > 0
                  ? 'notifications_active'
                  : 'notifications',
              web:
                unreadNotificationCount > 0
                  ? 'notifications_active'
                  : 'notifications',
            }}
            size={23}
            tintColor={
              unreadNotificationCount > 0
                ? colors.primaryLight
                : colors.textSecondary
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
            pressed && styles.pressed,
          ]}>
          <Text style={styles.profileText}>{userInitial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  symbol: {
    width: 26,
    height: 26,
  },

  brandText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  notificationsButton: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderRadius: radius.round,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6B38D',
  },

  profileText: {
    color: '#3B2415',
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
});