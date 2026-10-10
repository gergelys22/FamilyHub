import { colors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type VaultItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  backgroundColor: string;
  title: string;
  description: string;
  count: string;
  onPress?: () => void;
};

function VaultItem({
  icon,
  color,
  backgroundColor,
  title,
  description,
  count,
  onPress,
}: VaultItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [styles.vaultItem, pressed && styles.pressed]}
    >
      <View style={[styles.itemIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDescription}>{description}</Text>
      </View>
      <View style={styles.itemEnd}>
        <Text style={styles.itemCount}>{count}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function VaultScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CSALÁDI BIZTONSÁG</Text>
            <Text style={styles.title}>Páncélterem</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Páncélterem információi"
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={21} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={52} color={colors.white} />
          </View>
          <Text style={styles.heroTitle}>Minden fontos adat védve</Text>
          <Text style={styles.heroText}>
            A családod érzékeny dokumentumai és sürgősségi információi egy biztonságos helyen.
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>A páncélterem aktív</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
          >
            <Ionicons name="lock-open" size={19} color={colors.white} />
            <Text style={styles.openButtonText}>Megnyitás</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Védett tartalmak</Text>
          <Text style={styles.sectionMeta}>3 kategória</Text>
        </View>

        <VaultItem
          icon="document-text"
          color="#8B78F6"
          backgroundColor="#EEE9FF"
          title="Fontos dokumentumok"
          description="Személyes iratok és biztosítások"
          count="0"
          onPress={() => router.push('/documents')}
        />
        <VaultItem
          icon="medkit"
          color="#F56C9A"
          backgroundColor="#FFE8F0"
          title="Egészségügyi adatok"
          description="Gyógyszerek, allergiák és orvosi adatok"
          count="0"
        />
        <VaultItem
          icon="call"
          color="#20BFA7"
          backgroundColor="#DDF8F1"
          title="Sürgősségi kapcsolatok"
          description="Fontos telefonszámok egy helyen"
          count="0"
        />

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="information-circle" size={22} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.tipTitle}>Csak a családod láthatja</Text>
            <Text style={styles.tipText}>
              A páncélteremben tárolt információk kizárólag a családi kör tagjai számára érhetők el.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FBFF' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 36, gap: spacing.md },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    marginTop: 3,
    color: colors.textPrimary,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  moreButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: '#EEF4FC',
  },
  heroCard: {
    minHeight: 340,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: '#112B52',
    ...shadows.floating,
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#3E78FF',
    opacity: 0.22,
  },
  shieldCircle: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 52,
    backgroundColor: colors.primary,
    borderWidth: 7,
    borderColor: '#5C8DFF',
    ...shadows.floating,
  },
  heroTitle: {
    marginTop: spacing.lg,
    color: colors.white,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroText: {
    maxWidth: 300,
    marginTop: spacing.sm,
    color: '#B9CBE8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#42D7B9',
  },
  statusText: { color: '#8EE8D4', fontSize: 11, fontWeight: '800' },
  openButton: {
    minHeight: 48,
    minWidth: 190,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  openButtonText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  vaultItem: {
    minHeight: 82,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  itemIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  itemContent: { flex: 1, gap: 3 },
  itemTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  itemDescription: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  itemEnd: { alignItems: 'center', gap: 4 },
  itemCount: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  tipCard: {
    marginTop: spacing.xs,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#EAF3FF',
  },
  tipIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#D7E8FF',
  },
  tipTitle: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
  tipText: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
