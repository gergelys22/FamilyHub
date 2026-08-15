import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

export function PlaceholderScreen({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoText}>⌂</Text></View>
        <Text style={styles.brand}>CsaládTér</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>Következő fejlesztési lépés</Text></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071123', paddingHorizontal: 20 },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  brand: { color: '#F8FAFC', fontSize: 20, fontWeight: '800' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  icon: { width: 74, height: 74, borderRadius: 24, backgroundColor: '#14233D', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { color: '#3B82F6', fontSize: 36, fontWeight: '800' },
  title: { color: '#F8FAFC', fontSize: 26, fontWeight: '800', marginBottom: 10 },
  description: { color: '#91A0B7', fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  badge: { marginTop: 22, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#102A52' },
  badgeText: { color: '#60A5FA', fontSize: 11, fontWeight: '700' },
});
