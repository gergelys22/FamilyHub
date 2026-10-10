import { colors, radius, shadows, spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DocumentCategory = 'all' | 'personal' | 'family' | 'financial';

type DocumentFolder = {
  id: string;
  title: string;
  count: number;
  date: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  backgroundColor: string;
};

const folders: DocumentFolder[] = [
  {
    id: 'personal',
    title: 'Személyi igazolványok',
    count: 5,
    date: '2025. 04. 12.',
    icon: 'folder-open',
    color: '#20BFA7',
    backgroundColor: '#DDF8F1',
  },
  {
    id: 'home',
    title: 'Lakásdokumentumok',
    count: 3,
    date: '2025. 03. 18.',
    icon: 'document-text',
    color: '#F56C9A',
    backgroundColor: '#FFE8F0',
  },
  {
    id: 'financial',
    title: 'Biztosítások',
    count: 4,
    date: '2025. 02. 10.',
    icon: 'briefcase',
    color: colors.primary,
    backgroundColor: '#E8F0FF',
  },
  {
    id: 'health',
    title: 'Orvosi iratok',
    count: 8,
    date: '2025. 01. 25.',
    icon: 'medkit',
    color: '#20BFA7',
    backgroundColor: '#DDF8F1',
  },
  {
    id: 'school',
    title: 'Iskolai dokumentumok',
    count: 6,
    date: '2024. 12. 20.',
    icon: 'folder',
    color: '#F5A623',
    backgroundColor: '#FFF2D7',
  },
];

const tabs: { key: DocumentCategory; label: string }[] = [
  { key: 'all', label: 'Mind' },
  { key: 'personal', label: 'Személyes' },
  { key: 'family', label: 'Család' },
  { key: 'financial', label: 'Pénzügyi' },
];

function DocumentRow({ folder }: { folder: DocumentFolder }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${folder.title} megnyitása`}
      onPress={() => Alert.alert(folder.title, 'A dokumentumok kezelése hamarosan elérhető.')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.folderIcon, { backgroundColor: folder.backgroundColor }]}>
        <Ionicons name={folder.icon} size={27} color={folder.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{folder.title}</Text>
        <Text style={styles.rowMeta}>
          {folder.count} fájl · {folder.date}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={21} color={colors.primary} />
    </Pressable>
  );
}

export default function DocumentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DocumentCategory>('all');
  const [search, setSearch] = useState('');
  const filteredFolders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('hu-HU');
    return folders.filter((folder) => {
      const matchesSearch = !query || folder.title.toLocaleLowerCase('hu-HU').includes(query);
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'personal' && ['personal', 'health'].includes(folder.id)) ||
        (activeTab === 'family' && ['home', 'school'].includes(folder.id)) ||
        (activeTab === 'financial' && folder.id === 'financial');
      return matchesSearch && matchesTab;
    });
  }, [activeTab, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vissza a Páncélterembe"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Dokumentumok</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dokumentumok keresése"
          onPress={() => undefined}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="search-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={21} color={colors.primary} />
        <TextInput
          accessibilityLabel="Dokumentumok keresése"
          onChangeText={setSearch}
          placeholder="Keresés a dokumentumok között..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredFolders.length > 0 ? (
          filteredFolders.map((folder) => <DocumentRow key={folder.id} folder={folder} />)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nincs találat</Text>
            <Text style={styles.emptyText}>Próbálj másik kategóriát vagy keresőkifejezést.</Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Új dokumentum hozzáadása"
        onPress={() => Alert.alert('Új dokumentum', 'A feltöltés hamarosan elérhető.')}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  title: { color: colors.textPrimary, fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  tabs: {
    marginHorizontal: spacing.lg,
    padding: 4,
    flexDirection: 'row',
    borderRadius: radius.round,
    backgroundColor: '#EEF4FC',
  },
  tab: {
    flex: 1,
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  activeTab: { backgroundColor: colors.primary, ...shadows.floating },
  tabText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  activeTabText: { color: colors.white },
  searchBox: {
    minHeight: 50,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: '#EEF4FC',
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 110 },
  row: {
    minHeight: 82,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  folderIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
  },
  rowContent: { flex: 1, gap: 4 },
  rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  rowMeta: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  addButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
