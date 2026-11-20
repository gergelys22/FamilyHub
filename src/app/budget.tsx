import { ScreenCloseButton } from '@/components/screen-close-button';
import { colors, darkColors, radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  createBudgetTransaction,
  deleteBudgetTransaction,
  getBudgetGoals,
  getBudgetTransactions,
  getSubscriptions,
  saveBudgetGoal,
  saveSubscription,
  type BudgetGoal,
  type BudgetTransaction,
  type Subscription,
} from '@/services/budget';
import { getFamilyMembers, getMyFamilies, type FamilyMember } from '@/services/families';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'transactions' | 'goals' | 'subscriptions';

const categories = [
  { key: 'etelek', label: 'Étel', icon: 'restaurant-outline' as const, color: '#F59E0B' },
  { key: 'lakhatás', label: 'Lakhatás', icon: 'home-outline' as const, color: '#5B8CFF' },
  { key: 'kozlekedes', label: 'Közlekedés', icon: 'car-outline' as const, color: '#20BFA7' },
  { key: 'egeszseg', label: 'Egészség', icon: 'medkit-outline' as const, color: '#F56C9A' },
  { key: 'iskola', label: 'Iskola', icon: 'school-outline' as const, color: '#8B78F6' },
  { key: 'szorakozas', label: 'Szórakozás', icon: 'game-controller-outline' as const, color: '#FB7185' },
  { key: 'egyeb', label: 'Egyéb', icon: 'ellipsis-horizontal-circle-outline' as const, color: '#8D9AAF' },
];

