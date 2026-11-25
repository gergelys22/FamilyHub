import { FeedTab, NewPostModal } from '@/components/community-feed';
import { LiveTab, StartLiveModal } from '@/components/community-live';
import { NewRecipeModal, RecipesTab } from '@/components/community-recipes';
import { EmptyBlock, FormInput, FormLabel, PrimaryButton, Sheet, sharedStyles, type IconName } from '@/components/community-shared';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { useMemories } from '@/hooks/use-memories';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { createMemory } from '@/services/family-content';
import type { FavoriteType } from '@/services/favorites';
import { deleteMemory, updateMemory } from '@/services/memory-manage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = 'memories' | 'feed' | 'recipes' | 'live';
type MemoryView = 'all' | 'photos' | 'videos' | 'events';
type Memory = ReturnType<typeof useMemories>['memories'][number];
type Palette = typeof colors | typeof darkColors;
type FavoriteApi = {
  isFavorite: (type: FavoriteType, id: string) => boolean;
  toggleFavorite: (type: FavoriteType, id: string) => Promise<void>;
};

// Az alsó tabsáv fölött marad a lebegő gomb.
const TAB_BAR_CLEARANCE = 92;

const SECTIONS: {
  key: Section;
  label: string;
  icon: IconName;
  subtitle: string;
  addLabel: string;
  addIcon: IconName;
}[] = [
  {
    key: 'memories',
    label: 'Emlékek',
    icon: 'images-outline',
    subtitle: 'A család közös pillanatai',
    addLabel: 'Új emlék hozzáadása',
    addIcon: 'add',
  },
  {
    key: 'feed',
    label: 'Közösségi',
    icon: 'chatbubbles-outline',
    subtitle: 'Hírek és beszélgetések a családban',
    addLabel: 'Új bejegyzés írása',
    addIcon: 'create',
  },
  {
    key: 'recipes',
    label: 'Receptek',
    icon: 'restaurant-outline',
    subtitle: 'A család közös receptkönyve',
    addLabel: 'Új recept hozzáadása',
    addIcon: 'add',
  },
  {
    key: 'live',
    label: 'Élő',
    icon: 'radio-outline',
    subtitle: 'Közvetítsetek élőben egymásnak',
    addLabel: 'Élő közvetítés indítása',
    addIcon: 'videocam',
  },
];

const MEMORY_FILTERS: { key: MemoryView; label: string; icon: IconName }[] = [
  { key: 'all', label: 'Összes', icon: 'sparkles-outline' },
  { key: 'photos', label: 'Fotók', icon: 'image-outline' },
  { key: 'videos', label: 'Videók', icon: 'videocam-outline' },
  { key: 'events', label: 'Események', icon: 'calendar-outline' },
];

/* ------------------------------------------------------------------ */
/* Fő szekcióváltó                                                     */
/* ------------------------------------------------------------------ */

