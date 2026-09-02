import { colors, radius, spacing } from '@/constants/theme';
import {
  acceptFamilyInvite,
  type FamilyInvite,
  getMyFamilyInvites,
  rejectFamilyInvite,
} from '@/services/family-invites';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const roleNames = {
  adult: 'Felnőtt',
  dependent: 'Gyermek / eltartott',
  viewer: 'Megtekintő',
} as const;

export default function InvitationsScreen() {
  const router = useRouter();
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshInvites = useCallback(async () => {
    setRefreshing(true);
    try {
      setInvites(await getMyFamilyInvites());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'A meghívások betöltése sikertelen.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getMyFamilyInvites()
      .then((nextInvites) => {
        if (!active) return;
        setInvites(nextInvites);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'A meghívások betöltése sikertelen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function accept(invite: FamilyInvite) {
    setWorkingId(invite.id);
    try {
      await acceptFamilyInvite(invite.id);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
      Alert.alert('Sikeres csatlakozás', `Mostantól a(z) ${invite.family_name} család tagja vagy.`);
      router.replace('/');
    } catch (caught) {
      Alert.alert('Nem sikerült elfogadni', caught instanceof Error ? caught.message : 'Próbáld újra később.');
    } finally {
      setWorkingId(null);
    }
  }

  function confirmReject(invite: FamilyInvite) {
    Alert.alert(
      'Meghívás elutasítása',
      `Biztosan elutasítod a(z) ${invite.family_name} család meghívását?`,
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Elutasítás',
          style: 'destructive',
          onPress: () => void reject(invite),
        },
      ],
    );
  }

  async function reject(invite: FamilyInvite) {
    setWorkingId(invite.id);
    try {
      await rejectFamilyInvite(invite.id);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
    } catch (caught) {
      Alert.alert('Nem sikerült elutasítani', caught instanceof Error ? caught.message : 'Próbáld újra később.');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={23}
            tintColor={colors.textPrimary}
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Családi meghívások</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshInvites()} tintColor={colors.primaryLight} />}>
          {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}

          {invites.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <SymbolView
                  name={{ ios: 'envelope.open.fill', android: 'mark_email_read', web: 'mark_email_read' }}
                  size={38}
                  tintColor={colors.textMuted}
                  type="hierarchical"
                  weight={{ ios: 'semibold', android: medium }}
                  style={styles.largeSymbol}
                />
              </View>
              <Text style={styles.emptyTitle}>Nincs függő meghívásod</Text>
              <Text style={styles.emptyText}>Ha meghívnak egy családi térbe, itt tudod elfogadni vagy elutasítani.</Text>
            </View>
          ) : invites.map((invite) => {
            const working = workingId === invite.id;
            return (
              <View key={invite.id} style={styles.card}>
                <View style={styles.cardHeading}>
                  <View style={styles.inviteIcon}>
                    <SymbolView
                      name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                      size={27}
                      tintColor={colors.primaryLight}
                      type="hierarchical"
                      weight={{ ios: 'semibold', android: medium }}
                      style={styles.largeSymbol}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.familyName}>{invite.family_name}</Text>
                    <Text style={styles.role}>Szerepkör: {roleNames[invite.intended_role]}</Text>
                  </View>
                </View>
                <Text style={styles.description}>Meghívtak, hogy csatlakozz ehhez a családi térhez.</Text>
                <View style={styles.actions}>
                  <Pressable
                    disabled={workingId !== null}
                    onPress={() => confirmReject(invite)}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, workingId !== null && styles.disabled]}>
                    <Text style={styles.secondaryButtonText}>Elutasítás</Text>
                  </Pressable>
                  <Pressable
                    disabled={workingId !== null}
                    onPress={() => void accept(invite)}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, workingId !== null && styles.disabled]}>
                    {working ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.primaryButtonText}>Elfogadás</Text>}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { height: 60, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  headerSpacer: { width: 42 },
  iconButton: { width: 42, height: 42, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  symbol: { width: 26, height: 26 },
  largeSymbol: { width: 42, height: 42 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: '#294469', backgroundColor: '#10233E' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inviteIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59, 130, 246, 0.18)' },
  flex: { flex: 1 },
  familyName: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  role: { marginTop: spacing.xs, color: colors.primaryLight, fontSize: 12, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: spacing.md },
  primaryButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  secondaryButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  emptyState: { paddingVertical: 90, paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.md },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { maxWidth: 310, color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  errorCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#3B1622' },
  errorText: { color: '#FDA4AF', fontSize: 12 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});
