import { RecipeSheet } from '@/components/community-recipes';
import { Avatar, EmptyBlock, sharedStyles, timeAgo, usePalette } from '@/components/community-shared';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { radius, shadows, spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { useMemories } from '@/hooks/use-memories';
import { useAuth } from '@/providers/auth-provider';
import { getCommunityPostsByIds, type CommunityPost } from '@/services/community';
import type { FavoriteType } from '@/services/favorites';
import { getRecipesByIds, recipeCategories, type Recipe } from '@/services/recipes';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Filter = 'all' | FavoriteType;

const FILTERS: { key: Filter; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'all', label: 'Mind', icon: 'heart-outline' },
  { key: 'memory', label: 'Emlékek', icon: 'images-outline' },
  { key: 'recipe', label: 'Receptek', icon: 'restaurant-outline' },
  { key: 'post', label: 'Bejegyzések', icon: 'chatbubbles-outline' },
];

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { profile } = useAuth();
  const favorites = useFavorites();
  const { memories, loading: memoriesLoading, hasMore, loadMore } = useMemories();
  const [filter, setFilter] = useState<Filter>('all');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [resolving, setResolving] = useState(true);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const ids = useMemo(() => {
    const byType = (type: FavoriteType) =>
      favorites.favorites.filter((item) => item.item_type === type).map((item) => item.item_id);
    return { memory: byType('memory'), recipe: byType('recipe'), post: byType('post') };
  }, [favorites.favorites]);

  const recipeKey = ids.recipe.join(',');
  const postKey = ids.post.join(',');

  // A kedvenc receptek és bejegyzések betöltése.
  useEffect(() => {
    if (favorites.loading) return;
    let active = true;
    void Promise.all([
      getRecipesByIds(recipeKey ? recipeKey.split(',') : []),
      getCommunityPostsByIds(postKey ? postKey.split(',') : [], profile?.id ?? null),
    ])
      .then(([nextRecipes, nextPosts]) => {
        if (!active) return;
        setRecipes(nextRecipes);
        setPosts(nextPosts);
      })
      .catch(() => {
        // A hiányzó elemek egyszerűen nem jelennek meg.
      })
      .finally(() => {
        if (active) setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [favorites.loading, recipeKey, postKey, profile?.id]);

  // Az emlékeket lapozva töltjük, ezért addig kérünk újabb oldalt, amíg minden kedvenc elő nem kerül.
  const missingMemory = ids.memory.some((id) => !memories.some((memory) => memory.id === id));
  useEffect(() => {
    if (missingMemory && hasMore && !memoriesLoading) loadMore();
  }, [missingMemory, hasMore, memoriesLoading, loadMore]);

  const favoriteMemories = ids.memory
    .map((id) => memories.find((memory) => memory.id === id))
    .filter((memory): memory is NonNullable<typeof memory> => Boolean(memory));
  const favoriteRecipes = ids.recipe
    .map((id) => recipes.find((recipe) => recipe.id === id))
    .filter((recipe): recipe is Recipe => Boolean(recipe));
  const favoritePosts = ids.post
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is CommunityPost => Boolean(post));

  const counts: Record<Filter, number> = {
    all: favoriteMemories.length + favoriteRecipes.length + favoritePosts.length,
    memory: favoriteMemories.length,
    recipe: favoriteRecipes.length,
    post: favoritePosts.length,
  };

  const loading = favorites.loading || resolving;
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  const showMemories = filter === 'all' || filter === 'memory';
  const showRecipes = filter === 'all' || filter === 'recipe';
  const showPosts = filter === 'all' || filter === 'post';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Kedvencek</Text>
        <View style={[styles.headerIcon, { backgroundColor: isDark ? '#4A1226' : '#FFE4E9' }]}>
          <Ionicons name="heart" size={20} color={palette.danger} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={isDark ? ['#8A1F3A', '#4A1226'] : ['#F0455F', '#C42B49']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadows.floating]}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="heart" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>A kedvenceid egy helyen</Text>
            <Text style={styles.heroText}>
              {counts.all} mentett elem · {counts.memory} emlék · {counts.recipe} recept · {counts.post} bejegyzés
            </Text>
          </View>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.primary : palette.surface,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Ionicons name={item.icon} size={15} color={active ? '#FFFFFF' : palette.textSecondary} />
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : palette.textSecondary }]}>
                  {item.label} {counts[item.key]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? <ActivityIndicator color={palette.primary} size="large" style={styles.loader} /> : null}

        {!loading && counts[filter] === 0 ? (
          <EmptyBlock
            icon="heart-outline"
            title="Még nincs kedvenc"
            text="Koppints a szívre egy emléken vagy receptnél, a könyvjelzőre egy bejegyzésnél, és itt megtalálod."
            action={{ label: 'Irány a Közösségi tér', onPress: () => router.push('/social' as never) }}
          />
        ) : null}

        {showMemories && favoriteMemories.length > 0 ? (
          <>
            <Text style={[styles.section, { color: palette.textMuted }]}>Emlékek</Text>
            {favoriteMemories.map((memory) => (
              <View
                key={memory.id}
                style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }, shadows.card]}
              >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${memory.title} emlék megnyitása`}
                onPress={() => router.push({ pathname: '/memory-details', params: { id: memory.id } })}
                style={({ pressed }) => [styles.rowMain, pressed && sharedStyles.pressed]}
              >
                {memory.photo ? (
                  <Image source={{ uri: memory.photo }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: palette.surfaceMuted }]}>
                    <Ionicons name="image-outline" size={24} color={palette.textMuted} />
                  </View>
                )}
                <View style={styles.flex}>
                  <Text style={[styles.rowTitle, { color: palette.textPrimary }]} numberOfLines={2}>
                    {memory.title}
                  </Text>
                  <Text style={[styles.rowMeta, { color: palette.textMuted }]}>{memory.when}</Text>
                </View>
              </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Eltávolítás a kedvencekből"
                  hitSlop={10}
                  onPress={() => void favorites.toggleFavorite('memory', memory.id)}
                >
                  <Ionicons name="heart" size={22} color={palette.danger} />
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {showRecipes && favoriteRecipes.length > 0 ? (
          <>
            <Text style={[styles.section, { color: palette.textMuted }]}>Receptek</Text>
            {favoriteRecipes.map((recipe) => {
              const meta =
                recipeCategories.find((item) => item.key === recipe.category) ??
                recipeCategories[recipeCategories.length - 1];
              return (
                <View
                  key={recipe.id}
                  style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }, shadows.card]}
                >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${recipe.title} recept megnyitása`}
                  onPress={() => setSelectedRecipeId(recipe.id)}
                  style={({ pressed }) => [styles.rowMain, pressed && sharedStyles.pressed]}
                >
                  {recipe.image_url ? (
                    <Image source={{ uri: recipe.image_url }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${meta.color}22` }]}>
                      <Ionicons name={meta.icon} size={26} color={meta.color} />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]} numberOfLines={2}>
                      {recipe.title}
                    </Text>
                    <Text style={[styles.rowMeta, { color: palette.textMuted }]}>
                      {meta.label} · {recipe.prep_minutes + recipe.cook_minutes} perc · {recipe.servings} adag
                    </Text>
                  </View>
                </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eltávolítás a kedvencekből"
                    hitSlop={10}
                    onPress={() => void favorites.toggleFavorite('recipe', recipe.id)}
                  >
                    <Ionicons name="heart" size={22} color={palette.danger} />
                  </Pressable>
                </View>
              );
            })}
          </>
        ) : null}

        {showPosts && favoritePosts.length > 0 ? (
          <>
            <Text style={[styles.section, { color: palette.textMuted }]}>Bejegyzések</Text>
            {favoritePosts.map((post) => (
              <View
                key={post.id}
                style={[styles.post, { backgroundColor: palette.surface, borderColor: palette.border }, shadows.card]}
              >
                <View style={styles.postHeader}>
                  <Avatar name={post.author_name} size={36} />
                  <View style={styles.flex}>
                    <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>{post.author_name}</Text>
                    <Text style={[styles.rowMeta, { color: palette.textMuted }]}>{timeAgo(post.created_at)}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eltávolítás a kedvencekből"
                    hitSlop={10}
                    onPress={() => void favorites.toggleFavorite('post', post.id)}
                  >
                    <Ionicons name="bookmark" size={22} color={palette.primary} />
                  </Pressable>
                </View>
                {post.body ? <Text style={[styles.postBody, { color: palette.textPrimary }]}>{post.body}</Text> : null}
                {post.media_url ? (
                  <Image source={{ uri: post.media_url }} style={[styles.postImage, { backgroundColor: palette.surfaceMuted }]} />
                ) : null}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <RecipeSheet
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipeId(null)}
        onDeleted={() => {
          setRecipes((current) => current.filter((recipe) => recipe.id !== selectedRecipeId));
        }}
        favorites={favorites}
        canDelete={selectedRecipe?.author_profile_id === profile?.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 25, fontWeight: '900', letterSpacing: -0.4 },
  headerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  hero: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  heroText: { marginTop: 3, color: 'rgba(255,255,255,0.88)', fontSize: 12, lineHeight: 17 },
  filterRow: { gap: spacing.sm, paddingRight: spacing.md },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.round,
  },
  filterText: { fontSize: 13, fontWeight: '800' },
  loader: { paddingVertical: 40 },
  section: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 84,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 60, height: 60, borderRadius: radius.md },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '900' },
  rowMeta: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  post: { padding: spacing.md, gap: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  postBody: { fontSize: 14, lineHeight: 21 },
  postImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
});