import { colors, radius, shadows, spacing } from '@/constants/theme';
import { darkColors } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { getMyFamilies } from '@/services/families';
import { createFamilyDocument, deleteFamilyDocument, getFamilyDocuments, type FamilyDocument } from '@/services/family-content';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DocumentsScreen() {
  const router = useRouter(); const { profile } = useAuth(); const [familyId, setFamilyId] = useState<string | null>(null); const [items, setItems] = useState<FamilyDocument[]>([]); const [search, setSearch] = useState(''); const [busy, setBusy] = useState(false); const input = useRef<TextInput>(null);
  const { isDark } = useTheme(); const palette = isDark ? darkColors : colors;
  async function reload(id = familyId) { if (id) setItems(await getFamilyDocuments(id)); }
  useEffect(() => { void getMyFamilies().then((families) => { const id = families[0]?.id ?? null; setFamilyId(id); void reload(id); }).catch((error) => Alert.alert('Hiba', error.message)); }, []);
  async function upload() {
    if (!familyId || !profile?.id) return;
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0]; if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('A fájl mérete legfeljebb 50 MB lehet.');
      const path = `${profile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const body = await (await fetch(file.uri)).arrayBuffer();
      const { error } = await supabase.storage.from('family-documents').upload(path, body, { contentType: file.mimeType ?? 'application/octet-stream', upsert: false });
      if (error) throw new Error(error.message);
      try { await createFamilyDocument({ familyId, profileId: profile.id, name: file.name, storagePath: path, mimeType: file.mimeType, sizeBytes: file.size }); } catch (error) { await supabase.storage.from('family-documents').remove([path]); throw error; }
      await reload(); Alert.alert('Sikeres feltöltés', `${file.name} elmentve.`);
    } catch (error) { Alert.alert('Feltöltés sikertelen', error instanceof Error ? error.message : 'Próbáld újra.'); } finally { setBusy(false); }
  }
  async function open(item: FamilyDocument) { const { data, error } = await supabase.storage.from('family-documents').createSignedUrl(item.storage_path, 300); if (error || !data?.signedUrl) return Alert.alert('Megnyitás sikertelen', error?.message ?? 'A fájl nem érhető el.'); await Linking.openURL(data.signedUrl); }
  function remove(item: FamilyDocument) { Alert.alert('Dokumentum törlése', `Törlöd: ${item.name}?`, [{ text: 'Mégse', style: 'cancel' }, { text: 'Törlés', style: 'destructive', onPress: () => void deleteFamilyDocument(item).then(() => reload()).catch((error) => Alert.alert('Hiba', error.message)) }]); }
  const filtered = items.filter((item) => item.name.toLocaleLowerCase('hu-HU').includes(search.trim().toLocaleLowerCase('hu-HU')));
  return <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}><View style={styles.header}><Pressable onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: palette.surface }]}><Ionicons name="chevron-back" size={25} color={palette.textPrimary} /></Pressable><Text style={[styles.title, { color: palette.textPrimary }]}>Dokumentumok</Text><Pressable onPress={() => input.current?.focus()} style={[styles.headerButton, { backgroundColor: palette.surface }]}><Ionicons name="search-outline" size={22} color={palette.primary} /></Pressable></View><View style={[styles.search, { backgroundColor: palette.surfaceElevated }]}><Ionicons name="search" size={20} color={palette.primary} /><TextInput ref={input} value={search} onChangeText={setSearch} placeholder="Keresés a dokumentumok között..." placeholderTextColor={palette.textMuted} style={[styles.searchInput, { color: palette.textPrimary }]} /></View><ScrollView contentContainerStyle={styles.content}>{filtered.map((item) => <Pressable key={item.id} onPress={() => void open(item)} onLongPress={() => remove(item)} style={[styles.row, { backgroundColor: palette.surface }]}><View style={styles.fileIcon}><Ionicons name="document-text" size={25} color={palette.primary} /></View><View style={styles.flex}><Text style={[styles.name, { color: palette.textPrimary }]} numberOfLines={1}>{item.name}</Text><Text style={[styles.meta, { color: palette.textMuted }]}>{item.mime_type ?? 'Dokumentum'} · {item.size_bytes ? `${Math.ceil(item.size_bytes / 1024)} KB` : 'ismeretlen méret'}</Text></View><Ionicons name="open-outline" size={20} color={palette.primary} /></Pressable>)}{filtered.length === 0 ? <Text style={[styles.empty, { color: palette.textMuted }]}>Még nincs feltöltött dokumentum.</Text> : null}</ScrollView><Pressable disabled={busy} onPress={() => void upload()} style={styles.fab}><Ionicons name={busy ? 'hourglass-outline' : 'add'} size={31} color={colors.white} /></Pressable></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 68, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface, ...shadows.card }, title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900' }, search: { minHeight: 50, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: '#EEF4FC' }, searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 }, content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md }, row: { minHeight: 76, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card }, fileIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.primarySoft }, flex: { flex: 1 }, name: { color: colors.textPrimary, fontWeight: '900', fontSize: 14 }, meta: { color: colors.textMuted, fontSize: 11, marginTop: 5 }, empty: { padding: spacing.xl, color: colors.textMuted, textAlign: 'center' }, fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: colors.primary, ...shadows.floating } });
