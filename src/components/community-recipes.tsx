import { ConfirmDialog } from '@/components/action-sheet';
import {
  EmptyBlock,
  FormInput,
  FormLabel,
  PrimaryButton,
  Sheet,
  sharedStyles,
  useFamilyId,
  usePalette,
} from '@/components/community-shared';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import type { FavoriteType } from '@/services/favorites';
import { createRecipe, deleteRecipe, getRecipes, recipeCategories, updateRecipe, type Recipe } from '@/services/recipes';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FavoriteApi = {
  isFavorite: (type: FavoriteType, id: string) => boolean;
  toggleFavorite: (type: FavoriteType, id: string) => Promise<void>;
};

function categoryMeta(key: string) {
  return recipeCategories.find((item) => item.key === key) ?? recipeCategories[recipeCategories.length - 1];
}

function totalMinutes(recipe: Recipe) {
  return recipe.prep_minutes + recipe.cook_minutes;
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return '–';
  if (minutes < 60) return `${minutes} perc`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ó ${rest} p` : `${hours} óra`;
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

function toInt(value: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/* ------------------------------------------------------------------ */
/* Recept részletei                                                    */
/* ------------------------------------------------------------------ */

export function RecipeSheet({
  recipe,
  onClose,
  onDeleted,
  onEdit,
  favorites,
  canDelete,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  onDeleted: () => void;
  onEdit?: (recipe: Recipe) => void;
  favorites: FavoriteApi;
  canDelete: boolean;
}) {
  const { palette } = usePalette();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  function notify(title: string, message: string) {
    setNotice({ title, message });
  }
  if (!recipe) {
    return (
      <Sheet visible={false} onClose={onClose} title="" icon="restaurant">
        {null}
      </Sheet>
    );
  }
  const meta = categoryMeta(recipe.category);
  const favorite = favorites.isFavorite('recipe', recipe.id);

  async function doDelete() {
    setDeleteOpen(false);
    try {
      await deleteRecipe(recipe!.id, recipe!.image_path);
      onDeleted();
      onClose();
    } catch (caught) {
      notify('Hiba', caught instanceof Error ? caught.message : 'A törlés sikertelen.');
    }
  }

  return (
    <Sheet visible onClose={onClose} title={recipe.title} icon={meta.icon} maxHeight="94%">
      {recipe.image_url ? (
        <Image source={{ uri: recipe.image_url }} style={[recipeStyles.detailImage, { backgroundColor: palette.surfaceMuted }]} />
      ) : null}

      <View style={recipeStyles.chipRow}>
        <View style={[recipeStyles.metaChip, { backgroundColor: `${meta.color}22` }]}>
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <Text style={[recipeStyles.metaChipText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={[recipeStyles.metaChip, { backgroundColor: palette.surfaceElevated }]}>
          <Ionicons name="time-outline" size={14} color={palette.textSecondary} />
          <Text style={[recipeStyles.metaChipText, { color: palette.textSecondary }]}>
            {formatMinutes(totalMinutes(recipe))}
          </Text>
        </View>
        <View style={[recipeStyles.metaChip, { backgroundColor: palette.surfaceElevated }]}>
          <Ionicons name="people-outline" size={14} color={palette.textSecondary} />
          <Text style={[recipeStyles.metaChipText, { color: palette.textSecondary }]}>{recipe.servings} adag</Text>
        </View>
      </View>

      {recipe.description ? (
        <Text style={[recipeStyles.description, { color: palette.textSecondary }]}>{recipe.description}</Text>
      ) : null}
      <Text style={[recipeStyles.byline, { color: palette.textMuted }]}>Feltöltötte: {recipe.author_name}</Text>

      {recipe.ingredients.length > 0 ? (
        <View style={[recipeStyles.block, { backgroundColor: palette.background, borderColor: palette.border }]}>
          <Text style={[recipeStyles.blockTitle, { color: palette.textPrimary }]}>Hozzávalók</Text>
          {recipe.ingredients.map((item, index) => (
            <View key={`${item}-${index}`} style={recipeStyles.ingredientRow}>
              <View style={[recipeStyles.bullet, { backgroundColor: meta.color }]} />
              <Text style={[recipeStyles.ingredientText, { color: palette.textPrimary }]}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {recipe.steps.length > 0 ? (
        <View style={recipeStyles.stepsBlock}>
          <Text style={[recipeStyles.blockTitle, { color: palette.textPrimary }]}>Elkészítés</Text>
          {recipe.steps.map((step, index) => (
            <View key={`${step}-${index}`} style={recipeStyles.stepRow}>
              <View style={[recipeStyles.stepNumber, { backgroundColor: palette.primary }]}>
                <Text style={recipeStyles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={[recipeStyles.stepText, { color: palette.textPrimary }]}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={recipeStyles.detailActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: favorite }}
          onPress={() => void favorites.toggleFavorite('recipe', recipe.id)}
          style={({ pressed }) => [
            recipeStyles.favoriteButton,
            {
              backgroundColor: favorite ? `${palette.danger}1F` : palette.surfaceElevated,
              borderColor: favorite ? palette.danger : palette.border,
            },
            pressed && sharedStyles.pressed,
          ]}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={20}
            color={favorite ? palette.danger : palette.textSecondary}
          />
          <Text style={[recipeStyles.favoriteText, { color: favorite ? palette.danger : palette.textSecondary }]}>
            {favorite ? 'Kedvenc' : 'Kedvencnek jelölés'}
          </Text>
        </Pressable>
        {canDelete && onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recept szerkesztése"
            onPress={() => onEdit(recipe)}
            style={({ pressed }) => [
              recipeStyles.deleteButton,
              { borderColor: palette.border },
              pressed && sharedStyles.pressed,
            ]}
          >
            <Ionicons name="pencil-outline" size={20} color={palette.textMuted} />
          </Pressable>
        ) : null}
        {canDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recept törlése"
            onPress={() => setDeleteOpen(true)}
            style={({ pressed }) => [
              recipeStyles.deleteButton,
              { borderColor: palette.border },
              pressed && sharedStyles.pressed,
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ConfirmDialog
        visible={deleteOpen}
        title="Recept törlése"
        message={`Törlöd ezt a receptet: ${recipe.title}?`}
        onConfirm={() => void doDelete()}
        onCancel={() => setDeleteOpen(false)}
        palette={palette}
      />
      <ConfirmDialog
        visible={notice !== null}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        confirmLabel="Rendben"
        destructive={false}
        hideCancel
        onConfirm={() => setNotice(null)}
        onCancel={() => setNotice(null)}
        palette={palette}
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Új recept                                                           */
/* ------------------------------------------------------------------ */

export function NewRecipeModal({
  visible,
  onClose,
  onSaved,
  recipe,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Ha meg van adva, szerkesztő módban nyílik meg. */
  recipe?: Recipe | null;
}) {
  const { palette } = usePalette();
  const { profile } = useAuth();
  const { familyId } = useFamilyId();
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [description, setDescription] = useState(recipe?.description ?? '');
  const [category, setCategory] = useState(recipe?.category ?? 'foetel');
  const [servings, setServings] = useState(recipe ? String(recipe.servings) : '4');
  const [prep, setPrep] = useState(recipe ? String(recipe.prep_minutes) : '15');
  const [cook, setCook] = useState(recipe ? String(recipe.cook_minutes) : '30');
  const [ingredients, setIngredients] = useState(recipe?.ingredients.join('\n') ?? '');
  const [steps, setSteps] = useState(recipe?.steps.join('\n') ?? '');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const existingImage = recipe && !removeImage ? recipe.image_url : null;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  function notify(title: string, message: string) {
    setNotice({ title, message });
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Engedély szükséges', 'A fotó kiválasztásához engedélyezd a fotókönyvtár hozzáférést.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setImage(result.assets[0] ?? null);
  }

  async function save() {
    if (!familyId || !profile?.id) return;
    const ingredientList = splitLines(ingredients);
    const stepList = splitLines(steps);
    if (!title.trim()) {
      notify('Hiányzó adat', 'Add meg a recept nevét.');
      return;
    }
    if (ingredientList.length === 0 || stepList.length === 0) {
      notify('Hiányzó adat', 'Adj meg legalább egy hozzávalót és egy elkészítési lépést.');
      return;
    }
    setBusy(true);
    try {
      if (recipe) {
        await updateRecipe({
          id: recipe.id,
          familyId,
          title,
          description,
          category,
          servings: toInt(servings, 4, 1, 100),
          prepMinutes: toInt(prep, 0, 0, 2000),
          cookMinutes: toInt(cook, 0, 0, 2000),
          ingredients: ingredientList,
          steps: stepList,
          currentImagePath: recipe.image_path,
          removeImage,
          newImage: image ? { uri: image.uri, mimeType: image.mimeType } : null,
        });
        onSaved();
        onClose();
        return;
      }
      await createRecipe({
        familyId,
        profileId: profile.id,
        title,
        description,
        category,
        servings: toInt(servings, 4, 1, 100),
        prepMinutes: toInt(prep, 0, 0, 2000),
        cookMinutes: toInt(cook, 0, 0, 2000),
        ingredients: ingredientList,
        steps: stepList,
        image: image ? { uri: image.uri, mimeType: image.mimeType } : null,
      });
      setTitle('');
      setDescription('');
      setIngredients('');
      setSteps('');
      setImage(null);
      onSaved();
      onClose();
    } catch (caught) {
      notify('A recept nem menthető', caught instanceof Error ? caught.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={recipe ? 'Recept szerkesztése' : 'Új recept'} icon="restaurant">
      <FormInput value={title} onChangeText={setTitle} placeholder="A recept neve" maxLength={120} />
      <FormInput
        value={description}
        onChangeText={setDescription}
        placeholder="Rövid leírás (opcionális)"
        multiline
        maxLength={1000}
      />

      <FormLabel>Kategória</FormLabel>
      <View style={recipeStyles.chipWrap}>
        {recipeCategories.map((item) => {
          const selected = category === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setCategory(item.key)}
              style={[
                recipeStyles.categoryChip,
                { backgroundColor: selected ? item.color : palette.surfaceElevated },
              ]}
            >
              <Ionicons name={item.icon} size={15} color={selected ? '#FFFFFF' : item.color} />
              <Text style={[recipeStyles.categoryChipText, { color: selected ? '#FFFFFF' : palette.textSecondary }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={recipeStyles.numberRow}>
        <View style={recipeStyles.numberField}>
          <FormLabel>Adag</FormLabel>
          <FormInput value={servings} onChangeText={setServings} keyboardType="number-pad" />
        </View>
        <View style={recipeStyles.numberField}>
          <FormLabel>Előkészítés (perc)</FormLabel>
          <FormInput value={prep} onChangeText={setPrep} keyboardType="number-pad" />
        </View>
        <View style={recipeStyles.numberField}>
          <FormLabel>Főzés (perc)</FormLabel>
          <FormInput value={cook} onChangeText={setCook} keyboardType="number-pad" />
        </View>
      </View>

      <FormLabel>Hozzávalók (soronként egy)</FormLabel>
      <FormInput
        value={ingredients}
        onChangeText={setIngredients}
        placeholder={'500 g liszt\n2 tojás\n1 csipet só'}
        multiline
        style={recipeStyles.tallInput}
      />
      <FormLabel>Elkészítés (soronként egy lépés)</FormLabel>
      <FormInput
        value={steps}
        onChangeText={setSteps}
        placeholder={'Keverjük össze a száraz hozzávalókat.\nAdjuk hozzá a tojást.'}
        multiline
        style={recipeStyles.tallInput}
      />

      {image || existingImage ? (
        <View style={recipeStyles.previewWrap}>
          <Image source={{ uri: image?.uri ?? existingImage ?? '' }} style={recipeStyles.preview} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fotó eltávolítása"
            onPress={() => {
              setImage(null);
              setRemoveImage(true);
            }}
            style={recipeStyles.previewRemove}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => void pickImage()}
          style={({ pressed }) => [
            recipeStyles.photoButton,
            { backgroundColor: palette.primarySoft },
            pressed && sharedStyles.pressed,
          ]}
        >
          <Ionicons name="image-outline" size={20} color={palette.primary} />
          <Text style={[recipeStyles.photoButtonText, { color: palette.primary }]}>Fotó hozzáadása (opcionális)</Text>
        </Pressable>
      )}

      <PrimaryButton label={recipe ? 'Módosítások mentése' : 'Recept mentése'} icon="checkmark" busy={busy} onPress={() => void save()} />
      <ConfirmDialog
        visible={notice !== null}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        confirmLabel="Rendben"
        destructive={false}
        hideCancel
        onConfirm={() => setNotice(null)}
        onCancel={() => setNotice(null)}
        palette={palette}
      />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Receptek lista                                                      */
/* ------------------------------------------------------------------ */

export function RecipesTab({
  refreshToken,
  onCompose,
  favorites,
}: {
  refreshToken: number;
  onCompose: () => void;
  favorites: FavoriteApi;
}) {
  const { palette } = usePalette();
  const { profile } = useAuth();
  const { familyId, loading: familyLoading } = useFamilyId();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    void getRecipes(familyId)
      .then((items) => {
        if (!active) return;
        setRecipes(items);
        setError(null);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'A receptek betöltése sikertelen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [familyId, refreshToken, version]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('hu-HU');
    return recipes.filter((recipe) => {
      if (category !== 'all' && recipe.category !== category) return false;
      if (!needle) return true;
      const haystack = `${recipe.title} ${recipe.description} ${recipe.ingredients.join(' ')}`;
      return haystack.toLocaleLowerCase('hu-HU').includes(needle);
    });
  }, [recipes, search, category]);

  const selected = recipes.find((recipe) => recipe.id === selectedId) ?? null;

  return (
    <View style={recipeStyles.list}>
      <View
        style={[
          recipeStyles.search,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Ionicons name="search" size={19} color={palette.primary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Keresés névben vagy hozzávalóban…"
          placeholderTextColor={palette.textMuted}
          style={[recipeStyles.searchInput, { color: palette.textPrimary }]}
        />
        {search ? (
          <Pressable accessibilityLabel="Keresés törlése" hitSlop={8} onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={recipeStyles.filterRow}>
        {[{ key: 'all', label: 'Összes', icon: 'apps-outline' as const, color: palette.primary }, ...recipeCategories].map(
          (item) => {
            const active = category === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(item.key)}
                style={[
                  recipeStyles.filterChip,
                  {
                    backgroundColor: active ? item.color : palette.surface,
                    borderColor: active ? item.color : palette.border,
                  },
                ]}
              >
                <Ionicons name={item.icon} size={15} color={active ? '#FFFFFF' : item.color} />
                <Text style={[recipeStyles.filterText, { color: active ? '#FFFFFF' : palette.textSecondary }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          },
        )}
      </ScrollView>

      {(loading || familyLoading) && recipes.length === 0 ? (
        <ActivityIndicator color={palette.primary} size="large" style={recipeStyles.loader} />
      ) : null}

      {error ? <EmptyBlock icon="alert-circle-outline" title="Hiba történt" text={error} /> : null}

      {!loading && !error && recipes.length === 0 ? (
        <EmptyBlock
          icon="restaurant-outline"
          title="Még üres a családi receptkönyv"
          text="Mentsd el a család kedvenc ételeit, hogy mindenki megtalálja."
          action={{ label: 'Első recept hozzáadása', onPress: onCompose }}
        />
      ) : null}

      {!loading && recipes.length > 0 && visible.length === 0 ? (
        <EmptyBlock icon="search-outline" title="Nincs találat" text="Próbálj másik szót vagy kategóriát." />
      ) : null}

      <View style={recipeStyles.grid}>
        {visible.map((recipe) => {
          const meta = categoryMeta(recipe.category);
          const favorite = favorites.isFavorite('recipe', recipe.id);
          return (
            <View
              key={recipe.id}
              style={[
                recipeStyles.card,
                { backgroundColor: palette.surface, borderColor: palette.border },
                shadows.card,
              ]}
            >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${recipe.title} recept megnyitása`}
              onPress={() => setSelectedId(recipe.id)}
              style={({ pressed }) => [pressed && sharedStyles.pressed]}
            >
              <View style={recipeStyles.cardImageWrap}>
                {recipe.image_url ? (
                  <Image source={{ uri: recipe.image_url }} style={recipeStyles.cardImage} />
                ) : (
                  <LinearGradient
                    colors={[`${meta.color}44`, `${meta.color}18`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[recipeStyles.cardImage, recipeStyles.placeholder]}
                  >
                    <Ionicons name={meta.icon} size={38} color={meta.color} />
                  </LinearGradient>
                )}
              </View>
              <View style={recipeStyles.cardBody}>
                <Text style={[recipeStyles.cardTitle, { color: palette.textPrimary }]} numberOfLines={2}>
                  {recipe.title}
                </Text>
                <View style={recipeStyles.cardMeta}>
                  <Ionicons name="time-outline" size={13} color={palette.textMuted} />
                  <Text style={[recipeStyles.cardMetaText, { color: palette.textMuted }]}>
                    {formatMinutes(totalMinutes(recipe))} · {recipe.servings} adag
                  </Text>
                </View>
              </View>
            </Pressable>
              <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Eltávolítás a kedvencekből' : 'Kedvencnek jelölés'}
              accessibilityState={{ selected: favorite }}
              hitSlop={6}
              onPress={() => void favorites.toggleFavorite('recipe', recipe.id)}
              style={recipeStyles.heartButton}
                >
              <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? '#FF6B8B' : '#FFFFFF'} />
                </Pressable>
            </View>
          );
        })}
      </View>

      {editRecipe ? (
        <NewRecipeModal
          key={editRecipe.id}
          visible
          recipe={editRecipe}
          onClose={() => setEditRecipe(null)}
          onSaved={() => setVersion((current) => current + 1)}
        />
      ) : null}

      <RecipeSheet
        recipe={selected}
        onClose={() => setSelectedId(null)}
        onDeleted={() => setVersion((current) => current + 1)}
        onEdit={(item) => {
          setSelectedId(null);
          setEditRecipe(item);
        }}
        favorites={favorites}
        canDelete={selected?.author_profile_id === profile?.id}
      />
    </View>
  );
}

