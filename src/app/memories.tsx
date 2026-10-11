import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useMemories } from '@/hooks/use-memories';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { getMyFamilies } from '@/services/families';
import { getFamilyMembers, type FamilyMember } from '@/services/families';
import { createMemory } from '@/services/family-content';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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
  const [refreshToken, setRefreshToken] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
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
      setPhoto(result.assets[0] ?? null);
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
    setSelectedParticipants((current) => current.includes(profileId)
      ? current.filter((id) => id !== profileId)
      : [...current, profileId]);
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
      setPhoto(null);
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Emlékek műveletei"
              accessibilityState={{ expanded: menuVisible }}
              onPress={() => setMenuVisible(true)}
              style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <MemoryScreenOptions refreshToken={refreshToken} />
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Új emlék hozzáadása"
          onPress={() => void openCreateModal()}
          style={({ pressed }) => [styles.floatingAdd, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={31} color={colors.white} />
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
            <View style={styles.menuCard}>
              <Text style={styles.menuTitle}>Emlékek műveletei</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRefreshToken((current) => current + 1);
                  setMenuVisible(false);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              >
                <Ionicons name="refresh-outline" size={21} color={colors.primary} />
                <Text style={styles.menuItemText}>Emlékek frissítése</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuVisible(false);
                  void openCreateModal();
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              >
                <Ionicons name="add-circle-outline" size={21} color={colors.primary} />
                <Text style={styles.menuItemText}>Új emlék hozzáadása</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuVisible(false)}
                style={({ pressed }) => [styles.menuCancel, pressed && styles.pressed]}
              >
                <Text style={styles.menuCancelText}>Mégse</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Új emlék</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Emlék címe" placeholderTextColor={colors.textMuted} style={styles.modalInput} />
              <TextInput value={description} onChangeText={setDescription} placeholder="Leírás (opcionális)" placeholderTextColor={colors.textMuted} style={[styles.modalInput, styles.descriptionInput]} multiline />
              <TextInput value={memoryDate} onChangeText={setMemoryDate} placeholder="2026-10-11" placeholderTextColor={colors.textMuted} style={styles.modalInput} />
              <TextInput value={location} onChangeText={setLocation} placeholder="Helyszín (opcionális)" placeholderTextColor={colors.textMuted} style={styles.modalInput} />
              <Pressable onPress={() => void choosePhoto()} style={styles.photoButton}>
                <Ionicons name={photo ? 'checkmark-circle' : 'image-outline'} size={20} color={colors.primary} />
                <Text style={styles.photoButtonText}>{photos.length ? `${photos.length} fotó kiválasztva` : 'Fotók kiválasztása (opcionális)'}</Text>
              </Pressable>
              <Text style={styles.participantLabel}>Kik voltak jelen?</Text>
              <View style={styles.participantList}>
                {familyMembers.map((member) => {
                  const selected = selectedParticipants.includes(member.profile_id);
                  return <Pressable key={member.profile_id} onPress={() => toggleParticipant(member.profile_id)} style={[styles.participantChip, selected && styles.participantChipSelected]}><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? colors.white : colors.textMuted} /><Text style={[styles.participantText, selected && styles.participantTextSelected]}>{member.nickname?.trim() || member.display_name}</Text></Pressable>;
                })}
              </View>
              <View style={styles.modalActions}>
                <Pressable onPress={() => setVisible(false)} style={styles.cancelButton}><Text>Mégse</Text></Pressable>
                <Pressable disabled={busy} onPress={() => void saveMemory()} style={styles.saveButton}><Text style={styles.saveButtonText}>{busy ? 'Mentés…' : 'Mentés'}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  menuOverlay: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 58,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(7, 17, 35, 0.22)',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menuCard: {
    width: 250,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
    zIndex: 1,
  },
  menuTitle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
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
  menuItemText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  menuCancel: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuCancelText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 43, 77, 0.42)',
  },
  modal: {
    padding: spacing.xl,
    gap: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900' },
  modalInput: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  descriptionInput: {
    minHeight: 92,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  photoButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  photoButtonText: { flex: 1, color: colors.primary, fontWeight: '700' },
  participantLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  participantList: { gap: spacing.xs, maxHeight: 140 },
  participantChip: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  participantChipSelected: { backgroundColor: colors.primary },
  participantText: { color: colors.textPrimary, fontWeight: '700' },
  participantTextSelected: { color: colors.white },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  cancelButton: { padding: spacing.md },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveButtonText: { color: colors.white, fontWeight: '900' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
