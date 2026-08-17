import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { colors, radius, spacing } from '@/constants/theme';
import { Family, getMyFamilies } from '@/services/families';

type FamilySwitcherProps = {
  onActiveFamilyChange?: (family: Family | null) => void;
};

export function FamilySwitcher({ onActiveFamilyChange }: FamilySwitcherProps) {
  const router = useRouter();
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFamilies = useCallback(() => {
    let active = true;

    void getMyFamilies()
      .then((result) => {
        if (!active) return;

        setFamilies(result);
        setErrorMessage(null);
        setActiveFamilyId((currentId) => {
          const nextFamily = result.find((family) => family.id === currentId) ?? result[0] ?? null;
          onActiveFamilyChange?.(nextFamily);
          return nextFamily?.id ?? null;
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'A családok betöltése sikertelen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onActiveFamilyChange]);

  useFocusEffect(loadFamilies);

  function selectFamily(family: Family) {
    setActiveFamilyId(family.id);
    onActiveFamilyChange?.(family);
  }

  function retry() {
    setLoading(true);
    setErrorMessage(null);
    void getMyFamilies()
      .then((result) => {
        setFamilies(result);
        const nextFamily = result[0] ?? null;
        setActiveFamilyId(nextFamily?.id ?? null);
        onActiveFamilyChange?.(nextFamily);
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'A családok betöltése sikertelen.');
      })
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <View style={[styles.card, styles.centeredCard]}>
        <ActivityIndicator color={colors.primaryLight} size="small" />
        <Text style={styles.loadingText}>Családi körök betöltése…</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <View style={styles.errorIcon}><Text style={styles.errorIconText}>!</Text></View>
        <View style={styles.flex}>
          <Text style={styles.errorTitle}>Nem sikerült betölteni a családokat</Text>
          <Text numberOfLines={2} style={styles.errorMessage}>{errorMessage}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryText}>Újra</Text>
        </Pressable>
      </View>
    );
  }

  if (families.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>⌂</Text></View>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>Még nincs családi köröd</Text>
          <Text style={styles.emptyDescription}>Hozd létre az első privát teret a családod számára.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/create-family')}
          style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
          <Text style={styles.emptyButtonText}>Létrehozás</Text>
          <Text style={styles.emptyButtonArrow}>→</Text>
        </Pressable>
      </View>
    );
  }

  const activeFamily = families.find((family) => family.id === activeFamilyId) ?? families[0];

  return (
    <View style={styles.card}>
      <View pointerEvents="none" style={styles.cardGlow} />

      <View style={styles.cardHeader}>
        <View style={styles.eyebrowRow}>
          <View style={styles.liveDot} />
          <Text style={styles.eyebrow}>AKTÍV CSALÁDI KÖR</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{families.length}</Text>
        </View>
      </View>

      <View style={styles.activeFamilyRow}>
        <View style={styles.familyIcon}><Text style={styles.familyIconText}>⌂</Text></View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.familyName}>{activeFamily.name}</Text>
          <Text style={styles.familyMeta}>Privát családi munkatér</Text>
        </View>
        <View style={styles.secureBadge}>
          <Text style={styles.secureIcon}>✓</Text>
          <Text style={styles.secureText}>Védett</Text>
        </View>
      </View>

      {families.length > 1 ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.familyOptions}
          showsHorizontalScrollIndicator={false}>
          {families.map((family) => {
            const selected = family.id === activeFamily.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={family.id}
                onPress={() => selectFamily(family)}
                style={[styles.familyChip, selected && styles.familyChipSelected]}>
                <View style={[styles.chipDot, selected && styles.chipDotSelected]} />
                <Text numberOfLines={1} style={[styles.familyChipText, selected && styles.familyChipTextSelected]}>
                  {family.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/create-family')}
        style={({ pressed }) => [styles.addFamilyButton, pressed && styles.pressed]}>
        <Text style={styles.addFamilyPlus}>+</Text>
        <Text style={styles.addFamilyText}>Másik családi kör létrehozása</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative', overflow: 'hidden', padding: spacing.lg, gap: spacing.md,
    borderRadius: radius.xl, backgroundColor: '#0E1D35',
    borderWidth: 1, borderColor: '#244068',
  },
  cardGlow: {
    position: 'absolute', top: -80, right: -55, width: 180, height: 180,
    borderRadius: 90, backgroundColor: colors.primary, opacity: 0.14,
  },
  centeredCard: { minHeight: 112, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted, fontSize: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  eyebrow: { color: colors.primaryLight, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  countBadge: {
    minWidth: 25, height: 25, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.round, backgroundColor: '#19345E', borderWidth: 1, borderColor: '#315687',
  },
  countText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  activeFamilyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  familyIcon: {
    width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  familyIconText: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  familyName: { color: colors.textPrimary, fontSize: 19, fontWeight: '900' },
  familyMeta: { marginTop: 2, color: colors.textMuted, fontSize: 11 },
  flex: { flex: 1 },
  secureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: radius.round, backgroundColor: '#0B3B35',
  },
  secureIcon: { color: colors.success, fontSize: 10, fontWeight: '900' },
  secureText: { color: '#6EE7B7', fontSize: 9, fontWeight: '800' },
  familyOptions: { gap: spacing.sm, paddingRight: spacing.sm },
  familyChip: {
    maxWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.round,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  familyChipSelected: { backgroundColor: '#17335C', borderColor: colors.primary },
  chipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
  chipDotSelected: { backgroundColor: colors.primaryLight },
  familyChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  familyChipTextSelected: { color: colors.textSecondary },
  addFamilyButton: {
    minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: radius.md, borderWidth: 1, borderColor: '#2A456C', backgroundColor: '#10233F',
  },
  addFamilyPlus: { color: colors.primaryLight, fontSize: 18, fontWeight: '500' },
  addFamilyText: { color: colors.primaryLight, fontSize: 11, fontWeight: '800' },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: {
    width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#17335C', borderWidth: 1, borderColor: '#315687',
  },
  emptyIconText: { color: colors.primaryLight, fontSize: 27, fontWeight: '900' },
  emptyContent: { alignItems: 'center', gap: spacing.xs },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyDescription: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  emptyButton: {
    minHeight: 42, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary,
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  emptyButtonArrow: { color: '#FFFFFF', fontSize: 17 },
  errorCard: { flexDirection: 'row', alignItems: 'center' },
  errorIcon: {
    width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4A1825',
  },
  errorIconText: { color: '#FDA4AF', fontSize: 16, fontWeight: '900' },
  errorTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  errorMessage: { marginTop: 2, color: colors.textMuted, fontSize: 10 },
  retryButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryText: { color: colors.primaryLight, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
