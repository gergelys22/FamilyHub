import { colors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const medicines = [
  { name: 'Loratadin', person: 'Lili', dose: '10 mg · szükség esetén', color: colors.teal, icon: 'medkit-outline' as const },
  { name: 'D-vitamin', person: 'Máté', dose: '1 tabletta · reggel', color: colors.primary, icon: 'sunny-outline' as const },
  { name: 'Szirup', person: 'Bence', dose: '5 ml · este', color: colors.pink, icon: 'flask-outline' as const },
];

export default function MedicationsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={colors.textPrimary} /></Pressable><Text style={styles.title}>Gyógyszerek</Text><Ionicons name="options-outline" size={22} color={colors.primary} /></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="medkit" size={28} color={colors.pink} /></View><View style={styles.heroContent}><Text style={styles.heroTitle}>Családi gyógyszerek</Text><Text style={styles.heroText}>Kövesd nyomon a fontos adagolásokat.</Text></View></View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Aktív gyógyszerek</Text><Text style={styles.meta}>{medicines.length} tétel</Text></View>
        {medicines.map((medicine) => <Pressable key={medicine.name} onPress={() => Alert.alert(medicine.name, 'A gyógyszer részletei hamarosan szerkeszthetők.')} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={[styles.icon, { backgroundColor: `${medicine.color}18` }]}><Ionicons name={medicine.icon} size={25} color={medicine.color} /></View><View style={styles.cardContent}><Text style={styles.name}>{medicine.name}</Text><Text style={styles.person}>{medicine.person}</Text><Text style={styles.dose}>{medicine.dose}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Pressable>)}
        <View style={styles.warning}><Ionicons name="information-circle-outline" size={21} color={colors.warning} /><Text style={styles.warningText}>A gyógyszerek adatait mindig egyeztesd az orvossal.</Text></View>
      </ScrollView>
      <Pressable onPress={() => Alert.alert('Új gyógyszer', 'A gyógyszer hozzáadása hamarosan elérhető.')} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}><Ionicons name="add" size={31} color={colors.white} /></Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface }, title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' }, content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md }, hero: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl, backgroundColor: '#FFF0F5' }, heroIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#FFDCE8' }, heroContent: { flex: 1, gap: 3 }, heroTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' }, heroText: { color: colors.textSecondary, fontSize: 12 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }, sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' }, meta: { color: colors.textMuted, fontSize: 11, fontWeight: '700' }, card: { minHeight: 82, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card }, icon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25 }, cardContent: { flex: 1, gap: 3 }, name: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, person: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' }, dose: { color: colors.textMuted, fontSize: 11 }, warning: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: '#FFF8E7' }, warningText: { flex: 1, color: '#9A741A', fontSize: 11, lineHeight: 16 }, fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: colors.primary, ...shadows.floating }, pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] } });
