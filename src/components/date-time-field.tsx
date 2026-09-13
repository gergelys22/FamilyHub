import { colors } from '@/constants/theme';
import {
    formatPickerValue,
    getPickerDate,
    type DateTimeFieldProps,
} from '@/utils/event-date-time';
import DateTimePicker, {
    DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function DateTimeField({
  label,
  mode,
  value,
  onChange,
  disabled = false,
  clearable = false,
}: DateTimeFieldProps) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(() => new Date());
  const draftRef = useRef(draft);
  const mounted = useRef(false);
  const androidOpen = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      if (Platform.OS === 'android' && androidOpen.current) {
        androidOpen.current = false;
        void DateTimePickerAndroid.dismiss(mode).catch(() => undefined);
      }
    };
  }, [mode]);

  function showError() {
    androidOpen.current = false;

    if (mounted.current) {
      Alert.alert(
        'Nem nyitható meg a választó',
        'Ellenőrizd, hogy az új dátumválasztóval készült development build van-e telepítve.',
      );
    }
  }

  function openPicker() {
    if (disabled || androidOpen.current) return;

    Keyboard.dismiss();
    const initial = getPickerDate(value, mode);

    if (Platform.OS === 'android') {
      androidOpen.current = true;

      try {
        DateTimePickerAndroid.open({
          value: initial,
          mode,
          display: 'default',
          is24Hour: true,
          positiveButton: { label: 'Kész' },
          negativeButton: { label: 'Mégse' },
          onValueChange: (_, selectedDate) => {
            androidOpen.current = false;

            if (mounted.current) {
              onChange(formatPickerValue(selectedDate, mode));
            }
          },
          onDismiss: () => {
            androidOpen.current = false;
          },
          onError: showError,
        });
      } catch {
        showError();
      }

      return;
    }

    draftRef.current = initial;
    setDraft(initial);
    setVisible(true);
  }

  const displayedValue = value
    ? mode === 'date'
      ? `${value.split('-').join('. ')}.`
      : value
    : 'Nincs megadva';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${displayedValue}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={openPicker}
          style={[styles.input, disabled && styles.disabled]}>
          <Text style={styles.value}>{displayedValue}</Text>
          <Text style={styles.arrow}>⌄</Text>
        </Pressable>

        {clearable && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} törlése`}
            disabled={disabled}
            onPress={() => onChange('')}
            style={styles.clearButton}>
            <Text style={styles.arrow}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Mégse"
            style={StyleSheet.absoluteFill}
            onPress={() => setVisible(false)}
          />

          <View style={styles.dialog}>
            <Text style={styles.title}>{label}</Text>

            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              locale="hu-HU"
              themeVariant="dark"
              textColor={colors.textPrimary}
              onValueChange={(_, selectedDate) => {
                draftRef.current = selectedDate;
                setDraft(selectedDate);
              }}
              style={styles.picker}
            />

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setVisible(false)}
                style={styles.action}>
                <Text style={styles.value}>Mégse</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(formatPickerValue(draftRef.current, mode));
                  setVisible(false);
                }}
                style={[styles.action, styles.confirm]}>
                <Text style={styles.value}>Kész</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: { color: colors.textPrimary, fontSize: 15 },
  arrow: { color: colors.primaryLight, fontSize: 22 },
  clearButton: {
    width: 32,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  picker: { width: '100%' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  action: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  confirm: { backgroundColor: colors.primary },
});