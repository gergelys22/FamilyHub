import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useMemories } from '@/hooks/use-memories';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Dimensions,
  Modal,
  Pressable,
  Share,
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
  console.info('[memory-details] photo state', {
    id,
    memoryId: memory?.id,
    photoCount: photos.length,
  });
  const [favorite, setFavorite] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    if (id && !loading && !memory && hasMore) {
      loadMore();
    }
  }, [hasMore, id, loadMore, loading, memory]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            {memory?.photo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Emlék fő képének megnyitása"
                onPress={() => setSelectedPhoto(0)}
                style={styles.heroPressable}
              >
                <Image source={{ uri: memory.photo }} style={styles.heroImage} />
              </Pressable>
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
                {memory.participantNames.length > 0 ? (
                  <View style={styles.participantsRow}>
                    <Ionicons name="people-outline" size={17} color={colors.primary} />
                    <Text style={styles.location}>
                      Jelen voltak: {memory.participantNames.join(', ')}
                    </Text>
                  </View>
                ) : null}
                {memory.description ? (
                  <Text style={styles.description}>{memory.description}</Text>
                ) : null}

                <Text style={styles.sectionTitle}>A pillanat képei</Text>
                {photos.length > 0 ? (
                  <View style={styles.photoGrid}>
                    {photos.map((photo, index) => (
                      <Pressable
                        key={`${photo}-${index}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${index + 1}. kép megnyitása`}
                        onPress={() => setSelectedPhoto(index)}
                        style={styles.thumbnailPressable}
                      >
                        <Image
                          source={{ uri: photo }}
                          style={styles.thumbnail}
                          onError={(event) => {
                            console.error('[memory-details] image failed', {
                              uri: photo,
                              error: event.nativeEvent.error,
                            });
                          }}
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyPhotos}>
                    Ehhez az emlékhez nem tartozik betöltött kép.
                  </Text>
                )}

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const photo = photos[0] ?? memory.photo;
                      if (photo) {
                        void Share.share({
                          message: `${memory.title}\n${photo}`,
                        });
                      }
                    }}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <Ionicons name="download-outline" size={21} color={colors.primary} />
                    <Text style={styles.actionText}>Kép megosztása</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (!memory) return;
                      void Share.share({
                        title: memory.title,
                        message: `${memory.title}\n${memory.location ?? ''}`.trim(),
                      });
                    }}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={21}
                      color={colors.primary}
                    />
                    <Text style={styles.actionText}>Megosztás</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFavorite((current) => !current)}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name={favorite ? 'heart' : 'heart-outline'}
                      size={21}
                      color={colors.danger}
                    />
                    <Text style={styles.actionText}>Kedvenc</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.description}>
                {loading ? 'Emlék betöltése…' : (error ?? 'Az emlék nem található.')}
              </Text>
            )}
          </View>
        </ScrollView>
        <Modal
          visible={selectedPhoto !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.viewer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Képnézegető bezárása"
              onPress={() => setSelectedPhoto(null)}
              style={styles.viewerClose}
            >
              <Ionicons name="close" size={28} color={colors.white} />
            </Pressable>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: (selectedPhoto ?? 0) * Dimensions.get('window').width, y: 0 }}
              style={styles.viewerScroll}
            >
              {photos.map((photo, index) => (
                <View key={`${photo}-viewer-${index}`} style={styles.viewerPage}>
                  <Image
                    source={{ uri: photo }}
                    resizeMode="contain"
                    style={styles.viewerImage}
                  />
                </View>
              ))}
            </ScrollView>
            <Text style={styles.viewerCounter}>
              {(selectedPhoto ?? 0) + 1} / {photos.length}
            </Text>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  hero: { height: 360, position: 'relative' },
  heroPressable: { flex: 1 },
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
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
  emptyPhotos: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
  },
  thumbnailPressable: {
    width: '31.8%',
    aspectRatio: 1.15,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  viewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 18, 35, 0.96)',
  },
  viewerScroll: { flex: 1, width: '100%' },
  viewerPage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '82%',
    minHeight: 1,
  },
  viewerClose: {
    position: 'absolute',
    zIndex: 2,
    top: spacing.xl,
    right: spacing.lg,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  viewerCounter: {
    position: 'absolute',
    bottom: spacing.xl,
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
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
