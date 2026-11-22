import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useMemories } from '@/hooks/use-memories';
import { useTheme } from '@/providers/theme-provider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MemoryDetailsScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { memories, loading, hasMore, error, loadMore } = useMemories();
  const memory = useMemo(() => memories.find((item) => item.id === id), [id, memories]);
  const photos = memory?.photos ?? [];
  const [favorite, setFavorite] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    if (id && !loading && !memory && hasMore) {
      loadMore();
    }
  }, [hasMore, id, loadMore, loading, memory]);

  const photoCount = Math.max(photos.length, memory?.photo ? 1 : 0);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
              <View style={[styles.heroImage, styles.placeholder, { backgroundColor: palette.surfaceMuted }]}>
                <Ionicons name="image-outline" size={44} color={palette.textMuted} />
              </View>
            )}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(8,16,32,0.45)', 'rgba(8,16,32,0)']}
              style={styles.heroShade}
            />
            {photoCount > 1 ? (
              <View style={styles.heroBadge}>
                <Ionicons name="images-outline" size={14} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>{photoCount} kép</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.detailsCard, { backgroundColor: palette.surface }]}>
            {memory ? (
              <>
                <View style={[styles.datePill, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name="calendar-outline" size={14} color={palette.primary} />
                  <Text style={[styles.dateText, { color: palette.primary }]}>{memory.when}</Text>
                </View>

                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: palette.textPrimary }]}>{memory.title}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={favorite ? 'Eltávolítás a kedvencekből' : 'Kedvencnek jelölés'}
                    accessibilityState={{ selected: favorite }}
                    hitSlop={8}
                    onPress={() => setFavorite((current) => !current)}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Ionicons
                      name={favorite ? 'heart' : 'heart-outline'}
                      size={28}
                      color={palette.danger}
                    />
                  </Pressable>
                </View>

                {memory.location ? (
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIcon, { backgroundColor: palette.primarySoft }]}>
                      <Ionicons name="location-outline" size={16} color={palette.primary} />
                    </View>
                    <Text style={[styles.infoText, { color: palette.textSecondary }]}>{memory.location}</Text>
                  </View>
                ) : null}

                {memory.participantNames.length > 0 ? (
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIcon, { backgroundColor: palette.primarySoft }]}>
                      <Ionicons name="people-outline" size={16} color={palette.primary} />
                    </View>
                    <View style={styles.chips}>
                      {memory.participantNames.map((name) => (
                        <View key={name} style={[styles.chip, { backgroundColor: palette.surfaceMuted }]}>
                          <Text style={[styles.chipText, { color: palette.textPrimary }]}>{name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {memory.description ? (
                  <Text style={[styles.description, { color: palette.textSecondary }]}>{memory.description}</Text>
                ) : null}

                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>A pillanat képei</Text>
                  {photos.length > 0 ? (
                    <View style={[styles.countBadge, { backgroundColor: palette.primarySoft }]}>
                      <Text style={[styles.countText, { color: palette.primary }]}>{photos.length}</Text>
                    </View>
                  ) : null}
                </View>

                {photos.length > 0 ? (
                  <View style={styles.photoGrid}>
                    {photos.map((photo, index) => (
                      <Pressable
                        key={`${photo}-${index}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${index + 1}. kép megnyitása`}
                        onPress={() => setSelectedPhoto(index)}
                        style={({ pressed }) => [styles.thumbnailPressable, pressed && styles.pressed]}
                      >
                        <Image
                          source={{ uri: photo }}
                          style={[styles.thumbnail, { backgroundColor: palette.surfaceMuted }]}
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
                  <View style={[styles.emptyPhotos, { backgroundColor: palette.surfaceMuted }]}>
                    <Ionicons name="image-outline" size={22} color={palette.textMuted} />
                    <Text style={[styles.emptyPhotosText, { color: palette.textMuted }]}>
                      Ehhez az emlékhez nem tartozik betöltött kép.
                    </Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const photo = photos[0] ?? memory.photo;
                      if (photo) {
                        void Share.share({ message: `${memory.title}\n${photo}` });
                      }
                    }}
                    style={({ pressed }) => [
                      styles.action,
                      { backgroundColor: palette.surfaceMuted },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="image-outline" size={21} color={palette.primary} />
                    <Text style={[styles.actionText, { color: palette.textSecondary }]}>Kép megosztása</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void Share.share({
                        title: memory.title,
                        message: `${memory.title}\n${memory.location ?? ''}`.trim(),
                      });
                    }}
                    style={({ pressed }) => [
                      styles.action,
                      { backgroundColor: palette.surfaceMuted },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="share-social-outline" size={21} color={palette.primary} />
                    <Text style={[styles.actionText, { color: palette.textSecondary }]}>Megosztás</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFavorite((current) => !current)}
                    style={({ pressed }) => [
                      styles.action,
                      { backgroundColor: palette.surfaceMuted },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={favorite ? 'heart' : 'heart-outline'}
                      size={21}
                      color={palette.danger}
                    />
                    <Text style={[styles.actionText, { color: palette.textSecondary }]}>Kedvenc</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.stateBox}>
                <Text style={[styles.stateText, { color: palette.textSecondary }]}>
                  {loading ? 'Emlék betöltése…' : error ? String(error) : 'Az emlék nem található.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* A görgetőn kívül, a tetején: így a részletkártya sosem takarja el. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vissza az emlékekhez"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [
            styles.backButton,
            { top: insets.top + spacing.sm },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>

        <Modal
          visible={selectedPhoto !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.viewer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: (selectedPhoto ?? 0) * width, y: 0 }}
              onMomentumScrollEnd={(event) =>
                setSelectedPhoto(Math.round(event.nativeEvent.contentOffset.x / width))
              }
              style={styles.viewerScroll}
            >
              {photos.map((photo, index) => (
                <View key={`${photo}-viewer-${index}`} style={[styles.viewerPage, { width, height }]}>
                  <Image source={{ uri: photo }} resizeMode="contain" style={styles.viewerImage} />
                </View>
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Képnézegető bezárása"
              onPress={() => setSelectedPhoto(null)}
              style={[styles.viewerClose, { top: insets.top + spacing.md }]}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
            <View style={[styles.viewerCounter, { bottom: insets.bottom + spacing.lg }]}>
              <Text style={styles.viewerCounterText}>
                {(selectedPhoto ?? 0) + 1} / {photos.length}
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  hero: { height: 360, position: 'relative' },
  heroPressable: { flex: 1 },
  heroImage: { width: '100%', height: '100%' },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  heroBadge: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
    backgroundColor: 'rgba(23, 43, 77, 0.72)',
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  backButton: {
    position: 'absolute',
    zIndex: 5,
    left: spacing.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: 'rgba(23, 43, 77, 0.7)',
  },
  detailsCard: {
    minHeight: 380,
    marginTop: -24,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadows.card,
  },
  datePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.round,
  },
  dateText: { fontSize: 12, fontWeight: '800' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  title: { flex: 1, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  infoText: { flex: 1, fontSize: 14, fontWeight: '700' },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.round },
  chipText: { fontSize: 13, fontWeight: '700' },
  description: {
    marginTop: spacing.lg,
    fontSize: 15,
    lineHeight: 24,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  countText: { fontSize: 12, fontWeight: '900' },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  thumbnailPressable: { width: '31.8%', aspectRatio: 1 },
  thumbnail: { width: '100%', height: '100%', borderRadius: radius.md },
  emptyPhotos: {
    marginTop: spacing.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  emptyPhotosText: { flex: 1, fontSize: 13, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  action: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.lg,
  },
  actionText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  stateBox: { paddingVertical: spacing.xl, alignItems: 'center' },
  stateText: { fontSize: 15, textAlign: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(8, 18, 35, 0.97)' },
  viewerScroll: { flex: 1 },
  viewerPage: { alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '82%', minHeight: 1 },
  viewerClose: {
    position: 'absolute',
    zIndex: 2,
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
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.round,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  viewerCounterText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});