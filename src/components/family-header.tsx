import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';


type FamilyHeaderProps = {
    userInitial?: string,
    hasUnreadNotifications?: boolean,
    onNotificationsPress?: () => void,
    onProfilePress?: () => void,
};

export function FamilyHeader({
    userInitial = 'A',
    hasUnreadNotifications = true,
    onNotificationsPress,
    onProfilePress
}: FamilyHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.brand}>
                <View style={styles.logo}>
                    <Text style={styles.logoText}>0</Text>
                </View>

                <Text style={styles.brandText}>CsaládTér</Text>
            </View>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Értesítések megnyitása"
                    hitSlop={8}
                    onPress={onNotificationsPress}
                    style={({ pressed}) => [
                        styles.notificationsButton,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.notificationIcon}>●</Text>
                    {hasUnreadNotifications ? <View style={styles.unreadIndicator} /> : null}
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Profil megnyitása"
                    hitSlop={8}
                    onPress={onProfilePress}
                    style={({ pressed}) => [
                        styles.profileButton,
                        pressed && styles.pressed,
                    ]}
                >
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
        width: 34,
        height: 34,
        borderRadius: radius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: '800',
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
        backgroundColor: colors.primary,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationIcon: {
        color: colors.textSecondary,
        fontSize: 15,
    },
    unreadIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 7,
        height: 7,
        borderRadius: radius.round,
        backgroundColor: colors.warning,
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: radius.round,
        backgroundColor: '#D6B38D',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileText: {
        color: '#3B2415',
        fontWeight: '800',
    },
    pressed: {
        opacity: 0.7,
    },

});
