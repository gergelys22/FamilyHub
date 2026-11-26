import { ActionSheet, ConfirmDialog, type SheetAction } from '@/components/action-sheet';
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
import {
  deleteBudgetGoal,
  deleteSubscription,
  setSubscriptionActive,
  updateBudgetGoal,
  updateBudgetTransaction,
  updateSubscription,
} from '@/services/budget-manage';
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
type ManageTarget =
  | { kind: 'transaction'; item: BudgetTransaction }
  | { kind: 'goal'; item: BudgetGoal }
  | { kind: 'subscription'; item: Subscription };
type Palette = typeof colors | typeof darkColors;

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

function SectionTitle({
  title,
  subtitle,
  palette,
}: {
  title: string;
  subtitle?: string;
  palette: Palette;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.flex}>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function MenuButton({ onPress, color, label }: { onPress: () => void; color: string; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress}>
      <Ionicons name="ellipsis-horizontal" size={20} color={color} />
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  description,
  palette,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  palette: Palette;
}) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name={icon} size={27} color={palette.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: palette.textMuted }]}>{description}</Text>
    </View>
  );
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
  const [editing, setEditing] = useState<ManageTarget | null>(null);
  const [menuTarget, setMenuTarget] = useState<ManageTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManageTarget | null>(null);

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
      return date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth();
    });
  }, [transactions]);

  const monthlySpent = monthTransactions.reduce(
    (sum, item) => sum + item.amount_cents,
    0,
  );

  const monthlySubscriptions = subscriptions
    .filter((item) => item.active)
    .reduce((sum, item) => sum + item.amount_cents, 0);

  const categoryTotals = useMemo(() => {
    const totals = new Map(categories.map((item) => [item.key, 0]));

    monthTransactions.forEach((item) => {
      totals.set(
        item.category,
        (totals.get(item.category) ?? 0) + item.amount_cents,
      );
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
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1,
      );

      const value = transactions
        .filter((item) => {
          const date = new Date(item.spent_at);
          return date.getFullYear() === monthDate.getFullYear() &&
            date.getMonth() === monthDate.getMonth();
        })
        .reduce((sum, item) => sum + item.amount_cents, 0);

      result.push({
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        label: monthDate.toLocaleDateString('hu-HU', {
          month: 'short',
        }).replace('.', ''),
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
    setEditing(null);
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

  function openEdit(target: ManageTarget) {
    setEditing(target);
    setPaidBy(profile?.id ?? null);
    if (target.kind === 'transaction') {
      const item = target.item;
      setTab('transactions');
      setTitle(item.title);
      setAmount(String(item.amount_cents / 100));
      setDescription(item.description ?? '');
      setCategory(item.category);
      setPaidBy(item.paid_by_profile_id ?? null);
      setSpentAt(item.spent_at.slice(0, 10));
    } else if (target.kind === 'goal') {
      const item = target.item;
      setTab('goals');
      setTitle(item.title);
      setTargetAmount(String(item.target_cents / 100));
      setSavedAmount(String(item.saved_cents / 100));
      setDeadline(item.deadline ?? '');
    } else {
      const item = target.item;
      setTab('subscriptions');
      setTitle(item.title);
      setProvider(item.provider ?? '');
      setAmount(String(item.amount_cents / 100));
      setBillingCycle(item.billing_cycle);
      setNextBilling(item.next_billing_at?.slice(0, 10) ?? '');
    }
    setVisible(true);
  }

  async function performDelete(target: ManageTarget) {
    try {
      if (target.kind === 'transaction') await deleteBudgetTransaction(target.item.id);
      else if (target.kind === 'goal') await deleteBudgetGoal(target.item.id);
      else await deleteSubscription(target.item.id);
      await reload();
    } catch (caught) {
      Alert.alert('A törlés sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
    }
  }

  async function toggleSubscription(item: Subscription) {
    try {
      await setSubscriptionActive(item.id, !item.active);
      await reload();
    } catch (caught) {
      Alert.alert('A módosítás sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
    }
  }

  const menuActions: SheetAction[] = menuTarget
    ? [
        { key: 'edit', label: 'Szerkesztés', icon: 'pencil-outline', onPress: () => openEdit(menuTarget) },
        ...(menuTarget.kind === 'subscription'
          ? [
              {
                key: 'toggle',
                label: menuTarget.item.active ? 'Szüneteltetés' : 'Újra aktiválás',
                icon: (menuTarget.item.active ? 'pause-circle-outline' : 'play-circle-outline') as SheetAction['icon'],
                onPress: () => void toggleSubscription(menuTarget.item),
              },
            ]
          : []),
        {
          key: 'delete',
          label: 'Törlés',
          icon: 'trash-outline',
          destructive: true,
          // iOS-en egy másik Modal csak az előző eltűnése után nyitható
          onPress: () => setTimeout(() => setDeleteTarget(menuTarget), 250),
        },
      ]
    : [];

  const deleteMessage = deleteTarget
    ? deleteTarget.kind === 'transaction'
      ? `Törlöd ezt a kiadást: ${deleteTarget.item.title}?`
      : deleteTarget.kind === 'goal'
        ? `Törlöd ezt a megtakarítási célt: ${deleteTarget.item.title}?`
        : `Törlöd ezt az előfizetést: ${deleteTarget.item.title}?`
    : '';

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

        const spentIso = new Date(
          `${spentAt || new Date().toISOString().slice(0, 10)}T12:00:00`,
        ).toISOString();

        if (editing?.kind === 'transaction') {
          await updateBudgetTransaction(editing.item.id, {
            title,
            description,
            category,
            amountCents: cents,
            spentAt: spentIso,
            paidByProfileId: paidBy,
          });
        } else {
          await createBudgetTransaction({
            familyId,
            profileId: profile.id,
            paidByProfileId: paidBy,
            title,
            description,
            category,
            amountCents: cents,
            spentAt: spentIso,
          });
        }
      } else if (tab === 'goals') {
        const target = parseHuf(targetAmount);
        const saved = parseHuf(savedAmount || '0');

        if (!target) {
          Alert.alert('Hibás célösszeg', 'Adj meg pozitív célösszeget.');
          return;
        }

        if (editing?.kind === 'goal') {
          await updateBudgetGoal(editing.item.id, {
            title,
            targetCents: target,
            savedCents: saved ?? 0,
            deadline: deadline || null,
          });
        } else {
          await saveBudgetGoal({
            familyId,
            profileId: profile.id,
            title,
            targetCents: target,
            savedCents: saved ?? 0,
            deadline: deadline || null,
          });
        }
      } else {
        const cents = parseHuf(amount);

        if (!cents) {
          Alert.alert('Hibás összeg', 'Adj meg pozitív havidíjat.');
          return;
        }

        if (editing?.kind === 'subscription') {
          await updateSubscription(editing.item.id, {
            title,
            provider,
            amountCents: cents,
            billingCycle,
            nextBillingAt: nextBilling || null,
          });
        } else {
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

  function renderInput(
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    keyboardType?: 'default' | 'decimal-pad',
  ) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.background,
            color: palette.textPrimary,
            borderColor: palette.border,
          },
        ]}
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <ScreenCloseButton />
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
            CSALÁDI PÉNZÜGYEK
          </Text>
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            Költségvetés
          </Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: palette.primary }]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Ebben a hónapban</Text>
              <Text style={styles.summaryValue}>{formatHuf(monthlySpent)}</Text>
            </View>
            <View style={styles.summaryIcon}>
              <Ionicons name="wallet-outline" size={25} color={palette.primary} />
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottom}>
            <View style={styles.summaryStat}>
              <Ionicons name="receipt-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryStatLabel}>Kiadások</Text>
              <Text style={styles.summaryStatValue}>{monthTransactions.length} db</Text>
            </View>

            <View style={styles.summaryStat}>
              <Ionicons name="repeat-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryStatLabel}>Előfizetések</Text>
              <Text style={styles.summaryStatValue}>{formatHuf(monthlySubscriptions)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tabs, { backgroundColor: palette.surfaceElevated }]}>
          {([
            ['transactions', 'Kiadások', 'wallet-outline'],
            ['goals', 'Célok', 'flag-outline'],
            ['subscriptions', 'Előfizetések', 'repeat-outline'],
          ] as const).map(([value, label, icon]) => {
            const active = tab === value;

            return (
              <Pressable
                key={value}
                onPress={() => setTab(value)}
                style={[
                  styles.tab,
                  active && {
                    backgroundColor: palette.surface,
                    ...shadows.card,
                  },
                ]}
              >
                <Ionicons
                  name={icon}
                  size={17}
                  color={active ? palette.primary : palette.textMuted}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? palette.textPrimary : palette.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'transactions' ? (
          <>
            <SectionTitle
              title="Áttekintés"
              subtitle="Hová ment el a pénz?"
              palette={palette}
            />

            <View style={styles.chartsGrid}>
              <View
                style={[
                  styles.chartCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <View style={styles.chartHeader}>
                  <View style={styles.flex}>
                    <Text style={[styles.chartTitle, { color: palette.textPrimary }]}>
                      Kategóriák
                    </Text>
                    <Text style={[styles.chartSubtitle, { color: palette.textMuted }]}>
                      Havi megoszlás
                    </Text>
                  </View>
                  <View style={[styles.chartIcon, { backgroundColor: palette.primarySoft }]}>
                    <Ionicons name="pie-chart-outline" size={19} color={palette.primary} />
                  </View>
                </View>

                {categoryTotals.length > 0 ? (
                  <>
                    <View style={styles.donutWrap}>
                      <View
                        style={[
                          styles.donut,
                          { backgroundColor: palette.surfaceMuted },
                        ]}
                      >
                        {categoryTotals.map((item, index) => {
                          const angle =
                            (360 / Math.max(categoryTotals.length, 1)) * index;

                          return (
                            <View
                              key={item.key}
                              style={[
                                styles.donutSegment,
                                {
                                  backgroundColor: item.color,
                                  transform: [
                                    { rotate: `${angle}deg` },
                                    { translateY: -58 },
                                    { rotate: `${-angle}deg` },
                                  ],
                                },
                              ]}
                            />
                          );
                        })}

                        <View
                          style={[
                            styles.donutInner,
                            { backgroundColor: palette.surface },
                          ]}
                        >
                          <Text style={[styles.donutLabel, { color: palette.textMuted }]}>
                            Összesen
                          </Text>
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            style={[styles.donutValue, { color: palette.textPrimary }]}
                          >
                            {formatHuf(monthlySpent)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.categoryLegend}>
                      {categoryTotals.slice(0, 5).map((item) => (
                        <View key={item.key} style={styles.legendRow}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <Text
                            numberOfLines={1}
                            style={[styles.legendName, { color: palette.textSecondary }]}
                          >
                            {item.label}
                          </Text>
                          <Text style={[styles.legendValue, { color: palette.textPrimary }]}>
                            {Math.round((item.value / Math.max(monthlySpent, 1)) * 100)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.chartEmpty}>
                    <Ionicons name="pie-chart-outline" size={38} color={palette.textMuted} />
                    <Text style={[styles.emptyChartText, { color: palette.textMuted }]}>
                      Még nincs kiadási adat
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.chartCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <View style={styles.chartHeader}>
                  <View style={styles.flex}>
                    <Text style={[styles.chartTitle, { color: palette.textPrimary }]}>
                      Havi trend
                    </Text>
                    <Text style={[styles.chartSubtitle, { color: palette.textMuted }]}>
                      Utolsó 6 hónap
                    </Text>
                  </View>
                  <View style={[styles.chartIcon, { backgroundColor: palette.primarySoft }]}>
                    <Ionicons name="bar-chart-outline" size={19} color={palette.primary} />
                  </View>
                </View>

                <View style={styles.barChart}>
                  {monthlyTotals.map((item) => {
                    const height = item.value > 0
                      ? Math.max(18, Math.round((item.value / maxMonthlyValue) * 118))
                      : 8;

                    return (
                      <View key={item.key} style={styles.barColumn}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height,
                                backgroundColor: item.isCurrent
                                  ? palette.primary
                                  : palette.primaryLight,
                                opacity: item.isCurrent ? 1 : 0.5,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.barLabel,
                            {
                              color: item.isCurrent
                                ? palette.primary
                                : palette.textMuted,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <SectionTitle
              title="Legutóbbi kiadások"
              subtitle="A ••• gombbal szerkesztheted vagy törölheted"
              palette={palette}
            />

            {monthTransactions.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Még nincs kiadás"
                description="Az első kiadás rögzítésével itt láthatod majd a pénzügyi áttekintést."
                palette={palette}
              />
            ) : (
              [...monthTransactions]
                .sort(
                  (a, b) =>
                    new Date(b.spent_at).getTime() -
                    new Date(a.spent_at).getTime(),
                )
                .map((item) => {
                  const categoryMeta =
                    categories.find((entry) => entry.key === item.category) ??
                    categories[categories.length - 1];

                  const payer = members.find(
                    (member) => member.profile_id === item.paid_by_profile_id,
                  );

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.card,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: `${categoryMeta.color}18` },
                        ]}
                      >
                        <Ionicons
                          name={categoryMeta.icon}
                          size={22}
                          color={categoryMeta.color}
                        />
                      </View>

                      <View style={styles.flex}>
                        <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                          {categoryMeta.label} · {payer
                            ? payer.nickname || payer.display_name
                            : 'Család'}
                        </Text>
                        {item.description ? (
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.cardDescription,
                              { color: palette.textSecondary },
                            ]}
                          >
                            {item.description}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.amountWrap}>
                        <Text style={[styles.amount, { color: palette.textPrimary }]}>
                          −{formatHuf(item.amount_cents)}
                        </Text>
                        <Text style={[styles.amountDate, { color: palette.textMuted }]}>
                          {new Date(item.spent_at).toLocaleDateString('hu-HU', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <MenuButton
                        label={`${item.title} műveletei`}
                        color={palette.textMuted}
                        onPress={() => setMenuTarget({ kind: 'transaction', item })}
                      />
                    </View>
                  );
                })
            )}
          </>
        ) : null}

        {tab === 'goals' ? (
          <>
            <SectionTitle
              title="Megtakarítási célok"
              subtitle="Kövesd, milyen közel vagy a céljaidhoz"
              palette={palette}
            />

            {goals.length === 0 ? (
              <EmptyState
                icon="flag-outline"
                title="Még nincs kitűzött cél"
                description="Hozz létre egy megtakarítási célt, és kövesd a haladásodat."
                palette={palette}
              />
            ) : (
              goals.map((goal) => {
                const progress = Math.min(
                  100,
                  Math.round((goal.saved_cents / goal.target_cents) * 100),
                );

                return (
                  <View
                    key={goal.id}
                    style={[
                      styles.goalCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.goalHeader}>
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: palette.primarySoft },
                        ]}
                      >
                        <Ionicons name="flag" size={21} color={palette.primary} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                          {goal.title}
                        </Text>
                        <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                          {goal.deadline
                            ? `Határidő: ${new Date(goal.deadline).toLocaleDateString('hu-HU')}`
                            : 'Nincs határidő'}
                        </Text>
                      </View>
                      <Text style={[styles.progressText, { color: palette.primary }]}>
                        {progress}%
                      </Text>
                      <MenuButton
                        label={`${goal.title} műveletei`}
                        color={palette.textMuted}
                        onPress={() => setMenuTarget({ kind: 'goal', item: goal })}
                      />
                    </View>

                    <View style={styles.goalAmounts}>
                      <Text style={[styles.goalSaved, { color: palette.textPrimary }]}>
                        {formatHuf(goal.saved_cents)}
                      </Text>
                      <Text style={[styles.goalTarget, { color: palette.textMuted }]}>
                        / {formatHuf(goal.target_cents)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: palette.surfaceMuted },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: palette.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : null}

        {tab === 'subscriptions' ? (
          <>
            <SectionTitle
              title="Előfizetéseid"
              subtitle="Egy helyen az ismétlődő kiadások"
              palette={palette}
            />

            {subscriptions.length === 0 ? (
              <EmptyState
                icon="repeat-outline"
                title="Nincs még előfizetés"
                description="Add hozzá a rendszeres díjaidat, hogy átlásd a havi költségeket."
                palette={palette}
              />
            ) : (
              subscriptions.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: palette.primarySoft },
                    ]}
                  >
                    <Ionicons name="repeat" size={21} color={palette.primary} />
                  </View>

                  <View style={styles.flex}>
                    <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                      {item.provider ? `${item.provider} · ` : ''}
                      {item.billing_cycle === 'monthly'
                        ? 'Havonta'
                        : item.billing_cycle === 'yearly'
                          ? 'Évente'
                          : item.billing_cycle}
                    </Text>
                    {item.next_billing_at ? (
                      <Text style={[styles.cardDescription, { color: palette.textSecondary }]}>
                        Következő fizetés: {new Date(item.next_billing_at).toLocaleDateString('hu-HU')}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.amountWrap}>
                    <Text style={[styles.amount, { color: palette.textPrimary }]}>
                      {formatHuf(item.amount_cents)}
                    </Text>
                    <View
                      style={[
                        styles.activeBadge,
                        {
                          backgroundColor: item.active
                            ? `${palette.success}18`
                            : palette.surfaceMuted,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: item.active ? palette.success : palette.textMuted,
                          fontSize: 9,
                          fontWeight: '900',
                        }}
                      >
                        {item.active ? 'AKTÍV' : 'INAKTÍV'}
                      </Text>
                    </View>
                  </View>
                  <MenuButton
                    label={`${item.title} műveletei`}
                    color={palette.textMuted}
                    onPress={() => setMenuTarget({ kind: 'subscription', item })}
                  />
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={openCreate}
        style={[
          styles.fab,
          { backgroundColor: palette.primary },
        ]}
        accessibilityLabel="Új költségvetési elem"
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: isDark
                ? 'rgba(3, 10, 24, 0.78)'
                : 'rgba(23, 43, 77, 0.42)',
            },
          ]}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.modalHandleWrap}>
              <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.flex}>
                  <Text style={[styles.modalEyebrow, { color: palette.primary }]}>
                    {editing ? 'SZERKESZTÉS' : 'ÚJ BEJEGYZÉS'}
                  </Text>
                  <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                    {tab === 'transactions'
                      ? editing ? 'Kiadás szerkesztése' : 'Új kiadás'
                      : tab === 'goals'
                        ? editing ? 'Cél szerkesztése' : 'Megtakarítási cél'
                        : editing ? 'Előfizetés szerkesztése' : 'Új előfizetés'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setVisible(false)}
                  style={[
                    styles.closeModal,
                    { backgroundColor: palette.surfaceElevated },
                  ]}
                >
                  <Ionicons name="close" size={21} color={palette.textSecondary} />
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                Megnevezés
              </Text>
              {renderInput(
                title,
                setTitle,
                tab === 'transactions'
                  ? 'Pl. Bevásárlás'
                  : tab === 'goals'
                    ? 'Pl. Nyaralás'
                    : 'Pl. Streaming szolgáltatás',
              )}

              {tab === 'transactions' ? (
                <>
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Összeg
                  </Text>
                  {renderInput(amount, setAmount, 'Összeg HUF-ban', 'decimal-pad')}
                  {renderInput(description, setDescription, 'Megjegyzés (opcionális)')}
                  {renderInput(spentAt, setSpentAt, 'Dátum: 2026-11-20')}

                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Kategória
                  </Text>
                  <View style={styles.chips}>
                    {categories.map((item) => {
                      const active = category === item.key;

                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => setCategory(item.key)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? item.color
                                : palette.surfaceElevated,
                              borderColor: active ? item.color : palette.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.icon}
                            size={15}
                            color={active ? colors.white : palette.textSecondary}
                          />
                          <Text
                            style={{
                              color: active ? colors.white : palette.textSecondary,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Ki fizette?
                  </Text>
                  <View style={styles.chips}>
                    {members.map((member) => {
                      const active = paidBy === member.profile_id;

                      return (
                        <Pressable
                          key={member.profile_id}
                          onPress={() => setPaidBy(member.profile_id)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? palette.primary
                                : palette.surfaceElevated,
                              borderColor: active ? palette.primary : palette.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? colors.white : palette.textSecondary,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            {member.nickname || member.display_name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {tab === 'goals' ? (
                <>
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Célösszeg
                  </Text>
                  {renderInput(targetAmount, setTargetAmount, 'Célösszeg HUF-ban', 'decimal-pad')}
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Eddig félretett összeg
                  </Text>
                  {renderInput(savedAmount, setSavedAmount, 'Megtakarítás HUF-ban', 'decimal-pad')}
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Határidő
                  </Text>
                  {renderInput(deadline, setDeadline, '2026-12-31 (opcionális)')}
                </>
              ) : null}

              {tab === 'subscriptions' ? (
                <>
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Szolgáltató
                  </Text>
                  {renderInput(provider, setProvider, 'Szolgáltató (opcionális)')}
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Díj
                  </Text>
                  {renderInput(amount, setAmount, 'Havidíj HUF-ban', 'decimal-pad')}
                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Következő fizetés
                  </Text>
                  {renderInput(nextBilling, setNextBilling, '2026-12-01')}

                  <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                    Fizetési gyakoriság
                  </Text>
                  <View style={styles.chips}>
                    {([
                      ['monthly', 'Havi'],
                      ['yearly', 'Éves'],
                      ['weekly', 'Heti'],
                    ] as const).map(([value, label]) => {
                      const active = billingCycle === value;

                      return (
                        <Pressable
                          key={value}
                          onPress={() => setBillingCycle(value)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active
                                ? palette.primary
                                : palette.surfaceElevated,
                              borderColor: active ? palette.primary : palette.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? colors.white : palette.textSecondary,
                              fontWeight: '800',
                            }}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setVisible(false)}
                  style={[
                    styles.cancel,
                    { backgroundColor: palette.surfaceElevated },
                  ]}
                >
                  <Text style={{ color: palette.textSecondary, fontWeight: '800' }}>
                    Mégse
                  </Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => void save()}
                  style={[
                    styles.save,
                    {
                      backgroundColor: palette.primary,
                      opacity: busy ? 0.65 : 1,
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                  <Text style={styles.saveText}>
                    {busy ? 'Mentés…' : 'Mentés'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ActionSheet
        visible={menuTarget !== null}
        title={
          menuTarget?.kind === 'transaction'
            ? 'Kiadás'
            : menuTarget?.kind === 'goal'
              ? 'Megtakarítási cél'
              : 'Előfizetés'
        }
        subtitle={menuTarget?.item.title}
        actions={menuActions}
        onClose={() => setMenuTarget(null)}
        palette={palette}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Törlés megerősítése"
        message={deleteMessage}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void performDelete(target);
        }}
        palette={palette}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 2,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.6,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 125,
    gap: spacing.lg,
  },
  flex: { flex: 1 },

  summaryCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    ...shadows.floating,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: 7,
    color: colors.white,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  summaryIcon: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDivider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
  },
  summaryStatValue: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },

  tabs: {
    padding: 4,
    flexDirection: 'row',
    borderRadius: radius.xl,
  },
  tab: {
    flex: 1,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.lg,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '900',
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },

  chartsGrid: {
    gap: spacing.md,
  },
  chartCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xl,
    ...shadows.card,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  chartSubtitle: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '600',
  },
  chartIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  donutWrap: {
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donut: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutSegment: {
    position: 'absolute',
    left: 63,
    top: 63,
    width: 10,
    height: 26,
    borderRadius: 5,
  },
  donutInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  donutValue: {
    marginTop: 3,
    maxWidth: 82,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  categoryLegend: {
    gap: 9,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  chartEmpty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyChartText: {
    fontSize: 11,
    fontWeight: '700',
  },

  barChart: {
    height: 165,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barColumn: {
    width: 42,
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    height: 132,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 25,
    borderRadius: 12,
  },
  barLabel: {
    height: 18,
    marginTop: 4,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },

  card: {
    minHeight: 82,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    ...shadows.card,
  },
  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  cardDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
  },
  amountWrap: {
    alignItems: 'flex-end',
    gap: 5,
  },
  amount: {
    fontSize: 12,
    fontWeight: '900',
  },
  amountDate: {
    fontSize: 9,
    fontWeight: '600',
  },

  emptyCard: {
    minHeight: 205,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.xl,
    ...shadows.card,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    maxWidth: 250,
    marginTop: 7,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },

  goalCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  goalSaved: {
    fontSize: 19,
    fontWeight: '900',
  },
  goalTarget: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.round,
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 32,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    ...shadows.floating,
  },

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 11,
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 4,
  },
  modalContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalTitle: {
    marginTop: 4,
    fontSize: 23,
    fontWeight: '900',
  },
  closeModal: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    marginBottom: -7,
    fontSize: 11,
    fontWeight: '900',
  },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    fontSize: 13,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.round,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancel: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  save: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.lg,
  },
  saveText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 13,
  },
});