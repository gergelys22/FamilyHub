import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text } from 'react-native';

const tabs = [
  { name: 'index', title: 'Főoldal', icon: '⌂' },
  { name: 'map', title: 'Térkép', icon: '◉' },
  { name: 'memories', title: 'Emlékek', icon: '▣' },
  { name: 'calendar', title: 'Naptár', icon: '□' },
  { name: 'vault', title: 'Páncélterem', icon: '◇' },
] as const;

export default function RootLayout() {
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
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
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
