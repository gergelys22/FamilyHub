import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useMemories } from '@/hooks/use-memories';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { createMemory } from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type MemoryView = 'all' | 'photos' | 'videos' | 'events';
type Memory = ReturnType<typeof useMemories>['memories'][number];
type Palette = typeof colors | typeof darkColors;

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
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  return (
    <View style={[styles.tabs, { backgroundColor: palette.surfaceElevated }]} accessibilityRole="tablist">
      {TABS.map(({ key, label, icon }) => {
        const isActive = key === active;
        const content = (
          <>
            <Ionicons name={icon} size={18} color={isActive ? '#FFFFFF' : palette.textSecondary} />
            <Text
              numberOfLines={1}
              style={[styles.tabText, { color: isActive ? '#FFFFFF' : palette.textSecondary }]}
            >
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
                style={[styles.tab, shadows.floating]}
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
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

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
      <View style={[styles.memoryImageWrap, { backgroundColor: palette.surfaceMuted }]}>
        {image}
        {featured ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(8,16,32,0.78)']}
            style={styles.featuredOverlay}
          >
            <View style={styles.featuredText}>
              <Text numberOfLines={2} style={styles.featuredTitle}>
                {item.title}
              </Text>
              <Text style={styles.featuredMeta}>{item.when}</Text>
            </View>
            <Ionicons name="heart" size={22} color="#FF6B8B" />
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
            <Ionicons name="heart" size={15} color={palette.danger} />
          </View>
          <Text style={[styles.metaText, { color: palette.textMuted }]}>{item.when}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  text,
  palette,
}: {
  icon: IconName;
  title: string;
  text?: string;
  palette: Palette;
}) {
  return (
    <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name={icon} size={28} color={palette.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>{title}</Text>
      {text ? <Text style={[styles.emptyText, { color: palette.textMuted }]}>{text}</Text> : null}
    </View>
  );
}

function TimelineView() {
  const { memories, loading, hasMore, error, loadMore } = useMemories();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;

  return (
    <View>
      {memories.length > 0 && <MemoryCard item={memories[0]} featured />}
      <View style={styles.memoryGrid}>
        {memories.slice(1).map((m) => (
          <MemoryCard key={m.id} item={m} />
        ))}
      </View>

      {loading && memories.length === 0 ? (
        <ActivityIndicator color={palette.primary} size="large" style={styles.loader} />
      ) : null}

      {!loading && !error && memories.length === 0 && (
        <EmptyState
          icon="images-outline"
          title="Még nincs emlék"
          text="Add hozzá az elsőt a + gombbal!"
          palette={palette}
        />
      )}
      {!!error && (
        <EmptyState icon="alert-circle-outline" title="Hiba történt" text={String(error)} palette={palette} />
      )}

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

/* ------------------------------------------------------------------ */
/* Egyelőre üres nézetek                                               */
/* ------------------------------------------------------------------ */

function EmptyMemoryView({ label }: { label: string }) {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  return <EmptyState icon="videocam-outline" title={label} text="Ez a rész hamarosan elérhető." palette={palette} />;
}

/* ------------------------------------------------------------------ */
/* Váltó + tartalom                                                    */
/* ------------------------------------------------------------------ */

export function MemoryScreenOptions({ refreshToken }: { refreshToken: number }) {
  const [active, setActive] = useState<MemoryView>('all');

  return (
    <View style={styles.options}>
      <MemoryTabs active={active} onChange={setActive} />
      {active === 'all' && <TimelineView key={`all-${refreshToken}`} />}
      {active === 'photos' && <TimelineView key={`photos-${refreshToken}`} />}
      {active === 'videos' && <EmptyMemoryView label="Még nincs videó." />}
      {active === 'events' && <TimelineView key={`events-${refreshToken}`} />}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Képernyő                                                            */
/* ------------------------------------------------------------------ */

export default function MemoriesScreen() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const [refreshToken, setRefreshToken] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

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
    if (!result.canceled) {
      setPhotos(result.assets);
    }
  }

  async function openCreateModal() {
    try {
      const families = await getMyFamilies();
      const familyId = families[0]?.id;
      if (familyId) setFamilyMembers(await getFamilyMembers(familyId));
    } catch (error) {
      Alert.alert('Hiba', error instanceof Error ? error.message : 'A családtagok betöltése sikertelen.');
    }
    setVisible(true);
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
      setVisible(false);
      setRefreshToken((current) => current + 1);
      setTitle('');
      setDescription('');
      setLocation('');
      setPhotos([]);
      setSelectedParticipants([]);
    } catch (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from('memories').remove(uploadedPaths);
      }
      Alert.alert('Mentés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [styles.modalInput, { backgroundColor: palette.surfaceElevated, color: palette.textPrimary }];

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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeader}>
            <View>
              <Text style={[styles.title, { color: palette.textPrimary }]}>Emlékek</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
                A család közös pillanatai
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Emlékek műveletei"
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

          <MemoryScreenOptions refreshToken={refreshToken} />
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Új emlék hozzáadása"
          onPress={() => void openCreateModal()}
          style={({ pressed }) => [styles.floatingAdd, { backgroundColor: palette.primary }, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={31} color="#FFFFFF" />
        </Pressable>

        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <View style={styles.menuOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menü bezárása"
              onPress={() => setMenuVisible(false)}
              style={styles.menuBackdrop}
            />
            <View style={[styles.menuCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.menuTitle, { color: palette.textPrimary }]}>Emlékek műveletei</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRefreshToken((current) => current + 1);
                  setMenuVisible(false);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: palette.surfaceMuted }]}
              >
                <Ionicons name="refresh-outline" size={21} color={palette.primary} />
                <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>Emlékek frissítése</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuVisible(false);
                  void openCreateModal();
                }}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: palette.surfaceMuted }]}
              >
                <Ionicons name="add-circle-outline" size={21} color={palette.primary} />
                <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>Új emlék hozzáadása</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuVisible(false)}
                style={({ pressed }) => [
                  styles.menuCancel,
                  { borderTopColor: palette.border },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.menuCancelText, { color: palette.textMuted }]}>Mégse</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ablak bezárása"
              onPress={() => setVisible(false)}
              style={styles.menuBackdrop}
            />
            <View style={[styles.modal, { backgroundColor: palette.surface }]}>
              <View style={[styles.handle, { backgroundColor: palette.border }]} />
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Új emlék</Text>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Emlék címe"
                  placeholderTextColor={palette.textMuted}
                  style={inputStyle}
                />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Leírás (opcionális)"
                  placeholderTextColor={palette.textMuted}
                  style={[inputStyle, styles.descriptionInput]}
                  multiline
                />
                <View style={styles.inputRow}>
                  <TextInput
                    value={memoryDate}
                    onChangeText={setMemoryDate}
                    placeholder="ÉÉÉÉ-HH-NN"
                    placeholderTextColor={palette.textMuted}
                    style={[inputStyle, styles.flex]}
                  />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Helyszín"
                    placeholderTextColor={palette.textMuted}
                    style={[inputStyle, styles.flex]}
                  />
                </View>

                <Pressable
                  onPress={() => void choosePhoto()}
                  style={({ pressed }) => [
                    styles.photoButton,
                    { backgroundColor: palette.primarySoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={photos.length ? 'checkmark-circle' : 'image-outline'}
                    size={20}
                    color={palette.primary}
                  />
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
                    <Text style={[styles.participantLabel, { color: palette.textPrimary }]}>Kik voltak jelen?</Text>
                    <View style={styles.participantList}>
                      {familyMembers.map((member) => {
                        const selected = selectedParticipants.includes(member.profile_id);
                        return (
                          <Pressable
                            key={member.profile_id}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                            onPress={() => toggleParticipant(member.profile_id)}
                            style={[
                              styles.participantChip,
                              { backgroundColor: selected ? palette.primary : palette.surfaceElevated },
                            ]}
                          >
                            <Ionicons
                              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                              size={18}
                              color={selected ? '#FFFFFF' : palette.textMuted}
                            />
                            <Text
                              style={[
                                styles.participantText,
                                { color: selected ? '#FFFFFF' : palette.textPrimary },
                              ]}
                            >
                              {member.nickname?.trim() || member.display_name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <View style={styles.modalActions}>
                  <Pressable onPress={() => setVisible(false)} style={styles.cancelButton}>
                    <Text style={[styles.cancelText, { color: palette.textSecondary }]}>Mégse</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() => void saveMemory()}
                    style={({ pressed }) => [
                      styles.saveButton,
                      { backgroundColor: palette.primary },
                      busy && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.saveButtonText}>{busy ? 'Mentés…' : 'Mentés'}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 112 },
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
  options: { width: '100%', marginTop: spacing.lg, gap: spacing.lg },

  tabs: { flexDirection: 'row', padding: 4, borderRadius: radius.round },
  tabWrap: { flex: 1 },
  tab: {
    minHeight: 42,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.round,
  },
  tabText: { fontSize: 12, fontWeight: '800' },

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
  featuredText: { flex: 1, gap: 2 },
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  metaText: { fontSize: 12, fontWeight: '600' },

  loader: { paddingVertical: 60 },
  empty: {
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
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
    bottom: 92,
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
    width: 260,
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
  menuItemText: { fontSize: 14, fontWeight: '700' },
  menuCancel: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuCancelText: { fontSize: 13, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 43, 77, 0.5)',
  },
  modal: {
    maxHeight: '90%',
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalContent: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalInput: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  descriptionInput: { minHeight: 92, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  photoButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  photoButtonText: { flex: 1, fontWeight: '700' },
  thumbs: { gap: spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  participantLabel: { fontSize: 14, fontWeight: '900' },
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
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: { padding: spacing.md },
  cancelText: { fontWeight: '700' },
  saveButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '900' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});