function SectionTabs({ active, onChange, palette }: { active: Section; onChange: (section: Section) => void; palette: Palette }) {
  return (
    <View
      style={[styles.sectionTabs, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}
      accessibilityRole="tablist"
    >
      {SECTIONS.map(({ key, label, icon }) => {
        const isActive = key === active;
        const content = (
          <>
            <Ionicons name={icon} size={20} color={isActive ? '#FFFFFF' : palette.textSecondary} />
            <Text
              numberOfLines={1}
              style={[styles.sectionTabText, { color: isActive ? '#FFFFFF' : palette.textSecondary }]}
            >
              {label}
            </Text>
          </>
        );
        return (
          <Pressable
            key={key}
            style={styles.sectionTabWrap}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(key)}
          >
            {isActive ? (
              <LinearGradient
                colors={['#2F6BFF', '#1B3FD8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.sectionTab, shadows.floating]}
              >
                {content}
              </LinearGradient>
            ) : (
              <View style={styles.sectionTab}>{content}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Emlékek                                                             */
/* ------------------------------------------------------------------ */

function MemoryEditModal({
  memoryId,
  palette,
  onClose,
  onSaved,
}: {
  memoryId: string;
  palette: Palette;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase
      .from('memories')
      .select('title, description, memory_date, location_name')
      .eq('id', memoryId)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          Alert.alert('Betöltés sikertelen', error?.message ?? 'Az emlék nem található.');
          onClose();
          return;
        }
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setMemoryDate(data.memory_date ?? '');
        setLocation(data.location_name ?? '');
        setLoaded(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoryId]);

  async function save() {
    if (!title.trim()) {
      Alert.alert('Hiányzó adat', 'Add meg az emlék címét.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(memoryDate)) {
      Alert.alert('Hibás dátum', 'A dátum formátuma: ÉÉÉÉ-HH-NN.');
      return;
    }
    setBusy(true);
    try {
      await updateMemory(memoryId, { title, description, memoryDate, locationName: location });
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible onClose={onClose} title="Emlék szerkesztése" icon="images">
      {loaded ? (
        <>
          <FormInput value={title} onChangeText={setTitle} placeholder="Emlék címe" />
          <FormInput value={description} onChangeText={setDescription} placeholder="Leírás (opcionális)" multiline />
          <View style={styles.inputRow}>
            <FormInput value={memoryDate} onChangeText={setMemoryDate} placeholder="ÉÉÉÉ-HH-NN" style={styles.flex} />
            <FormInput value={location} onChangeText={setLocation} placeholder="Helyszín" style={styles.flex} />
          </View>
          <PrimaryButton label="Módosítások mentése" icon="checkmark" busy={busy} onPress={() => void save()} />
        </>
      ) : (
        <ActivityIndicator color={palette.primary} />
      )}
    </Sheet>
  );
}

function MemoryCard({
  item,
  featured = false,
  favorites,
  palette,
  onChanged,
}: {
  item: Memory;
  featured?: boolean;
  favorites: FavoriteApi;
  palette: Palette;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  function confirmDelete() {
    Alert.alert('Emlék törlése', `Törlöd ezt az emléket: ${item.title}? A fotói is törlődnek.`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deleteMemory(item.id)
            .then(onChanged)
            .catch((error) => Alert.alert('Törlés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.')),
      },
    ]);
  }

  function openActions() {
    Alert.alert(item.title, undefined, [
      { text: 'Szerkesztés', onPress: () => setEditing(true) },
      { text: 'Törlés', style: 'destructive', onPress: confirmDelete },
      { text: 'Mégse', style: 'cancel' },
    ]);
  }

  const menu = (onImage: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Emlék műveletei"
      hitSlop={8}
      onPress={openActions}
    >
      <Ionicons name="ellipsis-horizontal" size={onImage ? 22 : 18} color={onImage ? '#FFFFFF' : palette.textMuted} />
    </Pressable>
  );
  const favorite = favorites.isFavorite('memory', item.id);

  const heart = (size: number, onImage: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={favorite ? 'Eltávolítás a kedvencekből' : 'Kedvencnek jelölés'}
      accessibilityState={{ selected: favorite }}
      hitSlop={8}
      onPress={() => void favorites.toggleFavorite('memory', item.id)}
    >
      <Ionicons
        name={favorite ? 'heart' : 'heart-outline'}
        size={size}
        color={favorite ? (onImage ? '#FF6B8B' : palette.danger) : onImage ? '#FFFFFF' : palette.textMuted}
      />
    </Pressable>
  );

  const image = item.photo ? (
    <Image source={{ uri: item.photo }} style={[styles.memoryImage, featured && styles.featuredImage]} />
  ) : (
    <View
      style={[
        styles.memoryImage,
        featured && styles.featuredImage,
        styles.photoPlaceholder,
        { backgroundColor: palette.surfaceMuted },
      ]}
    >
      <Ionicons name="image-outline" size={featured ? 44 : 32} color={palette.textMuted} />
    </View>
  );

  // A gombok a fő Pressable testvérei (nem a gyerekei): weben a <button> nem tartalmazhat másik <button>-t.
  return (
    <View style={[styles.memoryCard, featured && styles.featuredCard]}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} emlék részleteinek megnyitása`}
      onPress={() => router.push({ pathname: '/memory-details', params: { id: item.id } })}
      onLongPress={openActions}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View style={[styles.memoryImageWrap, { backgroundColor: palette.surfaceMuted }]}>
        {image}
        {featured ? (
          <LinearGradient
            pointerEvents="box-none"
            colors={['rgba(0,0,0,0)', 'rgba(8,16,32,0.78)']}
            style={styles.featuredOverlay}
          >
            <View style={styles.featuredText} pointerEvents="none">
              <Text numberOfLines={2} style={styles.featuredTitle}>
                {item.title}
              </Text>
              <Text style={styles.featuredMeta}>{item.when}</Text>
            </View>
          </LinearGradient>
        ) : null}
        {item.extraPhotos > 0 && (
          <View style={styles.photoBadge}>
            <Ionicons name="images-outline" size={12} color="#FFFFFF" />
            <Text style={styles.photoBadgeText}>+{item.extraPhotos}</Text>
          </View>
        )}
      </View>

      {!featured ? (
        <View style={styles.memoryInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: palette.textMuted }]}>{item.when}</Text>
        </View>
      ) : null}
    </Pressable>
    <View style={[styles.cardActions, { top: featured ? 196 : 116 }]}>
      {menu(true)}
      {heart(20, true)}
    </View>
    {editing ? (
      <MemoryEditModal memoryId={item.id} palette={palette} onClose={() => setEditing(false)} onSaved={onChanged} />
    ) : null}
    </View>
  );
}

function TimelineView({
  favorites,
  palette,
  onCompose,
  onChanged,
}: {
  favorites: FavoriteApi;
  palette: Palette;
  onCompose: () => void;
  onChanged: () => void;
}) {
  const { memories, loading, hasMore, error, loadMore } = useMemories();

  return (
    <View>
      {memories.length > 0 && <MemoryCard item={memories[0]} featured favorites={favorites} palette={palette} onChanged={onChanged} />}
      <View style={styles.memoryGrid}>
        {memories.slice(1).map((memory) => (
          <MemoryCard key={memory.id} item={memory} favorites={favorites} palette={palette} onChanged={onChanged} />
        ))}
      </View>

      {loading && memories.length === 0 ? (
        <ActivityIndicator color={palette.primary} size="large" style={styles.loader} />
      ) : null}

      {!loading && !error && memories.length === 0 && (
        <EmptyBlock
          icon="images-outline"
          title="Még nincs emlék"
          text="Add hozzá az elsőt, és a család minden tagja látni fogja."
          action={{ label: 'Első emlék hozzáadása', onPress: onCompose }}
        />
      )}
      {!!error && <EmptyBlock icon="alert-circle-outline" title="Hiba történt" text={String(error)} />}

      {hasMore && memories.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.loadMore,
            { backgroundColor: palette.surfaceElevated },
            pressed && styles.pressed,
          ]}
          onPress={loadMore}
          disabled={loading}
        >
          <Text style={[styles.loadMoreText, { color: palette.textSecondary }]}>
            {loading ? 'Betöltés…' : 'További emlékek betöltése'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={palette.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

export function MemoryScreenOptions({
  refreshToken,
  favorites,
  palette,
  onCompose,
  onChanged,
}: {
  refreshToken: number;
  favorites: FavoriteApi;
  palette: Palette;
  onCompose: () => void;
  onChanged: () => void;
}) {
  const [active, setActive] = useState<MemoryView>('all');

  return (
    <View style={styles.memoryOptions}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {MEMORY_FILTERS.map(({ key, label, icon }) => {
          const isActive = key === active;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setActive(key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? palette.primary : palette.surface,
                  borderColor: isActive ? palette.primary : palette.border,
                },
              ]}
            >
              <Ionicons name={icon} size={15} color={isActive ? '#FFFFFF' : palette.textSecondary} />
              <Text style={[styles.filterText, { color: isActive ? '#FFFFFF' : palette.textSecondary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {active === 'videos' ? (
        <EmptyBlock icon="videocam-outline" title="Még nincs videó" text="A videós emlékek hamarosan elérhetők." />
      ) : (
        <TimelineView key={`${active}-${refreshToken}`} favorites={favorites} palette={palette} onCompose={onCompose} onChanged={onChanged} />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Új emlék                                                            */
/* ------------------------------------------------------------------ */

function NewMemoryModal({
  visible,
  onClose,
  onSaved,
  palette,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  palette: Palette;
}) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // A résztvevők listája megnyitáskor töltődik be.
  useEffect(() => {
    if (!visible) return;
    let active = true;
    void getMyFamilies()
      .then((families) => (families[0] ? getFamilyMembers(families[0].id) : []))
      .then((members) => {
        if (active) setFamilyMembers(members);
      })
      .catch((error) => {
        if (active) Alert.alert('Hiba', error instanceof Error ? error.message : 'A családtagok betöltése sikertelen.');
      });
    return () => {
      active = false;
    };
  }, [visible]);

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Engedély szükséges', 'A fotó kiválasztásához engedélyezd a fotókönyvtár hozzáférést.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) setPhotos(result.assets);
  }

  function toggleParticipant(profileId: string) {
    setSelectedParticipants((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  async function saveMemory() {
    if (!profile?.id || !title.trim()) {
      Alert.alert('Hiányzó adat', 'Add meg az emlék címét.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(memoryDate)) {
      Alert.alert('Hibás dátum', 'A dátum formátuma: ÉÉÉÉ-HH-NN.');
      return;
    }
    setBusy(true);
    const uploadedPaths: string[] = [];
    try {
      const families = await getMyFamilies();
      const familyId = families[0]?.id;
      if (!familyId) throw new Error('Nincs kiválasztott családi kör.');
      const uploadedMedia: { storagePath: string; mimeType?: string; fileSizeBytes?: number }[] = [];
      for (const asset of photos) {
        const path = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${asset.fileName?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'memory.jpg'}`;
        const body = await (await fetch(asset.uri)).arrayBuffer();
        const { error } = await supabase.storage.from('memories').upload(path, body, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        });
        if (error) throw new Error(error.message);
        uploadedPaths.push(path);
        uploadedMedia.push({ storagePath: path, mimeType: asset.mimeType, fileSizeBytes: asset.fileSize });
      }
      await createMemory({
        familyId,
        profileId: profile.id,
        title,
        description,
        memoryDate,
        locationName: location,
        media: uploadedMedia,
        participantProfileIds: selectedParticipants,
      });
      setTitle('');
      setDescription('');
      setLocation('');
      setPhotos([]);
      setSelectedParticipants([]);
      onSaved();
      onClose();
    } catch (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from('memories').remove(uploadedPaths);
      }
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Új emlék" icon="images">
      <FormInput value={title} onChangeText={setTitle} placeholder="Emlék címe" />
      <FormInput
        value={description}
        onChangeText={setDescription}
        placeholder="Leírás (opcionális)"
        multiline
      />
      <View style={styles.inputRow}>
        <FormInput
          value={memoryDate}
          onChangeText={setMemoryDate}
          placeholder="ÉÉÉÉ-HH-NN"
          style={styles.flex}
        />
        <FormInput value={location} onChangeText={setLocation} placeholder="Helyszín" style={styles.flex} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void choosePhoto()}
        style={({ pressed }) => [styles.photoButton, { backgroundColor: palette.primarySoft }, pressed && styles.pressed]}
      >
        <Ionicons name={photos.length ? 'checkmark-circle' : 'image-outline'} size={20} color={palette.primary} />
        <Text style={[styles.photoButtonText, { color: palette.primary }]}>
          {photos.length ? `${photos.length} fotó kiválasztva` : 'Fotók kiválasztása (opcionális)'}
        </Text>
      </Pressable>

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {photos.map((asset) => (
            <Image key={asset.uri} source={{ uri: asset.uri }} style={styles.thumb} />
          ))}
        </ScrollView>
      ) : null}

      {familyMembers.length > 0 ? (
        <>
          <FormLabel>Kik voltak jelen?</FormLabel>
          <View style={styles.participantList}>
            {familyMembers.map((member) => {
              const selected = selectedParticipants.includes(member.profile_id);
              return (
                <Pressable
                  key={member.profile_id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleParticipant(member.profile_id)}
                  style={[styles.participantChip, { backgroundColor: selected ? palette.primary : palette.surfaceElevated }]}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selected ? '#FFFFFF' : palette.textMuted}
                  />
                  <Text style={[styles.participantText, { color: selected ? '#FFFFFF' : palette.textPrimary }]}>
                    {member.nickname?.trim() || member.display_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <PrimaryButton label="Mentés" icon="checkmark" busy={busy} onPress={() => void saveMemory()} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Képernyő                                                            */
/* ------------------------------------------------------------------ */

export default function CommunitySpaceScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const favorites = useFavorites();
  const [section, setSection] = useState<Section>('memories');
  const [composer, setComposer] = useState<Section | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  const current = SECTIONS.find((item) => item.key === section) ?? SECTIONS[0];

  function refresh() {
    setRefreshToken((value) => value + 1);
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
        <LinearGradient
          pointerEvents="none"
          colors={isDark ? ['#12335A', '#071A3300'] : ['#E7F0FF', '#F6F9FF00']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.backgroundGlow}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <View style={styles.flex}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>Közösségi tér</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{current.subtitle}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Közösségi tér műveletei"
              accessibilityState={{ expanded: menuVisible }}
              onPress={() => setMenuVisible(true)}
              style={({ pressed }) => [
                styles.moreButton,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={palette.primary} />
            </Pressable>
          </View>

          <SectionTabs active={section} onChange={setSection} palette={palette} />

          <View style={styles.body}>
            {section === 'memories' ? (
              <MemoryScreenOptions
                refreshToken={refreshToken}
                favorites={favorites}
                palette={palette}
                onCompose={() => setComposer('memories')}
                onChanged={refresh}
              />
            ) : null}
            {section === 'feed' ? (
              <FeedTab refreshToken={refreshToken} onCompose={() => setComposer('feed')} favorites={favorites} />
            ) : null}
            {section === 'recipes' ? (
              <RecipesTab refreshToken={refreshToken} onCompose={() => setComposer('recipes')} favorites={favorites} />
            ) : null}
            {section === 'live' ? (
              <LiveTab refreshToken={refreshToken} onStart={() => setComposer('live')} />
            ) : null}
          </View>
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={current.addLabel}
          onPress={() => setComposer(section)}
          style={({ pressed }) => [
            styles.floatingAdd,
            { backgroundColor: section === 'live' ? '#E5384F' : palette.primary },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name={current.addIcon} size={section === 'live' ? 26 : 31} color="#FFFFFF" />
        </Pressable>

        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menü bezárása"
              onPress={() => setMenuVisible(false)}
              style={styles.menuBackdrop}
            />
            <View style={[styles.menuCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.menuTitle, { color: palette.textPrimary }]}>Közösségi tér</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  refresh();
                  setMenuVisible(false);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: palette.surfaceMuted }]}
              >
                <Ionicons name="refresh-outline" size={21} color={palette.primary} />
                <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>Frissítés</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuVisible(false);
                  setComposer(section);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: palette.surfaceMuted }]}
              >
                <Ionicons name="add-circle-outline" size={21} color={palette.primary} />
                <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>{current.addLabel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuVisible(false);
                  router.push('/favorites' as never);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: palette.surfaceMuted }]}
              >
                <Ionicons name="heart-outline" size={21} color={palette.primary} />
                <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>Kedvenceim</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuVisible(false)}
                style={({ pressed }) => [styles.menuCancel, { borderTopColor: palette.border }, pressed && styles.pressed]}
              >
                <Text style={[styles.menuCancelText, { color: palette.textMuted }]}>Mégse</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <NewMemoryModal
          visible={composer === 'memories'}
          onClose={() => setComposer(null)}
          onSaved={refresh}
          palette={palette}
        />
        <NewPostModal visible={composer === 'feed'} onClose={() => setComposer(null)} onSaved={refresh} />
        <NewRecipeModal visible={composer === 'recipes'} onClose={() => setComposer(null)} onSaved={refresh} />
        <StartLiveModal visible={composer === 'live'} onClose={() => setComposer(null)} />
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Stílusok                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE + 90 },
  backgroundGlow: {
    position: 'absolute',
    top: 72,
    right: 0,
    width: '68%',
    height: 230,
    opacity: 0.72,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: 2, fontSize: 13, fontWeight: '700' },
  moreButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { marginTop: spacing.lg },

  sectionTabs: {
    marginTop: spacing.lg,
    padding: 4,
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  sectionTabWrap: { flex: 1 },
  sectionTab: {
    minHeight: 56,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radius.lg,
  },
  sectionTabText: { fontSize: 11, fontWeight: '800' },

  memoryOptions: { gap: spacing.lg },
  filterRow: { gap: spacing.sm, paddingRight: spacing.md },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.round,
  },
  filterText: { fontSize: 12, fontWeight: '800' },

  memoryCard: { width: '48.5%', marginBottom: spacing.lg },
  featuredCard: { width: '100%', marginBottom: spacing.lg },
  memoryImageWrap: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    ...shadows.card,
  },
  memoryImage: { width: '100%', height: 156 },
  featuredImage: { height: 236 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  featuredOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 48,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  featuredText: { flex: 1, gap: 2, paddingRight: 96 },
  featuredTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  featuredMeta: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' },
  photoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.round,
    backgroundColor: 'rgba(23, 43, 77, 0.76)',
  },
  photoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  memoryInfo: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm, gap: 2 },
  cardActions: {
    position: 'absolute',
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.round,
    backgroundColor: 'rgba(8,16,32,0.45)',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  metaText: { fontSize: 12, fontWeight: '600' },

  loader: { paddingVertical: 60 },
  loadMore: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    borderRadius: radius.lg,
  },
  loadMoreText: { fontSize: 13, fontWeight: '700' },

  floatingAdd: {
    position: 'absolute',
    right: spacing.lg,
    bottom: TAB_BAR_CLEARANCE,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    ...shadows.floating,
  },

  menuOverlay: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 58,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(7, 17, 35, 0.35)',
  },
  menuBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menuCard: {
    width: 270,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
    ...shadows.card,
  },
  menuTitle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '900',
  },
  menuItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  menuItemText: { flex: 1, fontSize: 14, fontWeight: '700' },
  menuCancel: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuCancelText: { fontSize: 13, fontWeight: '800' },

  inputRow: { flexDirection: 'row', gap: spacing.sm },
  photoButton: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  photoButtonText: { flex: 1, fontWeight: '800' },
  thumbs: { gap: spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  participantList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  participantChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.round,
  },
  participantText: { fontWeight: '700' },
  pressed: sharedStyles.pressed,
});