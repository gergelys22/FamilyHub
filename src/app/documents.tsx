import { colors, radius, shadows, spacing } from '@/constants/theme';
import { darkColors } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { getMyFamilies, getFamilyMembers, type FamilyMember } from '@/services/families';
import { createFamilyDocument, deleteFamilyDocument, getFamilyDocuments, updateFamilyDocument, type FamilyDocument } from '@/services/family-content';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenCloseButton } from '@/components/screen-close-button';

export default function DocumentsScreen() {
  const router = useRouter(); const { profile } = useAuth(); const [familyId, setFamilyId] = useState<string | null>(null); const [items, setItems] = useState<FamilyDocument[]>([]); const [members, setMembers] = useState<FamilyMember[]>([]); const [search, setSearch] = useState(''); const [busy, setBusy] = useState(false); const input = useRef<TextInput>(null);
  const [metadataVisible, setMetadataVisible] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; name: string; mimeType?: string; size?: number } | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('egyeb');
  const [tagsText, setTagsText] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [relatedProfileId, setRelatedProfileId] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(false);
  const { isDark } = useTheme(); const palette = isDark ? darkColors : colors;
  async function reload(id = familyId) { if (id) setItems(await getFamilyDocuments(id)); }
  useEffect(() => {
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        if (!id) return;
        const [familyMembers] = await Promise.all([
          getFamilyMembers(id),
          reload(id),
        ]);
        setMembers(familyMembers);
      })
      .catch((error) => Alert.alert('Hiba', error instanceof Error ? error.message : 'A családi adatok betöltése sikertelen.'));
  }, []);
  async function upload() {
    if (!familyId || !profile?.id) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('A fájl mérete legfeljebb 50 MB lehet.');
      setPendingFile({ uri: file.uri, name: file.name, mimeType: file.mimeType, size: file.size });
      setDocumentName(file.name.replace(/\.[^.]+$/, ''));
      setDocumentType('egyeb');
      setTagsText('');
      setExpiresAt('');
      setRelatedProfileId(null);
      setRestricted(false);
      setMetadataVisible(true);
    } catch (error) {
      Alert.alert('Fájl kiválasztása sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    }
  }

  async function saveDocument() {
    if (!familyId || !profile?.id || !pendingFile) return;
    if (!documentName.trim()) {
      Alert.alert('Hiányzó adat', 'Adj meg egy dokumentumnevet.');
      return;
    }
    let parsedExpiry: string | null = null;
    if (expiresAt.trim()) {
      const date = new Date(expiresAt.trim().replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) {
        Alert.alert('Hibás lejárati dátum', 'Használd ezt a formátumot: 2027-10-11');
        return;
      }
      parsedExpiry = date.toISOString();
    }
    setBusy(true);
    try {
      const path = `${profile.id}/${Date.now()}-${pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const body = await (await fetch(pendingFile.uri)).arrayBuffer();
      const { error } = await supabase.storage
        .from('family-documents')
        .upload(path, body, { contentType: pendingFile.mimeType ?? 'application/octet-stream', upsert: false });
      if (error) throw new Error(error.message);
      const tags = tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      try {
        await createFamilyDocument({
          familyId,
          profileId: profile.id,
          name: documentName,
          storagePath: path,
          mimeType: pendingFile.mimeType,
          sizeBytes: pendingFile.size,
          documentType,
          tags,
          expiresAt: parsedExpiry,
          relatedProfileId,
          restricted,
        });
      } catch (error) {
        await supabase.storage.from('family-documents').remove([path]);
        throw error;
      }
      setMetadataVisible(false);
      setPendingFile(null);
      await reload();
      Alert.alert('Sikeres feltöltés', `${documentName.trim()} elmentve.`);
    } catch (error) {
      Alert.alert('Feltöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }
  async function open(item: FamilyDocument) { const { data, error } = await supabase.storage.from('family-documents').createSignedUrl(item.storage_path, 300); if (error || !data?.signedUrl) return Alert.alert('Megnyitás sikertelen', error?.message ?? 'A fájl nem érhető el.'); await Linking.openURL(data.signedUrl); }
  function remove(item: FamilyDocument) { Alert.alert('Dokumentum törlése', `Törlöd: ${item.name}?`, [{ text: 'Mégse', style: 'cancel' }, { text: 'Törlés', style: 'destructive', onPress: () => void deleteFamilyDocument(item).then(() => reload()).catch((error) => Alert.alert('Hiba', error.message)) }]); }
  const normalizedSearch = search.trim().toLocaleLowerCase('hu-HU');
  const filtered = items.filter((item) =>
    [
      item.name,
      item.document_type,
      ...(item.tags ?? []),
      members.find((member) => member.profile_id === item.related_profile_id)?.display_name ?? '',
    ]
      .join(' ')
      .toLocaleLowerCase('hu-HU')
      .includes(normalizedSearch),
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Dokumentumok</Text>
        <Pressable onPress={() => input.current?.focus()} style={[styles.headerButton, { backgroundColor: palette.surface }]}>
          <Ionicons name="search-outline" size={22} color={palette.primary} />
        </Pressable>
      </View>
      <View style={[styles.search, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
        <Ionicons name="search" size={20} color={palette.primary} />
        <TextInput ref={input} value={search} onChangeText={setSearch} placeholder="Keresés a dokumentumok között..." placeholderTextColor={palette.textMuted} style={[styles.searchInput, { color: palette.textPrimary }]} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((item) => (
          <Pressable key={item.id} onPress={() => void open(item)} onLongPress={() => remove(item)} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.fileIcon}><Ionicons name="document-text" size={25} color={palette.primary} /></View>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: palette.textPrimary }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {item.document_type} · {item.mime_type ?? 'Dokumentum'} · {item.size_bytes ? `${Math.ceil(item.size_bytes / 1024)} KB` : 'ismeretlen méret'}
              </Text>
              {(item.tags ?? []).length > 0 ? (
                <Text numberOfLines={1} style={[styles.tags, { color: palette.primary }]}>
                  {(item.tags ?? []).map((tag) => `#${tag}`).join('  ')}
                </Text>
              ) : null}
              {item.expires_at ? (
                <Text style={[styles.expiry, { color: new Date(item.expires_at).getTime() < Date.now() ? palette.danger : palette.warning }]}>
                  Lejárat: {new Date(item.expires_at).toLocaleDateString('hu-HU')}
                </Text>
              ) : null}
            </View>
            {item.restricted ? <Ionicons name="lock-closed" size={16} color={palette.danger} /> : null}
            <Ionicons name="open-outline" size={20} color={palette.primary} />
          </Pressable>
        ))}
        {filtered.length === 0 ? <Text style={[styles.empty, { color: palette.textMuted }]}>Még nincs feltöltött dokumentum.</Text> : null}
      </ScrollView>
      <Modal
        visible={metadataVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !busy && setMetadataVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Dokumentum adatai</Text>
            <TextInput
              value={documentName}
              onChangeText={setDocumentName}
              placeholder="Dokumentum neve"
              placeholderTextColor={palette.textMuted}
              style={[styles.modalInput, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
            />
            <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>Típus</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeOptions}>
              {[
                ['szemelyi', 'Személyi'],
                ['biztositas', 'Biztosítás'],
                ['orvosi', 'Orvosi'],
                ['iskola', 'Iskola'],
                ['egyeb', 'Egyéb'],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setDocumentType(value)}
                  style={[styles.typeChip, { backgroundColor: documentType === value ? palette.primary : palette.surfaceElevated }]}
                >
                  <Text style={{ color: documentType === value ? palette.white : palette.textSecondary, fontWeight: '800' }}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              value={tagsText}
              onChangeText={setTagsText}
              placeholder="Címkék vesszővel elválasztva"
              placeholderTextColor={palette.textMuted}
              style={[styles.modalInput, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
            />
            <TextInput
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="Lejárat: 2027-10-11 (opcionális)"
              placeholderTextColor={palette.textMuted}
              style={[styles.modalInput, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]}
            />
            {members.length > 0 ? (
              <>
                <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>Családtaghoz kötés</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeOptions}>
                  <Pressable
                    onPress={() => setRelatedProfileId(null)}
                    style={[styles.typeChip, { backgroundColor: !relatedProfileId ? palette.primary : palette.surfaceElevated }]}
                  >
                    <Text style={{ color: !relatedProfileId ? palette.white : palette.textSecondary, fontWeight: '800' }}>Mindegyik</Text>
                  </Pressable>
                  {members.map((member) => (
                    <Pressable
                      key={member.profile_id}
                      onPress={() => setRelatedProfileId(member.profile_id)}
                      style={[styles.typeChip, { backgroundColor: relatedProfileId === member.profile_id ? palette.primary : palette.surfaceElevated }]}
                    >
                      <Text style={{ color: relatedProfileId === member.profile_id ? palette.white : palette.textSecondary, fontWeight: '800' }}>
                        {member.nickname || member.display_name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <View style={styles.restrictedRow}>
              <View style={styles.flex}>
                <Text style={[styles.restrictedTitle, { color: palette.textPrimary }]}>Korlátozott hozzáférés</Text>
                <Text style={[styles.restrictedText, { color: palette.textMuted }]}>Csak a feltöltő, a kapcsolt tag és családi admin láthatja.</Text>
              </View>
              <Switch
                value={restricted}
                onValueChange={setRestricted}
                trackColor={{ false: palette.border, true: palette.primaryLight }}
                thumbColor={restricted ? colors.white : undefined}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable disabled={busy} onPress={() => setMetadataVisible(false)} style={styles.cancelButton}>
                <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => void saveDocument()} style={[styles.saveButton, { backgroundColor: palette.primary }]}>
                <Text style={styles.saveButtonText}>{busy ? 'Mentés…' : 'Feltöltés'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Pressable disabled={busy} onPress={() => void upload()} style={styles.fab}>
        <Ionicons name={busy ? 'hourglass-outline' : 'add'} size={31} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 68, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface, ...shadows.card },
  title: { fontSize: 27, fontWeight: '900' },
  search: { minHeight: 50, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg },
  searchInput: { flex: 1, fontSize: 13 },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  row: { minHeight: 76, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, ...shadows.card },
  fileIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.primarySoft },
  flex: { flex: 1 },
  name: { fontWeight: '900', fontSize: 14 },
  meta: { fontSize: 11, marginTop: 5 },
  tags: { fontSize: 10, marginTop: 3, fontWeight: '800' },
  expiry: { fontSize: 10, marginTop: 3, fontWeight: '800' },
  empty: { padding: spacing.xl, textAlign: 'center' },
  fab: { position: 'absolute', right: spacing.lg, bottom: 92, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: colors.primary, ...shadows.floating },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '88%', padding: spacing.xl, gap: spacing.md, borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalLabel: { marginTop: spacing.xs, fontSize: 12, fontWeight: '800' },
  modalInput: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  typeOptions: { gap: spacing.sm, paddingRight: spacing.md },
  typeChip: { minHeight: 38, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  restrictedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  restrictedTitle: { fontSize: 13, fontWeight: '900' },
  restrictedText: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  cancelButton: { padding: spacing.md },
  saveButton: { minHeight: 48, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  saveButtonText: { color: colors.white, fontWeight: '900' },
});
