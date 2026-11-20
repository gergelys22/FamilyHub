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
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafetyCardScreen() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
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
    const [nextProfiles, nextChecks] = await Promise.all([
      getSafetyProfiles(id),
      getSafetyChecks(id),
    ]);
    setProfiles(nextProfiles);
    setChecks(nextChecks);
  }

  useEffect(() => {
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        if (!id) return;
        const [familyMembers, nextProfiles, nextChecks] = await Promise.all([
          getFamilyMembers(id),
          getSafetyProfiles(id),
          getSafetyChecks(id),
        ]);
        setMembers(familyMembers);
        setProfiles(nextProfiles);
        setChecks(nextChecks);
        setSelectedProfileId(profile?.id ?? familyMembers[0]?.profile_id ?? null);
      })
      .catch((caught) =>
        Alert.alert(
          'Betöltés sikertelen',
          caught instanceof Error ? caught.message : 'Próbáld újra.',
        ),
      );
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
      Alert.alert(
        'Mentés sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra.',
      );
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
      Alert.alert(
        'Mentés sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleCheck(check: SafetyCheck) {
    try {
      await setSafetyCheckCompleted(check.id, !check.completed);
      setChecks((current) =>
        current.map((item) =>
          item.id === check.id ? { ...item, completed: !item.completed } : item,
        ),
      );
    } catch (caught) {
      Alert.alert(
        'Frissítés sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra.',
      );
    }
  }

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
  const allergiesList = selectedSafety?.allergies ?? [];
  const openChecks = checks.filter((item) => !item.completed).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Sürgősségi kártya</Text>
        <Pressable
          onPress={openEdit}
          accessibilityLabel="Sürgősségi adatok szerkesztése"
          style={[styles.headerButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="create-outline" size={21} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {members.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRow}>
            {members.map((member) => (
              <Pressable
                key={member.profile_id}
                onPress={() => setSelectedProfileId(member.profile_id)}
                style={[
                  styles.memberChip,
                  {
                    backgroundColor:
                      selectedProfileId === member.profile_id ? palette.primary : palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.memberInitial,
                    {
                      backgroundColor:
                        selectedProfileId === member.profile_id ? colors.white : palette.primarySoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.memberInitialText,
                      { color: selectedProfileId === member.profile_id ? palette.primary : palette.primary },
                    ]}
                  >
                    {(member.nickname || member.display_name).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={{
                    color: selectedProfileId === member.profile_id ? colors.white : palette.textPrimary,
                    fontWeight: '800',
                  }}
                >
                  {member.nickname || member.display_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.emergencyCard, { backgroundColor: isDark ? '#5B1F31' : '#FFF0F3', borderColor: isDark ? '#8B314A' : '#F5C7D1' }]}>
          <View style={styles.emergencyHeader}>
            <View style={[styles.bloodBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.bloodText}>{selectedSafety?.blood_type || '?'}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.emergencyName, { color: palette.textPrimary }]}>
                {selectedMember ? selectedMember.nickname || selectedMember.display_name : 'Családtag'}
              </Text>
              <Text style={[styles.emergencyLabel, { color: palette.textSecondary }]}>Sürgősségi egészségügyi kártya</Text>
            </View>
            {selectedSafety?.restricted ? (
              <Ionicons name="lock-closed" size={18} color={colors.danger} />
            ) : null}
          </View>
          <View style={styles.emergencyGrid}>
            <View style={styles.emergencyField}>
              <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Allergiák</Text>
              <Text style={[styles.fieldValue, { color: palette.textPrimary }]}>
                {allergiesList.length ? allergiesList.join(', ') : 'Nincs megadva'}
              </Text>
            </View>
            <View style={styles.emergencyField}>
              <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Gyógyszerek</Text>
              <Text style={[styles.fieldValue, { color: palette.textPrimary }]}>
                {selectedSafety?.medications_summary || 'Nincs megadva'}
              </Text>
            </View>
          </View>
          {selectedSafety?.emergency_notes ? (
            <View style={[styles.emergencyNote, { backgroundColor: palette.surface }]}>
              <Ionicons name="warning-outline" size={18} color={colors.danger} />
              <Text style={[styles.emergencyNoteText, { color: palette.textPrimary }]}>
                {selectedSafety.emergency_notes}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.infoCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Egészségügyi adatok</Text>
          <InfoRow
            icon="medical-outline"
            label="Krónikus vagy orvosi állapot"
            value={selectedSafety?.medical_conditions || 'Nincs megadva'}
            palette={palette}
          />
          <InfoRow
            icon="person-outline"
            label="Családorvos"
            value={selectedSafety?.doctor_name || 'Nincs megadva'}
            palette={palette}
          />
          <InfoRow
            icon="call-outline"
            label="Orvosi elérhetőség"
            value={selectedSafety?.doctor_phone || 'Nincs megadva'}
            palette={palette}
          />
          <InfoRow
            icon="card-outline"
            label="Biztosító"
            value={selectedSafety?.insurance_name || 'Nincs megadva'}
            palette={palette}
          />
          {selectedSafety?.insurance_number ? (
            <InfoRow
              icon="barcode-outline"
              label="Biztosítási azonosító"
              value={selectedSafety.insurance_number}
              palette={palette}
            />
          ) : null}
        </View>

        <View style={styles.checkHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Biztonsági ellenőrzés</Text>
            <Text style={[styles.checkCount, { color: palette.textMuted }]}>{openChecks} nyitott feladat</Text>
          </View>
          <Pressable
            onPress={() => setCheckVisible(true)}
            style={[styles.addCheckButton, { backgroundColor: palette.primary }]}
          >
            <Ionicons name="add" size={18} color={colors.white} />
          </Pressable>
        </View>

        {checks.map((check) => (
          <Pressable
            key={check.id}
            onPress={() => void toggleCheck(check)}
            style={[styles.checkCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <View
              style={[
                styles.checkBox,
                {
                  borderColor: check.completed ? palette.success : palette.borderStrong,
                  backgroundColor: check.completed ? palette.success : 'transparent',
                },
              ]}
            >
              {check.completed ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
            </View>
            <View style={styles.flex}>
              <Text
                style={[
                  styles.checkTitle,
                  { color: palette.textPrimary },
                  check.completed && { color: palette.textMuted, textDecorationLine: 'line-through' },
                ]}
              >
                {check.title}
              </Text>
              {check.description ? (
                <Text style={[styles.checkDescription, { color: palette.textSecondary }]}>{check.description}</Text>
              ) : null}
              {check.due_at ? (
                <Text style={[styles.checkDue, { color: palette.warning }]}>
                  Határidő: {new Date(check.due_at).toLocaleDateString('hu-HU')}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Egészségügyi adatok</Text>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Vércsoport</Text>
              <View style={styles.bloodOptions}>
                {bloodTypes.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setBloodType(item)}
                    style={[styles.bloodOption, { backgroundColor: bloodType === item ? colors.danger : palette.surfaceElevated }]}
                  >
                    <Text style={{ color: bloodType === item ? colors.white : palette.textSecondary, fontWeight: '900' }}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={allergies} onChangeText={setAllergies} placeholder="Allergiák vesszővel elválasztva" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={medicalConditions} onChangeText={setMedicalConditions} placeholder="Krónikus állapotok vagy orvosi megjegyzések" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} multiline />
              <TextInput value={medicationsSummary} onChangeText={setMedicationsSummary} placeholder="Rendszeres gyógyszerek" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} multiline />
              <TextInput value={emergencyNotes} onChangeText={setEmergencyNotes} placeholder="Sürgősségi figyelmeztetés" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} multiline />
              <TextInput value={doctorName} onChangeText={setDoctorName} placeholder="Családorvos neve" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={doctorPhone} onChangeText={setDoctorPhone} placeholder="Családorvos telefonszáma" keyboardType="phone-pad" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={insuranceName} onChangeText={setInsuranceName} placeholder="Biztosító neve" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={insuranceNumber} onChangeText={setInsuranceNumber} placeholder="Biztosítási azonosító" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <View style={styles.restrictedRow}>
                <View style={styles.flex}>
                  <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Korlátozott hozzáférés</Text>
                  <Text style={[styles.restrictedText, { color: palette.textMuted }]}>Csak saját profil és családi admin láthatja.</Text>
                </View>
                <Switch value={restricted} onValueChange={setRestricted} trackColor={{ false: palette.border, true: palette.primaryLight }} thumbColor={restricted ? colors.white : undefined} />
              </View>
              <View style={styles.modalActions}>
                <Pressable onPress={() => setEditVisible(false)} style={styles.cancelButton}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => void saveProfile()} style={[styles.saveButton, { backgroundColor: palette.primary }]}>
                  <Text style={styles.saveText}>{busy ? 'Mentés…' : 'Mentés'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={checkVisible} transparent animationType="slide" onRequestClose={() => setCheckVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Új biztonsági ellenőrzés</Text>
              <TextInput value={checkTitle} onChangeText={setCheckTitle} placeholder="Feladat címe" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <TextInput value={checkDescription} onChangeText={setCheckDescription} placeholder="Leírás (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, styles.textArea, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} multiline />
              <TextInput value={checkDueAt} onChangeText={setCheckDueAt} placeholder="Határidő: 2026-12-31 (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setCheckVisible(false)} style={styles.cancelButton}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => void saveCheck()} style={[styles.saveButton, { backgroundColor: palette.primary }]}>
                  <Text style={styles.saveText}>{busy ? 'Mentés…' : 'Létrehozás'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  palette,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  palette: typeof colors | typeof darkColors;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name={icon} size={19} color={palette.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: palette.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 21, fontWeight: '900' },
  headerButton: { width: 42, height: 42, borderWidth: 1, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  memberRow: { gap: spacing.sm, paddingRight: spacing.md },
  memberChip: { minHeight: 48, paddingRight: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.round },
  memberInitial: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  memberInitialText: { fontSize: 13, fontWeight: '900' },
  emergencyCard: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.xl },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bloodBadge: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  bloodText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  emergencyName: { fontSize: 17, fontWeight: '900' },
  emergencyLabel: { marginTop: 3, fontSize: 11, fontWeight: '700' },
  emergencyGrid: { flexDirection: 'row', gap: spacing.sm },
  emergencyField: { flex: 1, minHeight: 74, padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.72)' },
  fieldLabel: { fontSize: 10, fontWeight: '900' },
  fieldValue: { marginTop: 5, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  emergencyNote: { minHeight: 48, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md },
  emergencyNoteText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  infoCard: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.xl },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  infoRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoValue: { marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  checkHeader: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkCount: { marginTop: 3, fontSize: 11 },
  addCheckButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  checkCard: { minHeight: 74, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  checkBox: { width: 28, height: 28, borderWidth: 2, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  checkTitle: { fontSize: 13, fontWeight: '900' },
  checkDescription: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  checkDue: { marginTop: 3, fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '92%', borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalContent: { padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  textArea: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
  bloodOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bloodOption: { width: 52, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  restrictedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  restrictedText: { marginTop: 3, fontSize: 10, lineHeight: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  cancelButton: { padding: spacing.md },
  saveButton: { minHeight: 48, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  saveText: { color: colors.white, fontWeight: '900' },
});
