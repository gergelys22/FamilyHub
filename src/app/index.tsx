import { FamilyHeader } from '@/components/family-header';
import { colors, radius, spacing } from '@/constants/theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const family = [
  { name: 'Anya', initials: 'A', color: '#EC4899' },
  { name: 'Apa', initials: 'A', color: '#F59E0B' },
  { name: 'Anna', initials: 'AN', color: '#8B5CF6' },
  { name: 'Máté', initials: 'M', color: '#F97316' },
  { name: 'Lili', initials: 'L', color: '#14B8A6' },
];

const quickActions = [
  { icon: '▣', label: 'Új esemény', color: '#3B82F6' },
  { icon: '≡', label: 'Új feladat', color: '#10B981' },
  { icon: '◇', label: 'Gyógyszer', color: '#8B5CF6' },
  { icon: '◉', label: 'Helyzet', color: '#F97316' },
];

function SectionTitle({ children, action }: { children: string; action?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FamilyHeader
          userInitial="A"
          hasUnreadNotifications
          onNotificationsPress={() => {
            console.log('Értesítések');
          }}
          onProfilePress={() => {
            console.log('Profil');
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyRow}>
          {family.map((person) => (
            <View key={person.name} style={styles.person}>
              <View style={[styles.avatarRing, { borderColor: person.color }]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{person.initials}</Text></View>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.personName}>{person.name}</Text>
            </View>
          ))}
          <View style={styles.person}>
            <View style={styles.addAvatar}><Text style={styles.addText}>+</Text></View>
            <Text style={styles.mutedName}>Új tag</Text>
          </View>
        </ScrollView>

        <SectionTitle>Gyors műveletek</SectionTitle>
        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <View key={action.label} style={styles.quickCard}>
              <View style={[styles.quickIcon, { backgroundColor: `${action.color}22` }]}>
                <Text style={[styles.quickIconText, { color: action.color }]}>{action.icon}</Text>
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.twoColumns}>
          <View style={[styles.card, styles.column]}>
            <SectionTitle action="Mind">Közelgő</SectionTitle>
            <Event date="25" title="Anna szülinap" meta="Szombat 18:00" />
            <Event date="26" title="Családi vacsora" meta="Vasárnap 19:00" />
          </View>
          <View style={[styles.card, styles.column]}>
            <SectionTitle>Értesítések</SectionTitle>
            <Notice icon="✓" tone="green" title="Máté leckéje kész" meta="Ma 14:32" />
            <Notice icon="♥" tone="pink" title="Új emlék érkezett" meta="Tegnap 21:15" />
          </View>
        </View>

        <SectionTitle>Gyógyszer emlékeztető</SectionTitle>
        <View style={[styles.card, styles.reminder]}>
          <View style={styles.pillIcon}><Text style={styles.pillText}>◇</Text></View>
          <View style={styles.flex}>
            <Text style={styles.reminderTitle}>Lili – Allergia gyógyszer</Text>
            <Text style={styles.itemMeta}>1 tabletta · Ma 20:00</Text>
          </View>
          <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
        </View>

        <SectionTitle action="Élő helyzet">Család térképe</SectionTitle>
        <View style={[styles.card, styles.mapPreview]}>
          <View style={styles.routeOne} />
          <View style={styles.routeTwo} />
          <View style={[styles.mapPerson, { left: '20%', top: '25%' }]}><Text style={styles.mapPersonText}>AN</Text></View>
          <View style={[styles.mapPerson, { right: '22%', bottom: '24%' }]}><Text style={styles.mapPersonText}>M</Text></View>
          <Text style={styles.mapCaption}>Budapest · családi helyzet</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Event({ date, title, meta }: { date: string; title: string; meta: string }) {
  return (
    <View style={styles.eventRow}>
      <View style={styles.dateBadge}><Text style={styles.month}>MÁJ</Text><Text style={styles.day}>{date}</Text></View>
      <View style={styles.flex}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemMeta}>{meta}</Text></View>
    </View>
  );
}

function Notice({ icon, tone, title, meta }: { icon: string; tone: 'green' | 'pink'; title: string; meta: string }) {
  return (
    <View style={styles.noticeRow}>
      <Text style={tone === 'green' ? styles.success : styles.pink}>{icon}</Text>
      <View style={styles.flex}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemMeta}>{meta}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  familyRow: { gap: 13, paddingVertical: 5, paddingRight: 10 },
  person: { alignItems: 'center', width: 54, gap: 5 },
  avatarRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, padding: 2 },
  avatar: { flex: 1, borderRadius: 22, backgroundColor: '#2D3B52', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#F8FAFC', fontSize: 12, fontWeight: '800' },
  onlineDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', right: -2, bottom: 3, borderWidth: 2, borderColor: '#071123' },
  addAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#2A3A55', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#91A0B7', fontSize: 28, fontWeight: '300' },
  personName: { color: '#F1F5F9', fontSize: 11 },
  mutedName: { color: '#8290A8', fontSize: 11 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  sectionAction: { color: '#4A94FF', fontSize: 11, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickCard: { flex: 1, minHeight: 78, backgroundColor: '#101D33', borderWidth: 1, borderColor: '#20304A', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 7 },
  quickIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickIconText: { fontSize: 18, fontWeight: '800' },
  quickLabel: { color: '#E7EDF7', fontSize: 10, fontWeight: '600' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBadge: { width: 34, height: 38, backgroundColor: '#172641', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  month: { color: '#F97316', fontSize: 8, fontWeight: '800' },
  day: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  itemTitle: { color: '#E8EEF8', fontSize: 11, fontWeight: '700' },
  itemMeta: { color: '#8290A8', fontSize: 9, marginTop: 2 },
  flex: { flex: 1 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  success: { width: 26, height: 26, textAlign: 'center', lineHeight: 26, borderRadius: 13, color: '#10B981', backgroundColor: '#0D3B3A', fontWeight: '800' },
  pink: { width: 26, height: 26, textAlign: 'center', lineHeight: 26, borderRadius: 13, color: '#EC4899', backgroundColor: '#3B183A' },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  pillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#351A3B', alignItems: 'center', justifyContent: 'center' },
  pillText: { color: '#EC4899', fontSize: 22, fontWeight: '800' },
  reminderTitle: { color: '#F1F5F9', fontSize: 13, fontWeight: '800' },
  check: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#12C69A', alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#FFFFFF', fontWeight: '900' },
  mapPreview: { height: 145, overflow: 'hidden', backgroundColor: '#0A1728' },
  routeOne: { position: 'absolute', width: '120%', height: 7, backgroundColor: '#12D8C2', opacity: 0.7, transform: [{ rotate: '-13deg' }], top: 66, left: -30, borderRadius: 5 },
  routeTwo: { position: 'absolute', width: '90%', height: 3, backgroundColor: '#87F65E', opacity: 0.8, transform: [{ rotate: '18deg' }], top: 75, left: 10, borderRadius: 4 },
  mapPerson: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5D0B5', borderWidth: 3, borderColor: '#EC4899', alignItems: 'center', justifyContent: 'center' },
  mapPersonText: { color: '#35251E', fontSize: 9, fontWeight: '900' },
  mapCaption: { position: 'absolute', left: 12, bottom: 8, color: '#90A1B9', fontSize: 9 },
});
