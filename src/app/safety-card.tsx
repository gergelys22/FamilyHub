import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import {
  getSafetyChecks,
  getSafetyProfiles,
  saveSafetyCheck,
  saveSafetyProfile,
  setSafetyCheckCompleted,
  type SafetyCheck,
  type SafetyProfile,
} from '@/services/safety';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;
type Styles = ReturnType<typeof createStyles>;

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];

function createStyles(palette: Palette, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.background },
    flex: { flex: 1 },
    header: {
      minHeight: 64,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { color: palette.textPrimary, fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
    headerButton: {
      width: 42,
      height: 42,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
    },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md },
    loader: { paddingVertical: spacing.xl },

    memberRow: { gap: spacing.sm, paddingRight: spacing.md },
    memberChip: {
      minHeight: 48,
      paddingLeft: 5,
      paddingRight: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.round,
      backgroundColor: palette.surface,
    },
    memberChipActive: { borderColor: palette.primary, backgroundColor: palette.primary },
    memberInitial: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primarySoft,
    },
    memberInitialActive: { backgroundColor: 'rgba(255,255,255,0.92)' },
    memberInitialText: { color: palette.primary, fontSize: 14, fontWeight: '900' },
    memberName: { color: palette.textPrimary, fontSize: 13, fontWeight: '800' },
    memberNameActive: { color: '#FFFFFF' },

    emergencyCard: {
      padding: spacing.lg,
      gap: spacing.md,
      borderRadius: radius.xl,
      overflow: 'hidden',
      ...shadows.floating,
    },
    emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    bloodBadge: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 32,
      backgroundColor: '#FFFFFF',
      ...shadows.card,
    },
    bloodText: { color: '#C62A41', fontSize: 22, fontWeight: '900' },
    bloodCaption: { color: '#C62A41', fontSize: 8, fontWeight: '900', letterSpacing: 0.6, marginTop: -2 },
    emergencyName: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
    emergencyLabel: { marginTop: 3, color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' },
    lockBadge: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    emergencyBlock: {
      padding: spacing.md,
      gap: 8,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    emergencyBlockLabel: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    emergencyBlockValue: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontWeight: '800' },
    allergyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    allergyChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.round,
      backgroundColor: '#FFFFFF',
    },
    allergyChipText: { color: '#B3213A', fontSize: 12, fontWeight: '900' },
    emergencyNote: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: '#FFFFFF',
    },
    emergencyNoteText: { flex: 1, color: '#7A1627', fontSize: 13, lineHeight: 18, fontWeight: '800' },
    callButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: '#FFFFFF',
    },
    callButtonText: { color: '#B3213A', fontSize: 14, fontWeight: '900' },

    infoCard: {
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.xl,
      backgroundColor: palette.surface,
      ...shadows.card,
    },
    sectionTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: '900' },
    infoRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primarySoft,
    },
    fieldLabel: { color: palette.textMuted, fontSize: 11, fontWeight: '800' },
    infoValue: { marginTop: 3, color: palette.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '800' },
    infoValueEmpty: { color: palette.textMuted, fontWeight: '600' },

    checkHeader: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    checkCount: { marginTop: 3, color: palette.textMuted, fontSize: 12 },
    addCheckButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primary,
      ...shadows.floating,
    },
    checkCard: {
      minHeight: 74,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.surface,
      ...shadows.card,
    },
    checkCardDone: { opacity: 0.7 },
    checkBox: {
      width: 28,
      height: 28,
      borderWidth: 2,
      borderColor: palette.borderStrong,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxDone: { borderColor: palette.success, backgroundColor: palette.success },
    checkTitle: { color: palette.textPrimary, fontSize: 14, fontWeight: '900' },
    checkTitleDone: { color: palette.textMuted, textDecorationLine: 'line-through' },
    checkDescription: { marginTop: 3, color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
    dueChip: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.round,
    },
    dueChipText: { fontSize: 11, fontWeight: '800' },
    emptyCard: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: palette.borderStrong,
      borderRadius: radius.xl,
      backgroundColor: palette.surface,
    },
    emptyText: { color: palette.textMuted, fontSize: 13, textAlign: 'center' },
    pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },

    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)',
    },
    overlayDismiss: { flex: 1 },
    modal: {
      maxHeight: '92%',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderColor: palette.border,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: palette.surface,
    },
    grabber: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: palette.borderStrong,
    },
    modalHeader: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    modalIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 19,
      backgroundColor: palette.primarySoft,
    },
    modalIconDanger: { backgroundColor: isDark ? '#5B1F31' : '#FFE4E9' },
    modalTitle: { color: palette.textPrimary, fontSize: 20, fontWeight: '900' },
    modalContent: { padding: spacing.xl, gap: spacing.md },
    modalLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: '900' },
    input: {
      minHeight: 50,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.background,
      color: palette.textPrimary,
    },
    textArea: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
    bloodOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    bloodOption: {
      width: 62,
      height: 44,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceElevated,
    },
    bloodOptionActive: { borderColor: palette.danger, backgroundColor: palette.danger },
    bloodOptionText: { color: palette.textSecondary, fontSize: 14, fontWeight: '900' },
    bloodOptionTextActive: { color: '#FFFFFF' },
    restrictedRow: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.lg,
      backgroundColor: palette.background,
    },
    restrictedTitle: { color: palette.textPrimary, fontSize: 13, fontWeight: '900' },
    restrictedText: { marginTop: 3, color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
    cancelButton: { padding: spacing.md },
    cancelText: { color: palette.textSecondary, fontWeight: '800' },
    saveButton: {
      minHeight: 48,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg,
      backgroundColor: palette.primary,
    },
    saveText: { color: palette.white, fontWeight: '900' },
    disabled: { opacity: 0.55 },
  });
}

