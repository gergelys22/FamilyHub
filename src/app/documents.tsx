import { ActionSheet, ConfirmDialog, type SheetAction } from '@/components/action-sheet';
import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  getFamilyMembers,
  getMyFamilies,
  type FamilyMember,
} from '@/services/families';
import {
  createFamilyDocument,
  deleteFamilyDocument,
  getFamilyDocuments,
  type FamilyDocument,
} from '@/services/family-content';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const DOCUMENT_TYPES = [
  { value: 'szemelyi', label: 'Személyi', icon: 'card-outline' as const, color: '#5685E8' },
  { value: 'biztositas', label: 'Biztosítás', icon: 'shield-checkmark-outline' as const, color: '#20A88A' },
  { value: 'orvosi', label: 'Orvosi', icon: 'medkit-outline' as const, color: '#E46D82' },
  { value: 'iskola', label: 'Iskola', icon: 'school-outline' as const, color: '#A17AE8' },
  { value: 'egyeb', label: 'Egyéb', icon: 'document-text-outline' as const, color: '#8995A8' },
] as const;

const TYPE_FILTERS = [
  { value: 'all', label: 'Mind' },
  ...DOCUMENT_TYPES.map(({ value, label }) => ({ value, label })),
];

type Palette = typeof colors | typeof darkColors;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatSize(bytes: number | null) {
  if (!bytes) return 'Ismeretlen méret';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentType(type: string) {
  return DOCUMENT_TYPES.find((item) => item.value === type) ?? DOCUMENT_TYPES[4];
}

function getExpiryStatus(expiresAt: string | null, now: number) {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt).getTime();
  const days = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));

  if (days < 0) {
    return {
      label: 'Lejárt',
      color: '#E05260',
      icon: 'alert-circle-outline' as const,
    };
  }

  if (days <= 30) {
    return {
      label: days === 0 ? 'Ma lejár' : `${days} nap múlva lejár`,
      color: '#D99536',
      icon: 'time-outline' as const,
    };
  }

  return {
    label: 'Érvényes',
    color: '#20A88A',
    icon: 'checkmark-circle-outline' as const,
  };
}

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isDark } = useTheme();

  const palette: Palette = isDark ? darkColors : colors;

  const styles = useMemo(
    () => createStyles(palette, isDark),
    [palette, isDark],
  );

  const input = useRef<TextInput>(null);

  const [familyId, setFamilyId] = useState<string | null>(null);
  const [items, setItems] = useState<FamilyDocument[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [menuTarget, setMenuTarget] = useState<FamilyDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyDocument | null>(null);

  function notify(title: string, message: string) {
    setNotice({ title, message });
  }

  const [search, setSearch] = useState('');
  const [now] = useState(() => Date.now());

  const [metadataVisible, setMetadataVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  const [pendingFile, setPendingFile] = useState<{
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
  } | null>(null);

  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('egyeb');
  const [tagsText, setTagsText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [relatedProfileId, setRelatedProfileId] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(false);

  const [typeFilter, setTypeFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'valid' | 'expired' | 'soon'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'expiry' | 'size'>('newest');

  async function reload(id = familyId) {
    if (!id) return;
    setItems(await getFamilyDocuments(id));
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const families = await getMyFamilies();
        const id = families[0]?.id ?? null;

        if (!active) return;

        setFamilyId(id);

        if (!id) return;

        const [familyMembers, documents] = await Promise.all([
          getFamilyMembers(id),
          getFamilyDocuments(id),
        ]);

        if (!active) return;

        setMembers(familyMembers);
        setItems(documents);
      } catch (error) {
        if (active) {
          notify(
            'Betöltési hiba',
            errorMessage(error, 'A dokumentumok betöltése sikertelen.'),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function upload() {
    if (!familyId || !profile?.id || busy) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      if (!file.size || file.size > 50 * 1024 * 1024) {
        throw new Error('A fájl mérete legfeljebb 50 MB lehet.');
      }

      setPendingFile({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      });

      setDocumentName(file.name.replace(/\.[^.]+$/, ''));
      setDocumentType('egyeb');
      setTagsText('');
      setExpiresAt('');
      setShowDatePicker(false);
      setRelatedProfileId(null);
      setRestricted(false);
      setMetadataVisible(true);
    } catch (error) {
      notify(
        'Fájl kiválasztása sikertelen',
        errorMessage(error, 'Próbáld újra.'),
      );
    }
  }

  async function saveDocument() {
    if (!familyId || !profile?.id || !pendingFile || busy) return;

    if (!documentName.trim()) {
      notify('Hiányzó adat', 'Adj meg egy dokumentumnevet.');
      return;
    }

    let parsedExpiry: string | null = null;

    if (expiresAt.trim()) {
      const dateString = expiresAt.trim();
      const date = new Date(`${dateString}T12:00:00`);

      if (
        Number.isNaN(date.getTime()) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
        date.toISOString().slice(0, 10) !== dateString
      ) {
        notify(
          'Hibás lejárati dátum',
          'Válassz egy érvényes dátumot a naptárból.',
        );
        return;
      }

      parsedExpiry = date.toISOString();
    }

    setBusy(true);

    let uploadedPath: string | null = null;

    try {
      const path = `${profile.id}/${Date.now()}-${pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const body = await (await fetch(pendingFile.uri)).arrayBuffer();

      const { error } = await supabase.storage
        .from('family-documents')
        .upload(path, body, {
          contentType: pendingFile.mimeType ?? 'application/octet-stream',
          upsert: false,
        });

      if (error) throw new Error(error.message);

      uploadedPath = path;

      const tags = tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      await createFamilyDocument({
        familyId,
        profileId: profile.id,
        name: documentName.trim(),
        storagePath: path,
        mimeType: pendingFile.mimeType,
        sizeBytes: pendingFile.size,
        documentType,
        tags,
        expiresAt: parsedExpiry,
        relatedProfileId,
        restricted,
      });

      setMetadataVisible(false);
      setPendingFile(null);
      setShowDatePicker(false);

      await reload();

      notify('Sikeres feltöltés', 'A dokumentum bekerült a családi tárba.');
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from('family-documents')
          .remove([uploadedPath]);
      }

      notify(
        'Feltöltés sikertelen',
        errorMessage(error, 'Próbáld újra.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function open(item: FamilyDocument) {
    try {
      const { data, error } = await supabase.storage
        .from('family-documents')
        .createSignedUrl(item.storage_path, 300);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? 'A fájl nem érhető el.');
      }

      await Linking.openURL(data.signedUrl);
    } catch (error) {
      notify(
        'Nem sikerült megnyitni',
        errorMessage(error, 'A dokumentum jelenleg nem érhető el.'),
      );
    }
  }

  async function confirmDelete() {
    const item = deleteTarget;
    if (!item) return;
    setDeleteTarget(null);

    try {
      await deleteFamilyDocument(item);
      await reload();
    } catch (error) {
      notify('Törlési hiba', errorMessage(error, 'A törlés sikertelen.'));
    }
  }

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          key: 'open',
          label: 'Megnyitás',
          icon: 'open-outline',
          onPress: () => {
            const item = menuTarget;
            setMenuTarget(null);
            setTimeout(() => void open(item), 250);
          },
        },
        {
          key: 'delete',
          label: 'Törlés',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => {
            const item = menuTarget;
            setMenuTarget(null);
            setTimeout(() => setDeleteTarget(item), 250);
          },
        },
      ]
    : [];

  const noticeDialog = (
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
  );

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (expiryFilter !== 'all' ? 1 : 0) +
    (sizeFilter !== 'all' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('hu-HU');

    return [...items]
      .filter((item) => {
        const memberName =
          members.find((member) => member.profile_id === item.related_profile_id)
            ?.nickname ??
          members.find((member) => member.profile_id === item.related_profile_id)
            ?.display_name ??
          '';

        const searchable = [
          item.name,
          item.document_type,
          ...(item.tags ?? []),
          memberName,
        ]
          .join(' ')
          .toLocaleLowerCase('hu-HU');

        if (!searchable.includes(needle)) return false;

        if (typeFilter !== 'all' && item.document_type !== typeFilter) {
          return false;
        }

        const kb = (item.size_bytes ?? 0) / 1024;

        if (sizeFilter === 'small' && kb >= 500) return false;
        if (sizeFilter === 'medium' && (kb < 500 || kb >= 5000)) return false;
        if (sizeFilter === 'large' && kb < 5000) return false;

        if (expiryFilter !== 'all') {
          if (!item.expires_at) {
            if (expiryFilter !== 'valid') return false;
          } else {
            const expiry = new Date(item.expires_at).getTime();
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;

            if (expiryFilter === 'expired' && expiry >= now) return false;
            if (expiryFilter === 'valid' && expiry < now) return false;
            if (
              expiryFilter === 'soon' &&
              (expiry < now || expiry > now + thirtyDays)
            ) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'hu');

        if (sortBy === 'size') {
          return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
        }

        if (sortBy === 'expiry') {
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;

          return (
            new Date(a.expires_at).getTime() -
            new Date(b.expires_at).getTime()
          );
        }

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });
  }, [
    items,
    members,
    search,
    typeFilter,
    expiryFilter,
    sizeFilter,
    sortBy,
    now,
  ]);

  function clearFilters() {
    setTypeFilter('all');
    setExpiryFilter('all');
    setSizeFilter('all');
    setSortBy('newest');
  }

  function renderDocument(item: FamilyDocument) {
    const type = getDocumentType(item.document_type);
    const expiry = getExpiryStatus(item.expires_at, now);

    const member = members.find(
      (entry) => entry.profile_id === item.related_profile_id,
    );

    return (
      <View key={item.id} style={styles.documentCard}>
      <Pressable
        onPress={() => void open(item)}
        onLongPress={() => setMenuTarget(item)}
        style={({ pressed }) => [
          styles.documentMain,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} megnyitása`}
      >
        <View style={[styles.documentIcon, { backgroundColor: `${type.color}18` }]}>
          <Ionicons name={type.icon} size={25} color={type.color} />
        </View>

        <View style={styles.documentInfo}>
          <View style={styles.documentTitleRow}>
            <Text
              style={[styles.documentName, { color: palette.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            {item.restricted ? (
              <Ionicons
                name="lock-closed"
                size={15}
                color={palette.danger}
              />
            ) : null}
          </View>

          <Text style={[styles.documentMeta, { color: palette.textMuted }]}>
            {type.label} · {formatSize(item.size_bytes)}
          </Text>

          <View style={styles.documentBottomRow}>
            {member ? (
              <View style={[styles.memberBadge, { backgroundColor: palette.surfaceElevated }]}>
                <Ionicons
                  name="person-outline"
                  size={11}
                  color={palette.textSecondary}
                />
                <Text style={[styles.memberBadgeText, { color: palette.textSecondary }]}>
                  {member.nickname || member.display_name}
                </Text>
              </View>
            ) : (
              <Text style={[styles.documentDate, { color: palette.textMuted }]}>
                {new Date(item.created_at).toLocaleDateString('hu-HU')}
              </Text>
            )}

            {expiry ? (
              <View style={[styles.expiryBadge, { backgroundColor: `${expiry.color}18` }]}>
                <Ionicons name={expiry.icon} size={12} color={expiry.color} />
                <Text style={[styles.expiryText, { color: expiry.color }]}>
                  {expiry.label}
                </Text>
              </View>
            ) : null}
          </View>

          {(item.tags ?? []).length > 0 ? (
            <Text
              style={[styles.tags, { color: palette.primary }]}
              numberOfLines={1}
            >
              {(item.tags ?? []).map((tag) => `#${tag}`).join('  ')}
            </Text>
          ) : null}
        </View>

      </Pressable>

      <Pressable
        onPress={() => setMenuTarget(item)}
        hitSlop={8}
        style={styles.openIcon}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} műveletei`}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={palette.textMuted} />
      </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ScreenCloseButton />

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
            Dokumentumtár
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>
            A család fontos iratai egy helyen
          </Text>
        </View>

        <Pressable
          onPress={() => input.current?.focus()}
          style={[styles.headerButton, { backgroundColor: palette.surface }]}
          accessibilityLabel="Keresés"
        >
          <Ionicons name="search-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 115 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="folder-open-outline" size={27} color="#FFFFFF" />
          </View>

          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>Családi dokumentumok</Text>
            <Text style={styles.summarySubtitle}>
              {items.length} mentett dokumentum
            </Text>
          </View>

          <View style={styles.summaryCount}>
            <Text style={styles.summaryCountText}>{items.length}</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Ionicons name="search-outline" size={19} color={palette.primary} />

            <TextInput
              ref={input}
              value={search}
              onChangeText={setSearch}
              placeholder="Dokumentum keresése..."
              placeholderTextColor={palette.textMuted}
              style={[styles.searchInput, { color: palette.textPrimary }]}
            />

            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={10}>
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={palette.textMuted}
                />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setFilterVisible(true)}
            style={[
              styles.filterButton,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            accessibilityLabel="Dokumentumszűrők"
          >
            <Ionicons name="options-outline" size={21} color={palette.primary} />

            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              Dokumentumok
            </Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>
              {loading ? 'Betöltés...' : `${filtered.length} találat`}
            </Text>
          </View>

          <Pressable onPress={clearFilters}>
            {activeFilterCount > 0 ? (
              <Text style={[styles.clearText, { color: palette.primary }]}>
                Szűrők törlése
              </Text>
            ) : null}
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={[styles.loadingText, { color: palette.textMuted }]}>
              Dokumentumok betöltése...
            </Text>
          </View>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <View style={styles.documentList}>
            {filtered.map(renderDocument)}
          </View>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={search || activeFilterCount ? 'search-outline' : 'folder-open-outline'}
                size={32}
                color={palette.primary}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
              {search || activeFilterCount
                ? 'Nincs találat'
                : 'Még nincs dokumentumod'}
            </Text>

            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {search || activeFilterCount
                ? 'Próbálj más keresési kifejezést vagy töröld a szűrőket.'
                : 'Töltsd fel a család fontos iratait, hogy minden egy helyen legyen.'}
            </Text>

            {search || activeFilterCount ? (
              <Pressable
                onPress={() => {
                  setSearch('');
                  clearFilters();
                }}
                style={styles.emptyAction}
              >
                <Text style={styles.emptyActionText}>Keresés és szűrők törlése</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        disabled={busy}
        onPress={() => void upload()}
        style={[
          styles.fab,
          { bottom: insets.bottom + spacing.lg },
          busy && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Új dokumentum feltöltése"
      >
        <Ionicons
          name={busy ? 'hourglass-outline' : 'add'}
          size={29}
          color="#FFFFFF"
        />
      </Pressable>

      {/* SZŰRŐ MODAL */}

      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.overlayDismiss}
            onPress={() => setFilterVisible(false)}
          />

          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                  Dokumentumszűrők
                </Text>
                <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>
                  Állítsd be, mit szeretnél látni
                </Text>
              </View>

              <Pressable
                onPress={() => setFilterVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={25} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Rendezés
              </Text>

              <View style={styles.chipWrap}>
                {([
                  ['newest', 'Legújabb'],
                  ['name', 'ABC'],
                  ['expiry', 'Lejárat'],
                  ['size', 'Méret'],
                ] as const).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setSortBy(value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          sortBy === value ? palette.primary : palette.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: sortBy === value ? '#FFFFFF' : palette.textSecondary,
                        fontWeight: '800',
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Dokumentumtípus
              </Text>

              <View style={styles.chipWrap}>
                {TYPE_FILTERS.map(({ value, label }) => (
                  <Pressable
                    key={value}
                    onPress={() => setTypeFilter(value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          typeFilter === value ? palette.primary : palette.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: typeFilter === value ? '#FFFFFF' : palette.textSecondary,
                        fontWeight: '800',
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Fájlméret
              </Text>

              <View style={styles.chipWrap}>
                {([
                  ['all', 'Mind'],
                  ['small', '500 KB alatt'],
                  ['medium', '500 KB–5 MB'],
                  ['large', '5 MB fölött'],
                ] as const).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setSizeFilter(value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          sizeFilter === value ? palette.primary : palette.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: sizeFilter === value ? '#FFFFFF' : palette.textSecondary,
                        fontWeight: '800',
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Lejárat
              </Text>

              <View style={styles.chipWrap}>
                {([
                  ['all', 'Mind'],
                  ['valid', 'Érvényes'],
                  ['soon', '30 napon belül'],
                  ['expired', 'Lejárt'],
                ] as const).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setExpiryFilter(value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          expiryFilter === value ? palette.primary : palette.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: expiryFilter === value ? '#FFFFFF' : palette.textSecondary,
                        fontWeight: '800',
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable onPress={clearFilters} style={styles.cancelButton}>
                <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>
                  Alaphelyzet
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFilterVisible(false)}
                style={[styles.saveButton, { backgroundColor: palette.primary }]}
              >
                <Text style={styles.saveButtonText}>Eredmények megtekintése</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* FELTÖLTÉSI MODAL */}

      <Modal
        visible={metadataVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) {
            setMetadataVisible(false);
            setPendingFile(null);
            setShowDatePicker(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.overlayDismiss}
            disabled={busy}
            onPress={() => {
              setMetadataVisible(false);
              setPendingFile(null);
              setShowDatePicker(false);
            }}
          />

          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                  Dokumentum feltöltése
                </Text>
                <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>
                  Add meg az irat adatait
                </Text>
              </View>

              <Pressable
                disabled={busy}
                onPress={() => {
                  setMetadataVisible(false);
                  setPendingFile(null);
                  setShowDatePicker(false);
                }}
              >
                <Ionicons name="close-circle" size={25} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              {pendingFile ? (
                <View
                  style={[
                    styles.selectedFile,
                    { backgroundColor: palette.surfaceElevated },
                  ]}
                >
                  <View style={styles.selectedFileIcon}>
                    <Ionicons name="document-text-outline" size={24} color={palette.primary} />
                  </View>

                  <View style={styles.flex}>
                    <Text
                      style={[styles.selectedFileName, { color: palette.textPrimary }]}
                      numberOfLines={1}
                    >
                      {pendingFile.name}
                    </Text>
                    <Text style={[styles.selectedFileMeta, { color: palette.textMuted }]}>
                      {formatSize(pendingFile.size ?? null)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Dokumentum neve
              </Text>

              <TextInput
                value={documentName}
                onChangeText={setDocumentName}
                placeholder="Például: Személyi igazolvány"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: palette.background,
                    color: palette.textPrimary,
                    borderColor: palette.border,
                  },
                ]}
              />

              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Dokumentum típusa
              </Text>

              <View style={styles.typeGrid}>
                {DOCUMENT_TYPES.map((type) => {
                  const active = documentType === type.value;

                  return (
                    <Pressable
                      key={type.value}
                      onPress={() => setDocumentType(type.value)}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor: active ? `${type.color}18` : palette.surfaceElevated,
                          borderColor: active ? type.color : palette.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={type.icon}
                        size={21}
                        color={type.color}
                      />
                      <Text
                        style={[
                          styles.typeCardText,
                          { color: palette.textPrimary },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Címkék
              </Text>

              <TextInput
                value={tagsText}
                onChangeText={setTagsText}
                placeholder="Például: fontos, 2026, igazolvány"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: palette.background,
                    color: palette.textPrimary,
                    borderColor: palette.border,
                  },
                ]}
              />

              {/* LEJÁRATI DÁTUM - NATÍV NAPTÁRVÁLASZTÓ */}

              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Lejárati dátum
              </Text>

              <View
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Pressable
                  style={styles.dateInputContent}
                  onPress={() => setShowDatePicker(true)}
                  disabled={busy}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={palette.primary}
                  />

                  <Text
                    style={[
                      styles.dateInputText,
                      {
                        color: expiresAt
                          ? palette.textPrimary
                          : palette.textMuted,
                      },
                    ]}
                  >
                    {expiresAt
                      ? new Date(`${expiresAt}T12:00:00`).toLocaleDateString('hu-HU')
                      : 'Lejárati dátum kiválasztása'}
                  </Text>
                </Pressable>

                {expiresAt ? (
                  <Pressable
                    onPress={() => setExpiresAt('')}
                    hitSlop={10}
                    disabled={busy}
                    accessibilityLabel="Lejárati dátum törlése"
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={palette.textMuted}
                    />
                  </Pressable>
                ) : (
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={palette.textMuted}
                  />
                )}
              </View>

              {showDatePicker ? (
                <DateTimePicker
                  value={
                    expiresAt
                      ? new Date(`${expiresAt}T12:00:00`)
                      : new Date()
                  }
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);

                    if (event.type === 'set' && selectedDate) {
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const day = String(selectedDate.getDate()).padStart(2, '0');

                      setExpiresAt(`${year}-${month}-${day}`);
                    }
                  }}
                />
              ) : null}

              {members.length > 0 ? (
                <>
                  <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                    Kapcsolódó családtag
                  </Text>

                  <View style={styles.chipWrap}>
                    <Pressable
                      onPress={() => setRelatedProfileId(null)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: !relatedProfileId
                            ? palette.primary
                            : palette.surfaceElevated,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: !relatedProfileId ? '#FFFFFF' : palette.textSecondary,
                          fontWeight: '800',
                        }}
                      >
                        Nincs hozzárendelve
                      </Text>
                    </Pressable>

                    {members.map((member) => {
                      const active = relatedProfileId === member.profile_id;

                      return (
                        <Pressable
                          key={member.profile_id}
                          onPress={() => setRelatedProfileId(member.profile_id)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? palette.primary
                                : palette.surfaceElevated,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? '#FFFFFF' : palette.textSecondary,
                              fontWeight: '800',
                            }}
                          >
                            {member.nickname || member.display_name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <View
                style={[
                  styles.securityCard,
                  {
                    backgroundColor: palette.surfaceElevated,
                    borderColor: restricted ? palette.primary : palette.border,
                  },
                ]}
              >
                <View style={styles.securityIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color={palette.primary}
                  />
                </View>

                <View style={styles.flex}>
                  <Text style={[styles.securityTitle, { color: palette.textPrimary }]}>
                    Korlátozott hozzáférés
                  </Text>

                  <Text style={[styles.securityDescription, { color: palette.textMuted }]}>
                    Csak a feltöltő, a kapcsolt családtag és a családi admin láthatja.
                  </Text>
                </View>

                <Switch
                  value={restricted}
                  onValueChange={setRestricted}
                  trackColor={{
                    false: palette.border,
                    true: palette.primary,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    setMetadataVisible(false);
                    setPendingFile(null);
                    setShowDatePicker(false);
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>
                    Mégse
                  </Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => void saveDocument()}
                  style={[
                    styles.saveButton,
                    { backgroundColor: palette.primary },
                    busy && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  )}

                  <Text style={styles.saveButtonText}>
                    {busy ? 'Feltöltés...' : 'Feltöltés'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
          {metadataVisible ? noticeDialog : null}
        </View>
      </Modal>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name ?? ''}
        subtitle={menuTarget ? getDocumentType(menuTarget.document_type).label : undefined}
        actions={menuActions}
        onClose={() => setMenuTarget(null)}
        palette={palette}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Dokumentum törlése"
        message={`Biztosan törlöd ezt a dokumentumot?\n\n${deleteTarget?.name ?? ''}`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        palette={palette}
      />

      {!metadataVisible ? noticeDialog : null}
    </SafeAreaView>
  );
}

function createStyles(palette: Palette, isDark: boolean) {
  const teal = colors.teal;

  return StyleSheet.create({
    safe: { flex: 1 },

    header: {
      minHeight: 76,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerTitleWrap: { flex: 1, marginLeft: spacing.sm },
    headerTitle: { fontSize: 23, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { marginTop: 2, fontSize: 11, fontWeight: '600' },
    headerButton: {
      width: 43,
      height: 43,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.round,
      ...shadows.card,
    },

    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.lg,
    },

    summaryCard: {
      minHeight: 105,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: isDark ? '#12574F' : '#168F7E',
      ...shadows.floating,
    },
    summaryIcon: {
      width: 51,
      height: 51,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    summaryInfo: { flex: 1 },
    summaryTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    summarySubtitle: {
      marginTop: 5,
      color: 'rgba(255,255,255,0.78)',
      fontSize: 11,
      fontWeight: '600',
    },
    summaryCount: {
      minWidth: 43,
      height: 43,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    summaryCountText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },

    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    searchBox: {
      flex: 1,
      minHeight: 49,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    searchInput: { flex: 1, fontSize: 13 },
    filterButton: {
      width: 49,
      height: 49,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    filterBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      backgroundColor: teal,
    },
    filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: { fontSize: 17, fontWeight: '900' },
    sectionSubtitle: { marginTop: 3, fontSize: 11, fontWeight: '600' },
    clearText: { fontSize: 11, fontWeight: '800' },

    documentList: { gap: spacing.sm },
    documentCard: {
      minHeight: 91,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.xl,
      backgroundColor: palette.surface,
      ...shadows.card,
    },
    documentIcon: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    documentMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    documentInfo: { flex: 1, gap: 5 },
    documentTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    documentName: { flex: 1, fontSize: 13, fontWeight: '900' },
    documentMeta: { fontSize: 10, fontWeight: '600' },
    documentBottomRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    documentDate: { fontSize: 10 },
    memberBadge: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.round,
    },
    memberBadgeText: { fontSize: 9, fontWeight: '800' },
    expiryBadge: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.round,
    },
    expiryText: { fontSize: 9, fontWeight: '900' },
    tags: { fontSize: 10, fontWeight: '800' },
    openIcon: {
      width: 32,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingBox: {
      minHeight: 160,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    loadingText: { fontSize: 12, fontWeight: '600' },

    emptyCard: {
      padding: spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radius.xl,
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 66,
      height: 66,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 23,
      backgroundColor: isDark ? '#123E3A' : '#E4F8F3',
    },
    emptyTitle: { marginTop: 5, fontSize: 15, fontWeight: '900' },
    emptyText: {
      maxWidth: 260,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
    },
    emptyAction: {
      marginTop: spacing.sm,
      padding: spacing.sm,
    },
    emptyActionText: { color: teal, fontSize: 12, fontWeight: '900' },

    fab: {
      position: 'absolute',
      right: spacing.lg,
      width: 59,
      height: 59,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 30,
      backgroundColor: teal,
      ...shadows.floating,
    },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },

    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: isDark
        ? 'rgba(3,10,24,0.78)'
        : 'rgba(23,43,77,0.4)',
    },
    overlayDismiss: { flex: 1 },
    bottomSheet: {
      maxHeight: '90%',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 43,
      height: 5,
      marginBottom: spacing.md,
      borderRadius: 3,
      backgroundColor: palette.borderStrong,
    },
    modalHeader: {
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSubtitle: { marginTop: 4, fontSize: 11 },
    modalLabel: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      fontSize: 11,
      fontWeight: '900',
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      minHeight: 37,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.round,
    },
    modalActions: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    cancelButton: { padding: spacing.md },
    saveButton: {
      minHeight: 47,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: radius.lg,
    },
    saveButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },

    formContent: { paddingBottom: spacing.md },
    selectedFile: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.lg,
    },
    selectedFileIcon: {
      width: 43,
      height: 43,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: isDark ? '#123E3A' : '#E4F8F3',
    },
    selectedFileName: { fontSize: 12, fontWeight: '900' },
    selectedFileMeta: { marginTop: 4, fontSize: 10 },
    modalInput: {
      minHeight: 47,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderRadius: radius.lg,
      fontSize: 13,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    typeCard: {
      minWidth: '30%',
      flexGrow: 1,
      minHeight: 66,
      padding: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    typeCardText: { fontSize: 10, fontWeight: '800' },

    dateInput: {
      minHeight: 50,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    dateInputContent: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dateInputText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },

    securityCard: {
      marginTop: spacing.lg,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    securityIcon: {
      width: 39,
      height: 39,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: isDark ? '#123E3A' : '#E4F8F3',
    },
    securityTitle: { fontSize: 12, fontWeight: '900' },
    securityDescription: { marginTop: 4, fontSize: 10, lineHeight: 15 },
    flex: { flex: 1 },
  });
}