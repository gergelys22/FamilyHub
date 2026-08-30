import { AuthProvider, useAuth } from '@/providers/auth-provider';
import * as Linking from 'expo-linking';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type TableDefinition = {
  name: 'index' | 'map' | 'memories' | 'calendar' | 'vault';
  title: string;
  icon: SymbolViewProps['name'];
}

const tabs: TableDefinition[] = [
  {
    name: 'index',
    title: 'Főoldal',
    icon: {
      ios: 'house.fill',
      android: 'home',
      web: 'home',
    },
  },
  {
    name: 'map',
    title: 'Térkép',
    icon: {
      ios: 'map.fill',
      android: 'map',
      web: 'map',
    },
  },
  {
    name: 'memories',
    title: 'Emlékek',
    icon: {
      ios: 'photo.on.rectangle.angled',
      android: 'photo_library',
      web: 'photo_library',
    },
  },
  {
    name: 'calendar',
    title: 'Naptár',
    icon: {
      ios: 'calendar',
      android: 'calendar_month',
      web: 'calendar_month',
    },
  },
  {
    name: 'vault',
    title: 'Páncélterem',
    icon: {
      ios: 'lock.shield.fill',
      android: 'shield_lock',
      web: 'shield_lock',
    },
  },
];

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

function AppNavigator() {
  const { loading, session } = useAuth();
  const incomingUrl = Linking.useLinkingURL();
  const isAuthCallback = Boolean(
    incomingUrl &&
      (/auth\/callback(?:[?#/]|$)/.test(incomingUrl) ||
        /[?#&](?:code|access_token|refresh_token|error_description)=/.test(
          incomingUrl,
        )),
  );

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
        initialRouteName={session ? 'index' : 'sign-in'}
        screenOptions={{
          headerShown: false,
          sceneStyle: styles.scene,
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#8290A8',
          tabBarHideOnKeyboard: true,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
        }}>
        <Tabs.Protected guard={Boolean(session)}>
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarIcon: ({ color, focused }) => (
                  <View
                    style={[
                      styles.iconContainer,
                      focused && styles.iconContainerActive,
                    ]}>
                    <SymbolView
                      name={tab.icon}
                      size={focused ? 25: 23}
                      tintColor={color}
                      type={focused ? 'hierarchical' : 'monochrome'}  
                      weight={{
                        ios: focused ? 'semibold' : 'medium',
                        android: medium,
                      }}
                      style={styles.tabIcon}
                    />
                  </View>                  
                ),
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

          <Tabs.Screen
            name="invite-member"
            options={{
              href: null,
              title: 'Új családtag',
              tabBarStyle: { display: 'none' },
            }}
          />

          <Tabs.Screen
            name="profile"
            options={{
              href: null,
              title: 'Profil',
              tabBarStyle: { display: 'none' },
            }}
          />

          <Tabs.Screen
            name="notifications"
            options={{
              href: null,
              title: 'Értesítések',
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

        <Tabs.Protected guard={isAuthCallback}>
          <Tabs.Screen
            name="auth/callback"
            options={{
              href: null,
              title: 'E-mail megerősítése',
              tabBarStyle: { display: 'none' },
            }}
          />
        </Tabs.Protected>
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#071123'
   },
  scene: {
    backgroundColor: '#071123'
   },
  tabBar: {
    backgroundColor: '#0D1930',
    borderTopColor: '#1D2B43',
    borderTopWidth: 1,
    height: 74,
    paddingTop: 7,
    paddingBottom: 9,
  },
  tabItem: {
    paddingHorizontal: 2,
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700'
  },
  tabIcon: {
    width: 27,
    height: 27,
  },
  iconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
});