function InfoRow({
  icon,
  label,
  value,
  palette,
  styles,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string | null | undefined;
  palette: Palette;
  styles: Styles;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={19} color={palette.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.infoValue, !value && styles.infoValueEmpty]}>{value || 'Nincs megadva'}</Text>
      </View>
    </View>
  );
}

export default function SafetyCardScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const [nowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<SafetyProfile[]>([]);
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [editVisible, setEditVisible] = useState(false);
  const [checkVisible, setCheckVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [medicationsSummary, setMedicationsSummary] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [insuranceName, setInsuranceName] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [restricted, setRestricted] = useState(false);

  const [checkTitle, setCheckTitle] = useState('');
  const [checkDescription, setCheckDescription] = useState('');
  const [checkDueAt, setCheckDueAt] = useState('');

  async function reload(id = familyId) {
    if (!id) return;
    const [nextProfiles, nextChecks] = await Promise.all([getSafetyProfiles(id), getSafetyChecks(id)]);
    setProfiles(nextProfiles);
    setChecks(nextChecks);
  }

  useEffect(() => {
    let active = true;
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        if (!active) return;
        setFamilyId(id);
        if (!id) return;
        const [familyMembers, nextProfiles, nextChecks] = await Promise.all([
          getFamilyMembers(id),
          getSafetyProfiles(id),
          getSafetyChecks(id),
        ]);
        if (!active) return;
        setMembers(familyMembers);
        setProfiles(nextProfiles);
        setChecks(nextChecks);
        setSelectedProfileId(profile?.id ?? familyMembers[0]?.profile_id ?? null);
      })
      .catch((caught) => {
        if (active) {
          Alert.alert('Betöltés sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile?.id]);

  const selectedMember = useMemo(
    () => members.find((member) => member.profile_id === selectedProfileId) ?? null,
    [members, selectedProfileId],
  );

  const selectedSafety = useMemo(
    () => profiles.find((item) => item.profile_id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  function openEdit() {
    setBloodType(selectedSafety?.blood_type ?? '');
    setAllergies((selectedSafety?.allergies ?? []).join(', '));
    setMedicalConditions(selectedSafety?.medical_conditions ?? '');
    setMedicationsSummary(selectedSafety?.medications_summary ?? '');
    setEmergencyNotes(selectedSafety?.emergency_notes ?? '');
    setDoctorName(selectedSafety?.doctor_name ?? '');
    setDoctorPhone(selectedSafety?.doctor_phone ?? '');
    setInsuranceName(selectedSafety?.insurance_name ?? '');
    setInsuranceNumber(selectedSafety?.insurance_number ?? '');
    setRestricted(selectedSafety?.restricted ?? false);
    setEditVisible(true);
  }

  async function saveProfile() {
    if (!familyId || !selectedProfileId) return;
    setBusy(true);
    try {
      await saveSafetyProfile({
        familyId,
        profileId: selectedProfileId,
        bloodType,
        allergies: allergies
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        medicalConditions,
        medicationsSummary,
        emergencyNotes,
        doctorName,
        doctorPhone,
        insuranceName,
        insuranceNumber,
        restricted,
      });
      await reload();
      setEditVisible(false);
    } catch (caught) {
      Alert.alert('Mentés sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  async function saveCheck() {
    if (!familyId || !profile?.id || !checkTitle.trim()) {
      Alert.alert('Hiányzó adat', 'Adj meg ellenőrzési címet.');
      return;
    }
    let dueAt: string | null = null;
    if (checkDueAt.trim()) {
      const parsed = new Date(`${checkDueAt.trim()}T12:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        Alert.alert('Hibás dátum', 'Használd ezt a formátumot: 2026-12-31');
        return;
      }
      dueAt = parsed.toISOString();
    }
    setBusy(true);
    try {
      await saveSafetyCheck({
        familyId,
        profileId: profile.id,
        title: checkTitle,
        description: checkDescription,
        dueAt,
      });
      setCheckTitle('');
      setCheckDescription('');
      setCheckDueAt('');
      setCheckVisible(false);
      await reload();
    } catch (caught) {
      Alert.alert('Mentés sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleCheck(check: SafetyCheck) {
    try {
      await setSafetyCheckCompleted(check.id, !check.completed);
      setChecks((current) =>
        current.map((item) => (item.id === check.id ? { ...item, completed: !item.completed } : item)),
      );
    } catch (caught) {
      Alert.alert('Frissítés sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
    }
  }

  function callDoctor(phone: string) {
    const sanitized = phone.replace(/[^\d+]/g, '');
    if (!sanitized) return;
    void Linking.openURL(`tel:${sanitized}`).catch(() =>
      Alert.alert('Hívás sikertelen', 'Nem sikerült megnyitni a tárcsázót.'),
    );
  }

  const allergiesList = selectedSafety?.allergies ?? [];
  const openChecks = checks.filter((item) => !item.completed).length;
  const memberName = selectedMember ? selectedMember.nickname || selectedMember.display_name : 'Családtag';
  const doctorPhoneValue = selectedSafety?.doctor_phone?.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={styles.title}>Sürgősségi kártya</Text>
        <Pressable
          onPress={openEdit}
          accessibilityRole="button"
          accessibilityLabel="Sürgősségi adatok szerkesztése"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="create-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <ActivityIndicator color={palette.primary} style={styles.loader} /> : null}

        {members.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRow}>
            {members.map((member) => {
              const active = selectedProfileId === member.profile_id;
              const name = member.nickname || member.display_name;
              return (
                <Pressable
                  key={member.profile_id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedProfileId(member.profile_id)}
                  style={[styles.memberChip, active && styles.memberChipActive]}
                >
                  <View style={[styles.memberInitial, active && styles.memberInitialActive]}>
                    <Text style={styles.memberInitialText}>{name.charAt(0).toLocaleUpperCase('hu-HU')}</Text>
                  </View>
                  <Text style={[styles.memberName, active && styles.memberNameActive]}>{name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!loading ? (
          <LinearGradient
            colors={isDark ? ['#9B2335', '#5B1F31'] : ['#E5384F', '#B3213A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emergencyCard}
          >
            <View style={styles.emergencyHeader}>
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodText}>{selectedSafety?.blood_type || '?'}</Text>
                <Text style={styles.bloodCaption}>VÉRCSOPORT</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.emergencyName} numberOfLines={1}>
                  {memberName}
                </Text>
                <Text style={styles.emergencyLabel}>Sürgősségi egészségügyi kártya</Text>
              </View>
              {selectedSafety?.restricted ? (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
                </View>
              ) : null}
            </View>

            {selectedSafety?.emergency_notes ? (
              <View style={styles.emergencyNote}>
                <Ionicons name="warning" size={22} color="#B3213A" />
                <Text style={styles.emergencyNoteText}>{selectedSafety.emergency_notes}</Text>
              </View>
            ) : null}

            <View style={styles.emergencyBlock}>
              <Text style={styles.emergencyBlockLabel}>Allergiák</Text>
              {allergiesList.length ? (
                <View style={styles.allergyRow}>
                  {allergiesList.map((item) => (
                    <View key={item} style={styles.allergyChip}>
                      <Text style={styles.allergyChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emergencyBlockValue}>Nincs megadva</Text>
              )}
            </View>

            <View style={styles.emergencyBlock}>
              <Text style={styles.emergencyBlockLabel}>Rendszeres gyógyszerek</Text>
              <Text style={styles.emergencyBlockValue}>
                {selectedSafety?.medications_summary || 'Nincs megadva'}
              </Text>
            </View>

            {doctorPhoneValue ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Családorvos hívása"
                onPress={() => callDoctor(doctorPhoneValue)}
                style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
              >
                <Ionicons name="call" size={18} color="#B3213A" />
                <Text style={styles.callButtonText}>
                  Családorvos hívása{selectedSafety?.doctor_name ? ` · ${selectedSafety.doctor_name}` : ''}
                </Text>
              </Pressable>
            ) : null}
          </LinearGradient>
        ) : null}

        {!loading ? (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Egészségügyi adatok</Text>
            <InfoRow
              icon="medical-outline"
              label="Krónikus vagy orvosi állapot"
              value={selectedSafety?.medical_conditions}
              palette={palette}
              styles={styles}
            />
            <View style={styles.infoDivider} />
            <InfoRow
              icon="person-outline"
              label="Családorvos"
              value={selectedSafety?.doctor_name}
              palette={palette}
              styles={styles}
            />
            <View style={styles.infoDivider} />
            <InfoRow
              icon="call-outline"
              label="Orvosi elérhetőség"
              value={selectedSafety?.doctor_phone}
              palette={palette}
              styles={styles}
            />
            <View style={styles.infoDivider} />
            <InfoRow
              icon="card-outline"
              label="Biztosító"
              value={selectedSafety?.insurance_name}
              palette={palette}
              styles={styles}
            />
            {selectedSafety?.insurance_number ? (
              <>
                <View style={styles.infoDivider} />
                <InfoRow
                  icon="barcode-outline"
                  label="Biztosítási azonosító"
                  value={selectedSafety.insurance_number}
                  palette={palette}
                  styles={styles}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {!loading ? (
          <>
            <View style={styles.checkHeader}>
              <View>
                <Text style={styles.sectionTitle}>Biztonsági ellenőrzés</Text>
                <Text style={styles.checkCount}>{openChecks} nyitott feladat</Text>
              </View>
              <Pressable
                onPress={() => setCheckVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Új biztonsági ellenőrzés"
                style={({ pressed }) => [styles.addCheckButton, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={22} color={palette.white} />
              </Pressable>
            </View>

            {checks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="shield-checkmark-outline" size={30} color={palette.textMuted} />
                <Text style={styles.emptyText}>Még nincs biztonsági ellenőrzési feladat.</Text>
              </View>
            ) : null}

            {checks.map((check) => {
              const overdue = Boolean(check.due_at && !check.completed && new Date(check.due_at).getTime() < nowMs);
              return (
                <Pressable
                  key={check.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: check.completed }}
                  accessibilityLabel={check.title}
                  onPress={() => void toggleCheck(check)}
                  style={({ pressed }) => [styles.checkCard, check.completed && styles.checkCardDone, pressed && styles.pressed]}
                >
                  <View style={[styles.checkBox, check.completed && styles.checkBoxDone]}>
                    {check.completed ? <Ionicons name="checkmark" size={17} color={palette.white} /> : null}
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.checkTitle, check.completed && styles.checkTitleDone]}>{check.title}</Text>
                    {check.description ? <Text style={styles.checkDescription}>{check.description}</Text> : null}
                    {check.due_at ? (
                      <View
                        style={[
                          styles.dueChip,
                          { backgroundColor: overdue ? `${palette.warning}26` : palette.surfaceElevated },
                        ]}
                      >
                        <Ionicons
                          name={overdue ? 'alarm' : 'calendar-outline'}
                          size={12}
                          color={overdue ? palette.warning : palette.textSecondary}
                        />
                        <Text
                          style={[
                            styles.dueChipText,
                            { color: overdue ? palette.warning : palette.textSecondary },
                          ]}
                        >
                          {new Date(check.due_at).toLocaleDateString('hu-HU')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayDismiss} onPress={() => setEditVisible(false)} />
          <View style={[styles.modal, { paddingBottom: insets.bottom }]}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, styles.modalIconDanger]}>
                <Ionicons name="medkit" size={20} color={palette.danger} />
              </View>
              <Text style={styles.modalTitle}>Egészségügyi adatok</Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.modalLabel}>Vércsoport</Text>
              <View style={styles.bloodOptions}>
                {bloodTypes.map((item) => {
                  const selected = bloodType === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setBloodType(item)}
                      style={[styles.bloodOption, selected && styles.bloodOptionActive]}
                    >
                      <Text style={[styles.bloodOptionText, selected && styles.bloodOptionTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={allergies}
                onChangeText={setAllergies}
                placeholder="Allergiák vesszővel elválasztva"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <TextInput
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                placeholder="Krónikus állapotok vagy orvosi megjegyzések"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
              />
              <TextInput
                value={medicationsSummary}
                onChangeText={setMedicationsSummary}
                placeholder="Rendszeres gyógyszerek"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
              />
              <TextInput
                value={emergencyNotes}
                onChangeText={setEmergencyNotes}
                placeholder="Sürgősségi figyelmeztetés"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
              />
              <TextInput
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="Családorvos neve"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <TextInput
                value={doctorPhone}
                onChangeText={setDoctorPhone}
                placeholder="Családorvos telefonszáma"
                keyboardType="phone-pad"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <TextInput
                value={insuranceName}
                onChangeText={setInsuranceName}
                placeholder="Biztosító neve"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <TextInput
                value={insuranceNumber}
                onChangeText={setInsuranceNumber}
                placeholder="Biztosítási azonosító"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <View style={styles.restrictedRow}>
                <Ionicons name="lock-closed-outline" size={22} color={palette.textSecondary} />
                <View style={styles.flex}>
                  <Text style={styles.restrictedTitle}>Korlátozott hozzáférés</Text>
                  <Text style={styles.restrictedText}>Csak saját profil és családi admin láthatja.</Text>
                </View>
                <Switch
                  value={restricted}
                  onValueChange={setRestricted}
                  trackColor={{ false: palette.border, true: palette.primaryLight }}
                  thumbColor={restricted ? palette.white : undefined}
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable onPress={() => setEditVisible(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Mégse</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => void saveProfile()}
                  style={[styles.saveButton, busy && styles.disabled]}
                >
                  <Text style={styles.saveText}>{busy ? 'Mentés…' : 'Mentés'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={checkVisible} transparent animationType="slide" onRequestClose={() => setCheckVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.overlayDismiss} onPress={() => setCheckVisible(false)} />
          <View style={[styles.modal, { paddingBottom: insets.bottom }]}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="shield-checkmark" size={20} color={palette.primary} />
              </View>
              <Text style={styles.modalTitle}>Új biztonsági ellenőrzés</Text>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <TextInput
                value={checkTitle}
                onChangeText={setCheckTitle}
                placeholder="Feladat címe"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <TextInput
                value={checkDescription}
                onChangeText={setCheckDescription}
                placeholder="Leírás (opcionális)"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
              />
              <TextInput
                value={checkDueAt}
                onChangeText={setCheckDueAt}
                placeholder="Határidő: 2026-12-31 (opcionális)"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setCheckVisible(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Mégse</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => void saveCheck()}
                  style={[styles.saveButton, busy && styles.disabled]}
                >
                  <Text style={styles.saveText}>{busy ? 'Mentés…' : 'Létrehozás'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}