const recipeStyles = StyleSheet.create({
  list: { gap: spacing.md },
  loader: { paddingVertical: 48 },
  search: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  searchInput: { flex: 1, fontSize: 14 },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  card: { width: '48.5%', overflow: 'hidden', borderWidth: 1, borderRadius: radius.lg },
  cardImageWrap: { width: '100%', height: 124 },
  cardImage: { width: '100%', height: 124 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(23, 43, 77, 0.55)',
  },
  cardBody: { padding: spacing.md, gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '900', lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 11, fontWeight: '700' },

  detailImage: { width: '100%', height: 200, borderRadius: radius.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.round,
  },
  metaChipText: { fontSize: 12, fontWeight: '800' },
  description: { fontSize: 14, lineHeight: 21 },
  byline: { fontSize: 11, fontWeight: '700' },
  block: { padding: spacing.lg, gap: 10, borderWidth: 1, borderRadius: radius.lg },
  blockTitle: { fontSize: 16, fontWeight: '900' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bullet: { width: 7, height: 7, borderRadius: 4 },
  ingredientText: { flex: 1, fontSize: 14, lineHeight: 20 },
  stepsBlock: { gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNumber: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  stepNumberText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 21 },
  detailActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  favoriteButton: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  favoriteText: { fontSize: 14, fontWeight: '900' },
  deleteButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.round,
  },
  categoryChipText: { fontSize: 13, fontWeight: '800' },
  numberRow: { flexDirection: 'row', gap: spacing.sm },
  numberField: { flex: 1, gap: 6 },
  tallInput: { minHeight: 120 },
  previewWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  preview: { width: '100%', aspectRatio: 4 / 3 },
  previewRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(23, 43, 77, 0.78)',
  },
  photoButton: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  photoButtonText: { flex: 1, fontWeight: '800' },
});