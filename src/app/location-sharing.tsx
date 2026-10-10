import { colors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const children = [
  { name: 'Lili', age: '11 éves', initial: 'L', location: 'Iskola környéke', time: '2 perce', color: '#EAC9A8' },
  { name: 'Máté', age: '8 éves', initial: 'M', location: 'Otthon', time: '5 perce', color: '#C9D8E5' },
];

export default function LocationSharingScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={colors.textPrimary} /></Pressable><Text style={styles.title}>Helymegosztás</Text><Ionicons name="shield-checkmark-outline" size={22} color={colors.success} /></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}><Ionicons name="information-circle" size={22} color={colors.primary} /><Text style={styles.noticeText}>A 14 éven aluli családtagok helye csak a szülők és gondviselők számára látható.</Text></View>
        <View style={styles.map}><Ionicons name="map" size={46} color={colors.primary} /><Text style={styles.mapTitle}>Családi térkép</Text><Text style={styles.mapText}>A térképes követés megnyitásához válassz ki egy családtagot.</Text></View>
        <Text style={styles.sectionTitle}>14 éven aluli gyermekek</Text>
        {children.map((child) => <Pressable key={child.name} onPress={() => Alert.alert(child.name, `${child.location} · ${child.time}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={[styles.avatar, { backgroundColor: child.color }]}><Text style={styles.avatarText}>{child.initial}</Text><View style={styles.online} /></View><View style={styles.cardContent}><Text style={styles.name}>{child.name} <Text style={styles.age}>{child.age}</Text></Text><View style={styles.locationRow}><Ionicons name="location" size={15} color={colors.success} /><Text style={styles.location}>{child.location}</Text></View><Text style={styles.updated}>{child.time} frissítve</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Pressable>)}
        <View style={styles.settingsCard}><View style={styles.settingsText}><Text style={styles.settingsTitle}>Helymegosztás bekapcsolva</Text><Text style={styles.settingsSubtitle}>A gondviselők értesítést kapnak.</Text></View><Switch value onValueChange={() => undefined} trackColor={{ false: colors.border, true: '#9BE5D5' }} thumbColor={colors.success} /></View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface }, title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' }, content: { padding: spacing.lg, paddingBottom: 36, gap: spacing.md }, notice: { padding: spacing.md, flexDirection: 'row', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.primarySoft }, noticeText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 18 }, map: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.xl, backgroundColor: '#EAF2FF', ...shadows.card }, mapTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' }, mapText: { maxWidth: 250, color: colors.textSecondary, fontSize: 12, textAlign: 'center' }, sectionTitle: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: 17, fontWeight: '900' }, card: { minHeight: 82, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card }, avatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, borderWidth: 3, borderColor: colors.white }, avatarText: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' }, online: { position: 'absolute', right: -1, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.white }, cardContent: { flex: 1, gap: 3 }, name: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, age: { color: colors.textMuted, fontSize: 11, fontWeight: '700' }, locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, location: { color: colors.textSecondary, fontSize: 12 }, updated: { color: colors.textMuted, fontSize: 10 }, settingsCard: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.surface }, settingsText: { flex: 1, gap: 3 }, settingsTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' }, settingsSubtitle: { color: colors.textMuted, fontSize: 11 }, pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] } });