function formatHuf(cents: number) {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function parseHuf(value: string) {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export default function BudgetScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? darkColors : colors;
  const { profile } = useAuth();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [goals, setGoals] = useState<BudgetGoal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tab, setTab] = useState<Tab>('transactions');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('egyeb');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [spentAt, setSpentAt] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [provider, setProvider] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [nextBilling, setNextBilling] = useState('');

  async function reload(id = familyId) {
    if (!id) return;
    const [nextTransactions, nextGoals, nextSubscriptions] = await Promise.all([
      getBudgetTransactions(id),
      getBudgetGoals(id),
      getSubscriptions(id),
    ]);
    setTransactions(nextTransactions);
    setGoals(nextGoals);
    setSubscriptions(nextSubscriptions);
  }

  useEffect(() => {
    void getMyFamilies()
      .then(async (families) => {
        const id = families[0]?.id ?? null;
        setFamilyId(id);
        if (!id) return;
        const [familyMembers] = await Promise.all([
          getFamilyMembers(id),
          reload(id),
        ]);
        setMembers(familyMembers);
      })
      .catch((caught) =>
        Alert.alert(
          'Betöltés sikertelen',
          caught instanceof Error ? caught.message : 'Próbáld újra.',
        ),
      );
  }, []);

  const monthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((item) => {
      const date = new Date(item.spent_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [transactions]);

  const monthlySpent = monthTransactions.reduce((sum, item) => sum + item.amount_cents, 0);
  const monthlySubscriptions = subscriptions
    .filter((item) => item.active)
    .reduce((sum, item) => sum + item.amount_cents, 0);

  const categoryTotals = useMemo(() => {
    const totals = new Map(categories.map((item) => [item.key, 0]));
    monthTransactions.forEach((item) => {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount_cents);
    });
    return categories
      .map((item) => ({
        ...item,
        value: totals.get(item.key) ?? 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const monthlyTotals = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const value = transactions
        .filter((item) => {
          const date = new Date(item.spent_at);
          return date.getFullYear() === monthDate.getFullYear()
            && date.getMonth() === monthDate.getMonth();
        })
        .reduce((sum, item) => sum + item.amount_cents, 0);
      result.push({
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        label: monthDate.toLocaleDateString('hu-HU', { month: 'short' }).replace('.', ''),
        value,
        isCurrent: offset === 0,
      });
    }
    return result;
  }, [transactions]);

  const maxMonthlyValue = Math.max(
    ...monthlyTotals.map((item) => item.value),
    1,
  );

  function openCreate() {
    setTitle('');
    setAmount('');
    setDescription('');
    setCategory('egyeb');
    setPaidBy(profile?.id ?? null);
    setSpentAt(new Date().toISOString().slice(0, 10));
    setTargetAmount('');
    setSavedAmount('');
    setDeadline('');
    setProvider('');
    setBillingCycle('monthly');
    setNextBilling('');
    setVisible(true);
  }

  async function save() {
    if (!familyId || !profile?.id) return;
    if (!title.trim()) {
      Alert.alert('Hiányzó adat', 'Adj meg egy nevet.');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'transactions') {
        const cents = parseHuf(amount);
        if (!cents) {
          Alert.alert('Hibás összeg', 'Adj meg pozitív összeget, például 12500.');
          return;
        }
        await createBudgetTransaction({
          familyId,
          profileId: profile.id,
          paidByProfileId: paidBy,
          title,
          description,
          category,
          amountCents: cents,
          spentAt: new Date(`${spentAt || new Date().toISOString().slice(0, 10)}T12:00:00`).toISOString(),
        });
      } else if (tab === 'goals') {
        const target = parseHuf(targetAmount);
        const saved = parseHuf(savedAmount || '0');
        if (!target) {
          Alert.alert('Hibás célösszeg', 'Adj meg pozitív célösszeget.');
          return;
        }
        await saveBudgetGoal({
          familyId,
          profileId: profile.id,
          title,
          targetCents: target,
          savedCents: saved ?? 0,
          deadline: deadline || null,
        });
      } else {
        const cents = parseHuf(amount);
        if (!cents) {
          Alert.alert('Hibás összeg', 'Adj meg pozitív havidíjat.');
          return;
        }
        await saveSubscription({
          familyId,
          profileId: profile.id,
          title,
          provider,
          amountCents: cents,
          billingCycle,
          nextBillingAt: nextBilling || null,
        });
      }
      await reload();
      setVisible(false);
    } catch (caught) {
      Alert.alert(
        'Mentés sikertelen',
        caught instanceof Error ? caught.message : 'Próbáld újra.',
      );
    } finally {
      setBusy(false);
    }
  }

  function removeTransaction(item: BudgetTransaction) {
    Alert.alert('Kiadás törlése', `Törlöd: ${item.title}?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deleteBudgetTransaction(item.id)
            .then(() => reload())
            .catch((caught) =>
              Alert.alert('Hiba', caught instanceof Error ? caught.message : 'A törlés sikertelen.'),
            ),
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <ScreenCloseButton />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Költségvetés</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: palette.surfaceElevated }]}>
        {([
          ['transactions', 'Kiadások', 'wallet-outline'],
          ['goals', 'Célok', 'flag-outline'],
          ['subscriptions', 'Előfizetések', 'repeat-outline'],
        ] as const).map(([value, label, icon]) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            style={[styles.tab, tab === value && [styles.tabActive, { backgroundColor: palette.primary }]]}
          >
            <Ionicons name={icon} size={16} color={tab === value ? colors.white : palette.textSecondary} />
            <Text style={{ color: tab === value ? colors.white : palette.textSecondary, fontWeight: '800', fontSize: 11 }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <View style={[styles.summaryIcon, { backgroundColor: palette.surface }]}>
            <Ionicons name="wallet" size={27} color={palette.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Ebben a hónapban</Text>
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{formatHuf(monthlySpent)}</Text>
          </View>
          <View style={styles.summarySide}>
            <Text style={[styles.summarySmall, { color: palette.textMuted }]}>Előfizetések</Text>
            <Text style={[styles.summarySmallValue, { color: palette.textSecondary }]}>{formatHuf(monthlySubscriptions)}</Text>
          </View>
        </View>

        {tab === 'transactions' ? (
          <>
            {monthTransactions.length === 0 ? (
              <Text style={[styles.empty, { color: palette.textMuted }]}>Ebben a hónapban nincs rögzített kiadás.</Text>
            ) : (
              monthTransactions.map((item) => {
                const categoryMeta = categories.find((entry) => entry.key === item.category) ?? categories[categories.length - 1];
                const payer = members.find((member) => member.profile_id === item.paid_by_profile_id);
                return (
                  <Pressable
                    key={item.id}
                    onLongPress={() => removeTransaction(item)}
                    style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: `${categoryMeta.color}20` }]}>
                      <Ionicons name={categoryMeta.icon} size={21} color={categoryMeta.color} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                        {categoryMeta.label} · {payer ? payer.nickname || payer.display_name : 'Család'}
                      </Text>
                      {item.description ? <Text style={[styles.cardDescription, { color: palette.textSecondary }]}>{item.description}</Text> : null}
                    </View>
                    <Text style={[styles.amount, { color: palette.textPrimary }]}>−{formatHuf(item.amount_cents)}</Text>
                  </Pressable>
                );
              })
            )}
          </>
        ) : null}

        {tab === 'goals' ? (
          <>
            {goals.length === 0 ? (
              <Text style={[styles.empty, { color: palette.textMuted }]}>Még nincs költségvetési cél.</Text>
            ) : goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.saved_cents / goal.target_cents) * 100));
              return (
                <View key={goal.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={[styles.categoryIcon, { backgroundColor: palette.primarySoft }]}>
                    <Ionicons name="flag" size={21} color={palette.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{goal.title}</Text>
                    <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                      {formatHuf(goal.saved_cents)} / {formatHuf(goal.target_cents)}
                      {goal.deadline ? ` · ${new Date(goal.deadline).toLocaleDateString('hu-HU')}` : ''}
                    </Text>
                    <View style={[styles.progressTrack, { backgroundColor: palette.surfaceMuted }]}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: palette.primary }]} />
                    </View>
                  </View>
                  <Text style={[styles.progressText, { color: palette.primary }]}>{progress}%</Text>
                </View>
              );
            })}
          </>
        ) : null}

        {tab === 'subscriptions' ? (
          <>
            {subscriptions.length === 0 ? (
              <Text style={[styles.empty, { color: palette.textMuted }]}>Még nincs rögzített előfizetés.</Text>
            ) : subscriptions.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.categoryIcon, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name="repeat" size={21} color={palette.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                    {item.provider ? `${item.provider} · ` : ''}
                    {item.billing_cycle === 'monthly' ? 'havonta' : item.billing_cycle}
                    {item.next_billing_at ? ` · ${new Date(item.next_billing_at).toLocaleDateString('hu-HU')}` : ''}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: palette.textPrimary }]}>{formatHuf(item.amount_cents)}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <Pressable onPress={openCreate} style={[styles.fab, { backgroundColor: palette.primary }]} accessibilityLabel="Új költségvetési elem">
        <Ionicons name="add" size={31} color={colors.white} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(3, 10, 24, 0.78)' : 'rgba(23, 43, 77, 0.38)' }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                {tab === 'transactions' ? 'Új kiadás' : tab === 'goals' ? 'Új megtakarítási cél' : 'Új előfizetés'}
              </Text>
              <TextInput value={title} onChangeText={setTitle} placeholder={tab === 'transactions' ? 'Kiadás neve' : tab === 'goals' ? 'Cél neve' : 'Előfizetés neve'} placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />

              {tab === 'transactions' ? (
                <>
                  <TextInput value={amount} onChangeText={setAmount} placeholder="Összeg HUF-ban" keyboardType="decimal-pad" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <TextInput value={description} onChangeText={setDescription} placeholder="Megjegyzés (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <TextInput value={spentAt} onChangeText={setSpentAt} placeholder="Dátum: 2026-11-20" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Kategória</Text>
                  <View style={styles.chips}>
                    {categories.map((item) => (
                      <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.chip, { backgroundColor: category === item.key ? item.color : palette.surfaceElevated }]}>
                        <Ionicons name={item.icon} size={15} color={category === item.key ? colors.white : palette.textSecondary} />
                        <Text style={{ color: category === item.key ? colors.white : palette.textSecondary, fontWeight: '800' }}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Ki fizette?</Text>
                  <View style={styles.chips}>
                    {members.map((member) => (
                      <Pressable key={member.profile_id} onPress={() => setPaidBy(member.profile_id)} style={[styles.chip, { backgroundColor: paidBy === member.profile_id ? palette.primary : palette.surfaceElevated }]}>
                        <Text style={{ color: paidBy === member.profile_id ? colors.white : palette.textSecondary, fontWeight: '800' }}>{member.nickname || member.display_name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              {tab === 'goals' ? (
                <>
                  <TextInput value={targetAmount} onChangeText={setTargetAmount} placeholder="Célösszeg HUF-ban" keyboardType="decimal-pad" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <TextInput value={savedAmount} onChangeText={setSavedAmount} placeholder="Eddig félretett összeg" keyboardType="decimal-pad" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <TextInput value={deadline} onChangeText={setDeadline} placeholder="Határidő: 2026-12-31 (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                </>
              ) : null}

              {tab === 'subscriptions' ? (
                <>
                  <TextInput value={provider} onChangeText={setProvider} placeholder="Szolgáltató (opcionális)" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <TextInput value={amount} onChangeText={setAmount} placeholder="Havi díj HUF-ban" keyboardType="decimal-pad" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <TextInput value={nextBilling} onChangeText={setNextBilling} placeholder="Következő fizetés: 2026-12-01" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, color: palette.textPrimary, borderColor: palette.border }]} />
                  <View style={styles.chips}>
                    {([
                      ['monthly', 'Havi'],
                      ['yearly', 'Éves'],
                      ['weekly', 'Heti'],
                    ] as const).map(([value, label]) => (
                      <Pressable key={value} onPress={() => setBillingCycle(value)} style={[styles.chip, { backgroundColor: billingCycle === value ? palette.primary : palette.surfaceElevated }]}>
                        <Text style={{ color: billingCycle === value ? colors.white : palette.textSecondary, fontWeight: '800' }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable onPress={() => setVisible(false)} style={styles.cancel}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>Mégse</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: palette.primary }]}>
                  <Text style={styles.saveText}>{busy ? 'Mentés…' : 'Mentés'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 25, fontWeight: '900' },
  tabs: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: 4, flexDirection: 'row', borderRadius: radius.round },
  tab: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radius.round },
  tabActive: { ...shadows.floating },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  flex: { flex: 1 },
  summaryCard: { minHeight: 96, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.xl },
  summaryIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '800' },
  summaryValue: { marginTop: 3, fontSize: 22, fontWeight: '900' },
  summarySide: { alignItems: 'flex-end' },
  summarySmall: { fontSize: 9, fontWeight: '800' },
  summarySmallValue: { marginTop: 3, fontSize: 12, fontWeight: '900' },
  card: { minHeight: 78, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, ...shadows.card },
  categoryIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  cardMeta: { marginTop: 3, fontSize: 11 },
  cardDescription: { marginTop: 3, fontSize: 10, lineHeight: 14 },
  amount: { fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 7, marginTop: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 11, fontWeight: '900' },
  empty: { paddingVertical: spacing.xl, textAlign: 'center', fontSize: 12 },
  fab: { position: 'absolute', right: spacing.lg, bottom: 92, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, ...shadows.floating },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '88%', borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  modalContent: { padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  fieldLabel: { fontSize: 12, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 38, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.round },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  cancel: { padding: spacing.md },
  save: { minHeight: 48, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  saveText: { color: colors.white, fontWeight: '900' },
});
