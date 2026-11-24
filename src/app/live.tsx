import { colors, radius, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Weben (és statikus exportnál) a LiveKit natív modul nem érhető el, ezért itt csak tájékoztató képernyő van.
// Az élő közvetítés a telepített alkalmazásban (live.native.tsx) működik.
export default function LiveScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Ionicons name="videocam-off-outline" size={48} color="#FFFFFF" />
        <Text style={styles.text}>Az élő közvetítés csak a telefonos alkalmazásban érhető el.</Text>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Vissza</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1220' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  text: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '900' },
});
