import { FamilyHeader } from '@/components/family-header';
import { FamilySwitcher } from '@/components/family-switcher';
import { colors, radius, spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/providers/auth-provider';
import { getFamilyEvents, type FamilyEvent } from '@/services/events';
import type { Family } from '@/services/families';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categoryColors: Record<string, string> = { family: '#8B5CF6', birthday: '#F55B91', medical: '#34D399', school: '#38BDF8', sport: '#F59E0B', administration: '#FB7185', trip: '#22C55E' };
const categoryIcons: Record<string, SymbolViewProps['name']> = {
  family: { ios: 'person.2.fill', android: 'group', web: 'group' }, birthday: { ios: 'birthday.cake.fill', android: 'cake', web: 'cake' }, medical: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' }, school: { ios: 'graduationcap.fill', android: 'school', web: 'school' }, sport: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' }, administration: { ios: 'doc.text.fill', android: 'description', web: 'description' }, trip: { ios: 'mountain.2.fill', android: 'landscape', web: 'landscape' },
};

function monthBounds(date: Date) {
  return { from: new Date(date.getFullYear(), date.getMonth(), 1), to: new Date(date.getFullYear(), date.getMonth() + 1, 1) };
}

function EventCard({ event }: { event: FamilyEvent }) {
  const start = new Date(event.starts_at);
  const color = categoryColors[event.category] ?? colors.primary;
  return <View style={styles.eventCard}><View style={[styles.eventAccent, { backgroundColor: color }]} /><View style={[styles.eventIcon, { backgroundColor: `${color}22` }]}><SymbolView name={categoryIcons[event.category] ?? categoryIcons.family} size={22} tintColor={color} type="hierarchical" weight={{ ios: 'semibold', android: medium }} style={styles.symbol} /></View><View style={styles.flex}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{start.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })} · {start.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</Text>{event.location_name ? <Text style={styles.location}>⌖ {event.location_name}</Text> : null}</View></View>;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bounds = useMemo(() => monthBounds(cursor), [cursor]);

  useFocusEffect(useCallback(() => {
    if (!activeFamily) return;
    let active = true;
    setLoading(true);
    void getFamilyEvents(activeFamily.id, bounds.from, bounds.to).then((result) => { if (active) { setEvents(result); setError(null); } }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Az események betöltése sikertelen.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeFamily, bounds.from, bounds.to]));

  function moveMonth(offset: number) { setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)); }
  const initial = profile?.display_name?.trim().charAt(0).toLocaleUpperCase('hu-HU') || '?';

  return <SafeAreaView style={styles.safeArea} edges={['top']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <FamilyHeader userInitial={initial} unreadNotificationCount={unreadCount} onNotificationsPress={() => router.push('/notifications')} onProfilePress={() => router.push('/profile')} />
    <View><Text style={styles.title}>Családi naptár</Text><Text style={styles.subtitle}>Közös események és fontos családi időpontok.</Text></View>
    <FamilySwitcher onActiveFamilyChange={setActiveFamily} />
    <View style={styles.monthBar}><Pressable onPress={() => moveMonth(-1)} style={styles.roundButton}><Text style={styles.arrow}>‹</Text></Pressable><Text style={styles.monthTitle}>{cursor.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}</Text><Pressable onPress={() => moveMonth(1)} style={styles.roundButton}><Text style={styles.arrow}>›</Text></Pressable></View>
    {activeFamily ? <Pressable onPress={() => router.push({ pathname: './create-event', params: { familyId: activeFamily.id, familyName: activeFamily.name } })} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><SymbolView name={{ ios: 'calendar.badge.plus', android: 'event_upcoming', web: 'event_upcoming' }} size={24} tintColor="#FFFFFF" type="hierarchical" weight={{ ios: 'semibold', android: medium }} style={styles.symbol} /><Text style={styles.addButtonText}>Új esemény</Text></Pressable> : null}
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Események</Text><Text style={styles.count}>{events.length} esemény</Text></View>
    {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}
    {loading ? <ActivityIndicator color={colors.primaryLight} size="large" style={styles.loader} /> : events.length ? events.map((event) => <EventCard key={event.id} event={event} />) : <View style={styles.empty}><SymbolView name={{ ios: 'calendar.badge.exclamationmark', android: 'event_busy', web: 'event_busy' }} size={38} tintColor={colors.textMuted} type="hierarchical" weight={{ ios: 'semibold', android: medium }} style={styles.emptySymbol} /><Text style={styles.emptyTitle}>Nincs esemény ebben a hónapban</Text><Text style={styles.emptyText}>Hozd létre az első közös családi programot.</Text></View>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071326' }, content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg }, flex: { flex: 1 }, title: { color: colors.textPrimary, fontSize: 31, fontWeight: '900', letterSpacing: -0.7 }, subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 13 },
  monthBar: { minHeight: 60, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#10233E' }, monthTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', textTransform: 'capitalize' }, roundButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.surfaceElevated }, arrow: { color: colors.primaryLight, fontSize: 29, lineHeight: 31 },
  addButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary }, addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, symbol: { width: 28, height: 28 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' }, count: { color: colors.textMuted, fontSize: 11 },
  eventCard: { minHeight: 92, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#10233E' }, eventAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 }, eventIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16 }, eventTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, eventMeta: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 11, textTransform: 'capitalize' }, location: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 10 },
  loader: { paddingVertical: 70 }, empty: { paddingVertical: 70, alignItems: 'center', gap: spacing.sm }, emptySymbol: { width: 44, height: 44 }, emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center' }, emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' }, errorCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#3B1622' }, errorText: { color: '#FDA4AF', fontSize: 12 }, pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
