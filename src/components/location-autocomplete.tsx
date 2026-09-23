import { colors } from '@/constants/theme';
import { searchPlaces, type PlaceSuggestion } from '@/services/places';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: PlaceSuggestion) => void;
  disabled?: boolean;
};

type SearchResult = {
  query: string;
  items: PlaceSuggestion[];
  error: string | null;
};

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);

  const requestId = useRef(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = value.trim();
  const eligible = query.length >= 3 && query.length <= 200;
  const currentResult = result?.query === query ? result : null;

  useEffect(() => {
    if (!open || disabled || !eligible) return;

    const id = ++requestId.current;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      void searchPlaces(query, controller.signal)
        .then((items) => {
          if (controller.signal.aborted || requestId.current !== id) return;

          setResult({ query, items, error: null });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || requestId.current !== id) return;

          setResult({
            query,
            items: [],
            error:
              error instanceof Error
                ? error.message
                : 'A helyszínkeresés nem sikerült.',
          });
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, eligible, open, query, revision]);

  useEffect(() => {
    return () => {
      requestId.current += 1;

      if (blurTimer.current !== null) {
        clearTimeout(blurTimer.current);
      }
    };
  }, []);

  function clearBlurTimer() {
    if (blurTimer.current !== null) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function beginSearch() {
    clearBlurTimer();
    requestId.current += 1;
    setResult(null);
    setOpen(true);
    setRevision((current) => current + 1);
  }

  function selectPlace(place: PlaceSuggestion) {
    clearBlurTimer();
    requestId.current += 1;
    setOpen(false);
    setResult(null);
    onChange(place.label);
    onSelect?.(place);
    Keyboard.dismiss();
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Helyszín</Text>

      <TextInput
        accessibilityLabel="Helyszín keresése"
        value={value}
        editable={!disabled}
        maxLength={200}
        autoCorrect={false}
        placeholder="Például: Müpa Budapest vagy Kossuth Lajos utca 1, Pécs"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, disabled && styles.disabled]}
        onFocus={beginSearch}
        onChangeText={(nextValue) => {
          onChange(nextValue);
          beginSearch();
        }}
        onBlur={() => {
          requestId.current += 1;
          clearBlurTimer();

          // A találatra történő koppintás még feldolgozható marad.
          blurTimer.current = setTimeout(() => setOpen(false), 180);
        }}
      />

      {open && !disabled ? (
        <View style={styles.dropdown}>
          {!eligible ? (
            <Text style={styles.message}>
              Írj be legalább 3 karaktert.
            </Text>
          ) : !currentResult ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primaryLight} />
              <Text style={styles.message}>Helyszínek keresése…</Text>
            </View>
          ) : currentResult.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{currentResult.error}</Text>

              <Pressable
                accessibilityRole="button"
                onPressIn={clearBlurTimer}
                onPress={beginSearch}
                style={styles.retry}>
                <Text style={styles.retryText}>Újrapróbálás</Text>
              </Pressable>
            </View>
          ) : currentResult.items.length === 0 ? (
            <Text style={styles.message}>
              Nincs találat. Pontosítsd a keresést, vagy hagyd meg a beírt
              helyszínt.
            </Text>
          ) : (
            currentResult.items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Helyszín kiválasztása: ${item.label}`}
                onPressIn={clearBlurTimer}
                onPress={() => selectPlace(item)}
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.placeIcon}>⌖</Text>
                <Text style={styles.suggestionText}>{item.label}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      <Text style={styles.hint}>
        Opcionális. Írd be a hely nevét a várossal vagy a pontos címmel együtt.
      </Text>

      <Text style={styles.attribution}>
        <Link href="https://www.geoapify.com/">Powered by Geoapify</Link>
        {' · '}
        <Link href="https://www.openstreetmap.org/copyright">
          © OpenStreetMap contributors
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  input: {
    minHeight: 50,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
  },
  message: {
    flexShrink: 1,
    padding: 14,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  placeIcon: { color: colors.primaryLight, fontSize: 24 },
  suggestionText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  errorBox: { padding: 14, gap: 10 },
  errorText: { color: '#FB7185', fontSize: 13, lineHeight: 20 },
  retry: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 16 },
  retryText: { color: colors.primaryLight, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12 },
  attribution: { color: colors.textMuted, fontSize: 10, lineHeight: 16 },
  disabled: { opacity: 0.5 },
  pressed: { backgroundColor: '#1D3557' },
});
