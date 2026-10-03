import { FamilyHeader } from '@/components/family-header';
import { colors } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MemoriesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const displayName = profile?.display_name.trim() ?? 'Felhasználó';
  const { unreadCount } = useNotifications();
  const userInitial = displayName?.charAt(0).toLocaleUpperCase('hu-HU') ?? '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View pointerEvents="none" style={styles.backgrondGlow}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FamilyHeader
            userInitial={userInitial}
            unreadNotificationCount={unreadCount}
            onNotificationsPress={() => router.push('/notifications')}
            onProfilePress={() => router.push('/profile')}
          />

          <Text style={styles.title}>Emlékek</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.7,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgrondGlow: {
    position: 'absolute',
    top: 88,
    right: -130,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0B4A8F',
    opacity: 0.2,
  },
});
