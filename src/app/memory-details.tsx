import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useMemories } from '@/hooks/use-memories';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MemoryDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { memories, loading, hasMore, error, loadMore } = useMemories();
  const memory = useMemo(() => memories.find((item) => item.id === id), [id, memories]);
  const photos = memory?.photos ?? [];

  useEffect(() => {
    if (id && !loading && !memory && hasMore) {
      loadMore();
    }
  }, [hasMore, id, loadMore, loading, memory]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {memory?.photo ? (
              <Image source={{ uri: memory.photo }} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroImage, styles.placeholder]}>
                <Ionicons name="image-outline" size={44} color={colors.textMuted} />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vissza az emlékekhez"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={26} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.detailsCard}>
            {memory ? (
              <>
                <Text style={styles.date}>{memory.when}</Text>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{memory.title}</Text>
                  <Text style={styles.heart}>♥</Text>
                </View>
                {memory.location && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={17} color={colors.primary} />
                    <Text style={styles.location}>{memory.location}</Text>
                  </View>
                )}
                <Text style={styles.description}>
                  Egy különleges pillanat, amit jó újra átélni a családdal.
                </Text>

                <Text style={styles.sectionTitle}>A pillanat képei</Text>
                <View style={styles.photoGrid}>
                  {photos.map((photo, index) => (
                    <Image
                      key={`${photo}-${index}`}
                      source={{ uri: photo }}
                      style={styles.thumbnail}
                    />
                  ))}
                </View>

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => undefined}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <Ionicons name="download-outline" size={21} color={colors.primary} />
                    <Text style={styles.actionText}>Letöltés</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => undefined}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <Ionicons name="share-social-outline" size={21} color={colors.primary} />
                    <Text style={styles.actionText}>Megosztás</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => undefined}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <Ionicons name="heart-outline" size={21} color={colors.danger} />
                    <Text style={styles.actionText}>Kedvenc</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.description}>
                {loading ? 'Emlék betöltése…' : error ?? 'Az emlék nem található.'}
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  hero: { height: 360, position: 'relative' },
  heroImage: { width: '100%', height: '100%', backgroundColor: colors.surfaceMuted },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: 'rgba(23, 43, 77, 0.64)',
  },
  detailsCard: {
    minHeight: 380,
    marginTop: -18,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  date: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  title: { flex: 1, color: colors.textPrimary, fontSize: 25, fontWeight: '900' },
  heart: { color: colors.danger, fontSize: 26, fontWeight: '900' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  location: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  description: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  thumbnail: {
    width: '31.8%',
    aspectRatio: 1.15,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { alignItems: 'center', gap: 5, padding: spacing.sm },
  actionText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
