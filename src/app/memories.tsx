import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useMemories } from '@/hooks/use-memories';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type MemoryView = 'all' | 'photos' | 'videos' | 'events';
type Memory = ReturnType<typeof useMemories>['memories'][number];

/* ------------------------------------------------------------------ */
/* Tabváltó                                                            */
/* ------------------------------------------------------------------ */

const TABS: { key: MemoryView; label: string; icon: IconName }[] = [
  { key: 'all', label: 'Összes', icon: 'sparkles-outline' },
  { key: 'photos', label: 'Fotók', icon: 'image-outline' },
  { key: 'videos', label: 'Videók', icon: 'videocam-outline' },
  { key: 'events', label: 'Események', icon: 'calendar-outline' },
];

function MemoryTabs({
  active,
  onChange,
}: {
  active: MemoryView;
  onChange: (view: MemoryView) => void;
}) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {TABS.map(({ key, label, icon }) => {
        const isActive = key === active;
        const content = (
          <>
            <Ionicons
              name={icon}
              size={20}
              color={isActive ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {label}
            </Text>
          </>
        );

        return (
          <Pressable
            key={key}
            style={styles.tabWrap}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(key)}
          >
            {isActive ? (
              <LinearGradient
                colors={['#2F6BFF', '#1B3FD8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tab}
              >
                {content}
              </LinearGradient>
            ) : (
              <View style={styles.tab}>{content}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Idővonal                                                            */
/* ------------------------------------------------------------------ */

function MemoryCard({ item, featured = false }: { item: Memory; featured?: boolean }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} emlék részleteinek megnyitása`}
      onPress={() =>
        router.push({
          pathname: '/memory-details',
          params: { id: item.id },
        })
      }
      style={({ pressed }) => [
        styles.memoryCard,
        featured && styles.featuredCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.memoryImageWrap}>
        {item.photo ? (
          <Image
            source={{ uri: item.photo }}
            style={[styles.memoryImage, featured && styles.featuredCardImage]}
          />
        ) : (
          <View
            style={[
              styles.memoryImage,
              featured && styles.featuredCardImage,
              styles.photoPlaceholder,
            ]}
          >
            <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
          </View>
        )}
        {item.extraPhotos > 0 && (
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>+{item.extraPhotos}</Text>
          </View>
        )}
      </View>
      <View style={styles.memoryInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.memoryHeart}>♥</Text>
        </View>
        <Text style={styles.metaText}>{item.when}</Text>
      </View>
    </Pressable>
  );
}

function TimelineView() {
  const { memories, loading, hasMore, error, loadMore } = useMemories();

  return (
    <View>
      {memories.length > 0 && <MemoryCard item={memories[0]} featured />}
      <View style={styles.memoryGrid}>
        {memories.slice(1).map((m) => <MemoryCard key={m.id} item={m} />)}
      </View>

      {!loading && !error && memories.length === 0 && (
        <Text style={styles.metaText}>Még nincs emlék. Add hozzá az elsőt!</Text>
      )}
      {!!error && <Text style={styles.metaText}>Hiba történt: {error}</Text>}

      {hasMore && memories.length > 0 && (
        <Pressable style={styles.loadMore} onPress={loadMore} disabled={loading}>
          <Text style={styles.metaText}>
            {loading ? 'Betöltés…' : 'További emlékek betöltése'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Egyelőre üres nézetek                                               */
/* ------------------------------------------------------------------ */

const EmptyMemoryView = ({ label }: { label: string }) => (
  <Text style={styles.metaText}>{label}</Text>
);

/* ------------------------------------------------------------------ */
/* Váltó + tartalom                                                    */
/* ------------------------------------------------------------------ */

export function MemoryScreenOptions() {
  const [active, setActive] = useState<MemoryView>('all');

  return (
    <View style={styles.options}>
      <MemoryTabs active={active} onChange={setActive} />
      {active === 'all' && <TimelineView />}
      {active === 'photos' && <TimelineView />}
      {active === 'videos' && <EmptyMemoryView label="Még nincs videó." />}
      {active === 'events' && <TimelineView />}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Képernyő                                                            */
/* ------------------------------------------------------------------ */

export default function MemoriesScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View pointerEvents="none" style={styles.backgroundGlow} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.title}>Emlékek</Text>
            <Pressable style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <MemoryScreenOptions />
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Új emlék hozzáadása"
          style={({ pressed }) => [styles.floatingAdd, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={31} color={colors.white} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Stílusok                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 100 },
  backgroundGlow: {
    position: 'absolute',
    top: 72,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E7F0FF',
    opacity: 0.75,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  moreButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: '#F0F5FF',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  options: {
    width: '100%',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.round,
    backgroundColor: '#EEF4FC',
  },
  tabWrap: {
    flex: 1,
  },
  tab: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.round,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.white,
  },
  memoryCard: {
    width: '48.5%',
    marginBottom: spacing.lg,
  },
  featuredCard: {
    width: '100%',
    marginBottom: spacing.md,
  },
  memoryImageWrap: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    ...shadows.card,
  },
  memoryImage: {
    width: '100%',
    height: 148,
    backgroundColor: colors.surfaceMuted,
  },
  featuredCardImage: {
    height: 226,
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  memoryInfo: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: 3,
  },
  memoryHeart: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '900',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.round,
    backgroundColor: 'rgba(23, 43, 77, 0.76)',
  },
  photoBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  avatars: {
    flexDirection: 'row',
    marginTop: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceMuted,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarMore: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadMore: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  floatingAdd: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
