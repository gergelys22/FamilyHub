import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';


const tabs = [
  { name: 'index', title: 'Főoldal', icon: '⌂' },
  { name: 'map', title: 'Térkép', icon: '◉' },
  { name: 'memories', title: 'Emlékek', icon: '▣' },
  { name: 'calendar', title: 'Naptár', icon: '□' },
  { name: 'vault', title: 'Páncélterem', icon: '◇' },
] as const;

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

function AppNavigator() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: styles.scene,
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#8290A8',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        }}>
        <Tabs.Protected guard={Boolean(session)}>
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>{tab.icon}</Text>,
              }}
            />
          ))}

          <Tabs.Screen
            name="create-family"
            options={{
              href: null,
              title: 'Család létrehozása',
              tabBarStyle: { display: 'none' },
            }}
          />
        </Tabs.Protected>

        <Tabs.Protected guard={!session}>
          <Tabs.Screen
            name="sign-in"
            options={{
              href: null,
              title: 'Bejelentkezés',
              tabBarStyle: { display: 'none' },
            }}
          />
        </Tabs.Protected>
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#071123' },
  scene: { backgroundColor: '#071123' },
  tabBar: {
    backgroundColor: '#0D1930',
    borderTopColor: '#1D2B43',
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabIcon: { fontSize: 22, lineHeight: 24, fontWeight: '700' },
});
