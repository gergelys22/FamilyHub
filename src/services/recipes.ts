import { supabase } from '@/lib/supabase';
import { signMediaPaths, uploadCommunityImage } from '@/services/community';

export const recipeCategories = [
  { key: 'foetel', label: 'Főétel', icon: 'restaurant-outline' as const, color: '#F59E0B' },
  { key: 'leves', label: 'Leves', icon: 'cafe-outline' as const, color: '#FB7185' },
  { key: 'desszert', label: 'Desszert', icon: 'ice-cream-outline' as const, color: '#F56C9A' },
  { key: 'reggeli', label: 'Reggeli', icon: 'sunny-outline' as const, color: '#20BFA7' },
  { key: 'koret', label: 'Köret és saláta', icon: 'leaf-outline' as const, color: '#22A06B' },
  { key: 'egyeb', label: 'Egyéb', icon: 'ellipsis-horizontal-circle-outline' as const, color: '#8D9AAF' },
];

export type Recipe = {
  id: string;
  family_id: string;
  author_profile_id: string;
  title: string;
  description: string;
  category: string;
  servings: number;
  prep_minutes: number;
  cook_minutes: number;
  ingredients: string[];
  steps: string[];
  image_path: string | null;
  created_at: string;
  author_name: string;
  image_url: string | null;
};

type RecipeRow = Omit<Recipe, 'author_name' | 'image_url' | 'ingredients' | 'steps'> & {
  ingredients: unknown;
  steps: unknown;
  author: { display_name: string } | { display_name: string }[] | null;
};

function toStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

async function mapRows(rows: RecipeRow[]) {
  const urls = await signMediaPaths(rows.map((row) => row.image_path ?? ''));
  return rows.map<Recipe>((row) => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
      ...row,
      ingredients: toStringList(row.ingredients),
      steps: toStringList(row.steps),
      author_name: author?.display_name ?? 'Családtag',
      image_url: row.image_path ? (urls.get(row.image_path) ?? null) : null,
    };
  });
}

const RECIPE_COLUMNS =
  'id, family_id, author_profile_id, title, description, category, servings, prep_minutes, cook_minutes, ingredients, steps, image_path, created_at, author:profiles!author_profile_id(display_name)';

export async function getRecipes(familyId: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return mapRows((data ?? []) as unknown as RecipeRow[]);
}

export async function getRecipesByIds(ids: string[]) {
  if (ids.length === 0) return [] as Recipe[];
  const { data, error } = await supabase.from('recipes').select(RECIPE_COLUMNS).in('id', ids);
  if (error) throw error;
  return mapRows((data ?? []) as unknown as RecipeRow[]);
}

export async function getRecipe(id: string) {
  const items = await getRecipesByIds([id]);
  return items[0] ?? null;
}

export async function createRecipe(input: {
  familyId: string;
  profileId: string;
  title: string;
  description: string;
  category: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: string[];
  steps: string[];
  image?: { uri: string; mimeType?: string | null } | null;
}) {
  const imagePath = input.image
    ? await uploadCommunityImage(input.familyId, input.image.uri, input.image.mimeType)
    : null;
  const { error } = await supabase.from('recipes').insert({
    family_id: input.familyId,
    author_profile_id: input.profileId,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    servings: input.servings,
    prep_minutes: input.prepMinutes,
    cook_minutes: input.cookMinutes,
    ingredients: input.ingredients,
    steps: input.steps,
    image_path: imagePath,
  });
  if (error) throw error;
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}
