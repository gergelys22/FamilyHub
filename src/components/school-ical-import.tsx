import { colors, darkColors, radius, spacing } from '@/constants/theme';
import {
    getSchoolCalendarSubscriptions,
    importSchoolCalendarFile,
    isFileSubscription,
    removeSchoolCalendarSubscription,
    subscribeToSchoolCalendar,
    syncSchoolCalendar,
    type SchoolCalendarSubscription,
} from '@/services/school-ical';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Palette = typeof colors | typeof darkColors;

type Props = {
  familyId: string;
  childProfileId: string;
  childName: string;
  palette: Palette;
  accent: string;
  /** Sikeres import/szinkron után hívódik: töltsd újra az órarendet. */
  onChanged: () => void;
};

function formatSynced(value: string | null) {
  if (!value) return 'még nem futott';
  return new Date(value).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Próbáld újra később.';
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'naptár';
  }
}

export function IcalImportCard({ familyId, childProfileId, childName, palette, accent, onChanged }: Props) {
  const insets = useSafeAreaInsets();
  const [subs, setSubs] = useState<SchoolCalendarSubscription[]>([]);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getSchoolCalendarSubscriptions(familyId, childProfileId)
      .then((rows) => active && setSubs(rows))
      .catch(() => active && setSubs([]));
    return () => {
      active = false;
    };
  }, [familyId, childProfileId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  function done(result: { lessons: number; events: number }) {
    refresh();
    onChanged();
    Alert.alert(
      'Órarend frissítve',
      `${result.lessons} óra került a(z) ${childName} órarendjébe, ${result.events} esemény a családi naptárba.`,
    );
  }

  async function subscribe() {
    if (!link.trim()) return;
    setBusy('subscribe');
    try {
      const result = await subscribeToSchoolCalendar({ familyId, childProfileId, url: link.trim() });
      setLink('');
      setOpen(false);
      done(result);
    } catch (error) {
      Alert.alert('A feliratkozás nem sikerült', errorText(error));
    } finally {
      setBusy(null);
    }
  }

  async function pickFile() {
    setBusy('file');
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/calendar', 'application/ics', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const ics = await (await fetch(asset.uri)).text();
      if (!/BEGIN:VCALENDAR/i.test(ics)) {
        Alert.alert('Nem naptárfájl', 'A kiválasztott fájl nem iCalendar (.ics).');
        return;
      }
      const result = await importSchoolCalendarFile({ familyId, childProfileId, ics, label: asset.name });
      setOpen(false);
      done(result);
    } catch (error) {
      Alert.alert('Az import nem sikerült', errorText(error));
    } finally {
      setBusy(null);
    }
  }

  async function syncNow(sub: SchoolCalendarSubscription) {
    setBusy(sub.id);
    try {
      done(await syncSchoolCalendar(sub.id));
    } catch (error) {
      refresh();
      Alert.alert('A szinkron nem sikerült', errorText(error));
    } finally {
      setBusy(null);
    }
  }

  function unsubscribe(sub: SchoolCalendarSubscription) {
    Alert.alert(
      isFileSubscription(sub) ? 'Importált órarend törlése' : 'Leiratkozás',
      'Az innen importált órák és naptáresemények is törlődnek. A kézzel felvett elemek megmaradnak.',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: () => {
            void removeSchoolCalendarSubscription(sub.id)
              .then(() => {
                refresh();
                onChanged();
              })
              .catch((error) => Alert.alert('Törlés sikertelen', errorText(error)));
          },
        },
      ],
    );
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Órarend importálása naptárból"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: `${accent}14`, borderColor: `${accent}55` },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: `${accent}26` }]}>
          <Ionicons name="calendar-outline" size={20} color={accent} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Órarend importálása</Text>
          <Text style={[styles.cardText, { color: palette.textSecondary }]}>
            {subs.length > 0
              ? `${subs.length} forrás · utoljára: ${formatSynced(subs[0].last_synced_at)}`
              : 'Neptun/iCal link vagy .ics fájl alapján'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={accent} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable style={styles.flex} onPress={() => setOpen(false)} accessibilityLabel="Bezárás" />
          <View
            style={[
              styles.sheet,
              { backgroundColor: palette.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: palette.textPrimary }]}>Órarend importálása · {childName}</Text>
              <Pressable hitSlop={10} onPress={() => setOpen(false)} accessibilityLabel="Bezárás">
                <Ionicons name="close" size={24} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Feliratkozási link (webcal:// vagy https://)</Text>
              <TextInput
                value={link}
                onChangeText={setLink}
                placeholder="webcal://…"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[styles.input, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.background }]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy !== null || !link.trim()}
                onPress={() => void subscribe()}
                style={({ pressed }) => [
                  styles.primary,
                  { backgroundColor: accent, opacity: busy !== null || !link.trim() ? 0.5 : 1 },
                  pressed && styles.pressed,
                ]}
              >
                {busy === 'subscribe' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Feliratkozás és szinkron</Text>
                )}
              </Pressable>
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                A link automatikusan, rendszeresen frissül. A Neptunban az Órarend oldalon a naptár-exportálás / iCal
                feliratkozás lehetőségnél találod a linket (intézményenként eltérhet).
              </Text>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <Pressable
                accessibilityRole="button"
                disabled={busy !== null}
                onPress={() => void pickFile()}
                style={({ pressed }) => [
                  styles.secondary,
                  { borderColor: accent, opacity: busy !== null && busy !== 'file' ? 0.5 : 1 },
                  pressed && styles.pressed,
                ]}
              >
                {busy === 'file' ? (
                  <ActivityIndicator color={accent} />
                ) : (
                  <>
                    <Ionicons name="document-attach-outline" size={18} color={accent} />
                    <Text style={[styles.secondaryText, { color: accent }]}>.ics fájl kiválasztása</Text>
                  </>
                )}
              </Pressable>
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                A fájlból egyszeri import készül, ez nem frissül magától.
              </Text>

              {subs.length > 0 ? (
                <View style={styles.subList}>
                  <Text style={[styles.label, { color: palette.textSecondary }]}>Forrásaid</Text>
                  {subs.map((sub) => (
                    <View
                      key={sub.id}
                      style={[styles.sub, { borderColor: palette.border, backgroundColor: palette.background }]}
                    >
                      <View style={styles.flex}>
                        <Text style={[styles.subTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                          {isFileSubscription(sub) ? sub.label || 'Importált .ics fájl' : sub.label || hostOf(sub.url)}
                        </Text>
                        <Text
                          style={[styles.subMeta, { color: sub.last_error ? palette.danger : palette.textMuted }]}
                          numberOfLines={2}
                        >
                          {sub.last_error
                            ? sub.last_error
                            : `${sub.last_count ?? 0} esemény · ${formatSynced(sub.last_synced_at)}`}
                        </Text>
                      </View>
                      {!isFileSubscription(sub) ? (
                        <Pressable
                          hitSlop={8}
                          disabled={busy !== null}
                          onPress={() => void syncNow(sub)}
                          accessibilityLabel="Szinkronizálás most"
                        >
                          {busy === sub.id ? (
                            <ActivityIndicator color={accent} />
                          ) : (
                            <Ionicons name="sync-outline" size={22} color={accent} />
                          )}
                        </Pressable>
                      ) : null}
                      <Pressable hitSlop={8} onPress={() => unsubscribe(sub)} accessibilityLabel="Törlés">
                        <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  card: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  cardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  cardText: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
  label: { marginBottom: spacing.xs, fontSize: 12, fontWeight: '800' },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    fontSize: 14,
    fontWeight: '600',
  },
  primary: {
    minHeight: 48,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondary: {
    minHeight: 48,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  secondaryText: { fontSize: 15, fontWeight: '900' },
  hint: { marginTop: spacing.sm, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.lg },
  subList: { marginTop: spacing.lg, gap: spacing.sm },
  sub: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  subTitle: { fontSize: 14, fontWeight: '800' },
  subMeta: { marginTop: 2, fontSize: 12, fontWeight: '600' },
});
