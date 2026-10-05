// app/(tabs)/memories.tsx
import { FamilyHeader } from '@/components/family-header';
import { colors } from '@/constants/theme';
import { useMemories } from '@/hooks/use-memories';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type MemoryView = 'timeline' | 'familyTree' | 'albums';
type Memory = ReturnType<typeof useMemories>['memories'][number];

const MAX_AVATARS = 4;

/* ------------------------------------------------------------------ */
/* Tabváltó                                                            */
/* ------------------------------------------------------------------ */

const TABS: { key: MemoryView; label: string; icon: IconName }[] = [
  { key: 'timeline', label: 'Idővonal', icon: 'time-outline' },
  { key: 'familyTree', label: 'Családfa', icon: 'git-network-outline' },
  { key: 'albums', label: 'Albumok', icon: 'folder-open-outline' },
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
            <Ionicons name={icon} size={20} color={isActive ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
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

// Az adatbázisban csak a címke szövege van, a megjelenés a kliensben dől el.
const TAG_STYLES: Record<string, { icon: IconName; color: string }> = {
  Nyár: { icon: 'sunny-outline', color: '#F5B942' },
  Utazás: { icon: 'briefcase-outline', color: '#7C8CFF' },
  Balaton: { icon: 'water-outline', color: '#4FC3F7' },
  Születésnap: { icon: 'gift-outline', color: '#FF6B81' },
  Család: { icon: 'heart', color: '#FF4D6D' },
  Otthon: { icon: 'home-outline', color: '#B0B8C9' },
  Kirándulás: { icon: 'trail-sign-outline', color: '#B0B8C9' },
  Természet: { icon: 'leaf-outline', color: '#4ADE80' },
  Hétvége: { icon: 'calendar-outline', color: '#FB923C' },
};
const DEFAULT_TAG_STYLE = { icon: 'pricetag-outline' as IconName, color: '#9AA7C0' };

function Tag({ label }: { label: string }) {
  const { icon, color } = TAG_STYLES[label] ?? DEFAULT_TAG_STYLE;
  return (
    <View style={[styles.tag, { borderColor: color + '55', backgroundColor: color + '1F' }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function MemoryCard({ item }: { item: Memory }) {
  const visibleAvatars = item.avatars.slice(0, MAX_AVATARS);
  const extraPeople = item.avatars.length - visibleAvatars.length;

  return (
    <View style={styles.row}>
      <View style={styles.dateCol}>
        <View style={styles.dot} />
        <Text style={styles.month}>{item.month}</Text>
        <Text style={styles.day}>{item.day}</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.card}>
        <View>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
            </View>
          )}
          {item.extraPhotos > 0 && (
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>+{item.extraPhotos}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </View>

          {!!item.location && (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
          <Text style={styles.metaText}>{item.when}</Text>

          {visibleAvatars.length > 0 && (
            <View style={styles.avatars}>
              {visibleAvatars.map((uri, i) => (
                <Image
                  key={`${uri}-${i}`}
                  source={{ uri }}
                  style={[styles.avatar, i > 0 && styles.avatarOverlap]}
                />
              ))}
              {extraPeople > 0 && (
                <View style={[styles.avatar, styles.avatarMore, styles.avatarOverlap]}>
                  <Text style={styles.metaText}>+{extraPeople}</Text>
                </View>
              )}
            </View>
          )}

          {item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.map((label) => (
                <Tag key={label} label={label} />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function TimelineView() {
  const { memories, loading, hasMore, error, loadMore } = useMemories();

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Idővonal</Text>
        <Pressable style={styles.filter}>
          <Text style={styles.metaText}>Szűrők</Text>
          <Ionicons name="filter-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {memories.map((m) => (
        <MemoryCard key={m.id} item={m} />
      ))}

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

const FamilyTree = () => <Text style={styles.metaText}>Családfa</Text>;
const Albums = () => <Text style={styles.metaText}>Albumok</Text>;

/* ------------------------------------------------------------------ */
/* Váltó + tartalom                                                    */
/* ------------------------------------------------------------------ */

export function MemoryScreenOptions() {
  const [active, setActive] = useState<MemoryView>('timeline');

  return (
    <View style={styles.options}>
      <MemoryTabs active={active} onChange={setActive} />
      {active === 'timeline' && <TimelineView />}
      {active === 'familyTree' && <FamilyTree />}
      {active === 'albums' && <Albums />}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Képernyő                                                            */
/* ------------------------------------------------------------------ */

export default function MemoriesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();

  const displayName = profile?.display_name?.trim() || 'Felhasználó';
  const userInitial = displayName.charAt(0).toLocaleUpperCase('hu-HU');

  return (
    <LinearGradient colors={['#0A1F44', '#06122B']} style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View pointerEvents="none" style={styles.backgroundGlow} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FamilyHeader
            userInitial={userInitial}
            unreadNotificationCount={unreadCount}
            onNotificationsPress={() => router.push('/notifications')}
            onProfilePress={() => router.push('/profile')}
          />
          <Text style={styles.title}>Emlékek</Text>
          <Text style={styles.subtitle}>Közös pillanataink, amelyek összekötnek minket.</Text>

          <MemoryScreenOptions />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ */
/* Stílusok                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'stretch',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 88,
    right: -130,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0B4A8F',
    opacity: 0.2,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.7,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 8,
  },

  options: { width: '100%', marginTop: 20, gap: 20 },

  /* tabs */
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabWrap: { flex: 1 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
  },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },

  /* timeline */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateCol: { width: 44, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginBottom: 14,
  },
  month: { fontSize: 12, color: colors.textSecondary },
  day: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  line: {
    flex: 1,
    width: 1,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  card: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  photo: { width: 120, height: 140, borderRadius: 14 },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  photoBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  photoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  cardBody: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.textSecondary },

  avatars: { flexDirection: 'row', marginTop: 6 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0B1B3A',
  },
  avatarOverlap: { marginLeft: -8 },
  avatarMore: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: '600' },

  loadMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
});