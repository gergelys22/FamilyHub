
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;

type VaultItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  backgroundColor: string;
  title: string;
  description: string;
  count: string;
  onPress?: () => void;
  palette: Palette;
  isDark: boolean;
};

function VaultItem({
  icon,
  color,
  backgroundColor,
  title,
  description,
  count,
  onPress,
  palette,
  isDark,
}: VaultItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} megnyitása`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.vaultItem,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.itemIcon, { backgroundColor: isDark ? `${color}24` : backgroundColor }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: palette.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.itemDescription, { color: palette.textMuted }]}>
          {description}
        </Text>
      </View>

      <View style={styles.itemEnd}>
        <View style={[styles.countBadge, { backgroundColor: palette.surfaceElevated }]}>
          <Text style={[styles.itemCount, { color: palette.textSecondary }]}>
            {count}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={palette.textMuted} />
      </View>
    </Pressable>
  );
}

export default function VaultScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>
              CSALÁDI BIZTONSÁG
            </Text>
            <Text style={[styles.title, { color: palette.textPrimary }]}>
              Páncélterem
            </Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              A legfontosabb dolgok biztonságban.
            </Text>
          </View>

          <View style={[styles.headerIcon, { backgroundColor: palette.surfaceElevated }]}>
            <Ionicons name="shield-checkmark" size={23} color={palette.primary} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <LinearGradient
            colors={isDark ? ['#183A69', '#101E36', '#111827'] : ['#245FCB', '#17458F', '#102B59']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroGlow} />

          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <Ionicons name="lock-closed" size={12} color="#A9C8FF" />
              <Text style={styles.heroBadgeText}>VÉDETT CSALÁDI TÉR</Text>
            </View>
            <View style={styles.heroShield}>
              <Ionicons name="shield-checkmark" size={46} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Minden fontos adat{'\n'}egy biztonságos helyen.
          </Text>

          <Text style={styles.heroText}>
            A családod érzékeny dokumentumai és sürgősségi információi mindig kéznél lehetnek.
          </Text>

          <View style={styles.heroBottom}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>A páncélterem aktív</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.openButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.openButtonText}>Megnyitás</Text>
              <Ionicons name="arrow-forward" size={17} color="#17458F" />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              Védett tartalmak
            </Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>
              Minden fontos információ egy helyen
            </Text>
          </View>

          <View style={[styles.categoryBadge, { backgroundColor: palette.surfaceElevated }]}>
            <Text style={[styles.sectionMeta, { color: palette.primary }]}>
              4 kategória
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          <VaultItem
            icon="document-text"
            color="#927DF5"
            backgroundColor="#EEE9FF"
            title="Fontos dokumentumok"
            description="Személyes iratok és biztosítások"
            count="0"
            onPress={() => router.push('/documents')}
            palette={palette}
            isDark={isDark}
          />

          <VaultItem
            icon="medkit"
            color="#F56C9A"
            backgroundColor="#FFE8F0"
            title="Egészségügyi adatok"
            description="Gyógyszerek, allergiák és orvosi adatok"
            count="0"
            onPress={() => router.push('/medications')}
            palette={palette}
            isDark={isDark}
          />

          <VaultItem
            icon="call"
            color="#20BFA7"
            backgroundColor="#DDF8F1"
            title="Sürgősségi kapcsolatok"
            description="Fontos telefonszámok egy helyen"
            count="0"
            onPress={() => router.push('/emergency-contacts')}
            palette={palette}
            isDark={isDark}
          />

          <VaultItem
            icon="medical"
            color="#F16B76"
            backgroundColor="#FFE5EA"
            title="Sürgősségi kártya"
            description="Vércsoport, allergiák és orvosi adatok"
            count="0"
            onPress={() => router.push('/safety-card')}
            palette={palette}
            isDark={isDark}
          />
        </View>

        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={[styles.tipIcon, { backgroundColor: isDark ? '#203B60' : '#E5F0FF' }]}>
            <Ionicons name="information-circle" size={22} color={palette.primary} />
          </View>

          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: palette.textPrimary }]}>
              Csak a családod láthatja
            </Text>
            <Text style={[styles.tipText, { color: palette.textSecondary }]}>
              A páncélteremben tárolt információk kizárólag a családi kör tagjai számára érhetők el.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={palette.textMuted} />
          <Text style={[styles.footerText, { color: palette.textMuted }]}>
            A családod biztonsága az első
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    gap: spacing.md,
  },
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    marginTop: 4,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '500',
  },
  headerIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120,140,170,0.12)',
  },

  heroCard: {
    minHeight: 300,
    padding: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderRadius: 26,
    ...shadows.floating,
  },
  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    top: -90,
    right: -55,
    borderRadius: 100,
    backgroundColor: '#77A9FF',
    opacity: 0.15,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.round,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: {
    color: '#C5D9FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroShield: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: {
    marginTop: spacing.lg,
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  heroText: {
    maxWidth: 290,
    marginTop: spacing.sm,
    color: '#C1D1EB',
    fontSize: 12,
    lineHeight: 19,
  },
  heroBottom: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4BE0B9',
  },
  statusText: {
    color: '#A5EBD9',
    fontSize: 10,
    fontWeight: '800',
  },
  openButton: {
    minHeight: 43,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  openButtonText: {
    color: '#17458F',
    fontSize: 12,
    fontWeight: '900',
  },

  sectionHeader: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '500',
  },
  categoryBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.round,
  },
  sectionMeta: {
    fontSize: 10,
    fontWeight: '900',
  },

  list: {
    gap: spacing.sm,
  },
  vaultItem: {
    minHeight: 84,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 19,
    borderWidth: 1,
    ...shadows.card,
  },
  itemIcon: {
    width: 51,
    height: 51,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  itemContent: {
    flex: 1,
    gap: 5,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  itemDescription: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
  },
  itemEnd: {
    alignItems: 'center',
    gap: 7,
  },
  countBadge: {
    minWidth: 27,
    height: 24,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  itemCount: {
    fontSize: 10,
    fontWeight: '900',
  },

  tipCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 19,
    borderWidth: 1,
  },
  tipIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  tipText: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 16,
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
});
