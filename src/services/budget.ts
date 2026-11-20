import { supabase } from '@/lib/supabase';

export type BudgetTransaction = {
  id: string;
  family_id: string;
  created_by_profile_id: string;
  paid_by_profile_id: string | null;
  title: string;
  description: string | null;
  category: string;
  amount_cents: number;
  currency: string;
  spent_at: string;
  split: Record<string, number>;
  created_at: string;
  updated_at: string;
};

export type BudgetGoal = {
  id: string;
  family_id: string;
  created_by_profile_id: string;
  title: string;
  target_cents: number;
  saved_cents: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  family_id: string;
  created_by_profile_id: string;
  title: string;
  provider: string | null;
  amount_cents: number;
  currency: string;
  billing_cycle: string;
  next_billing_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getBudgetTransactions(familyId: string) {
  const { data, error } = await supabase
    .from('family_budget_transactions')
    .select('*')
    .eq('family_id', familyId)
    .order('spent_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BudgetTransaction[];
}

export async function createBudgetTransaction(input: {
  familyId: string;
  profileId: string;
  paidByProfileId?: string | null;
  title: string;
  description?: string;
  category: string;
  amountCents: number;
  spentAt: string;
  split?: Record<string, number>;
}) {
  const { data, error } = await supabase
    .from('family_budget_transactions')
    .insert({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      paid_by_profile_id: input.paidByProfileId ?? input.profileId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      amount_cents: input.amountCents,
      spent_at: input.spentAt,
      split: input.split ?? {},
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as BudgetTransaction;
}

export async function deleteBudgetTransaction(id: string) {
  const { error } = await supabase
    .from('family_budget_transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getBudgetGoals(familyId: string) {
  const { data, error } = await supabase
    .from('family_budget_goals')
    .select('*')
    .eq('family_id', familyId)
    .order('deadline', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as BudgetGoal[];
}

export async function saveBudgetGoal(input: {
  familyId: string;
  profileId: string;
  title: string;
  targetCents: number;
  savedCents?: number;
  deadline?: string | null;
}) {
  const { data, error } = await supabase
    .from('family_budget_goals')
    .insert({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      title: input.title.trim(),
      target_cents: input.targetCents,
      saved_cents: input.savedCents ?? 0,
      deadline: input.deadline ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as BudgetGoal;
}

export async function getSubscriptions(familyId: string) {
  const { data, error } = await supabase
    .from('family_subscriptions')
    .select('*')
    .eq('family_id', familyId)
    .order('next_billing_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Subscription[];
}

export async function saveSubscription(input: {
  familyId: string;
  profileId: string;
  title: string;
  provider?: string;
  amountCents: number;
  billingCycle: string;
  nextBillingAt?: string | null;
}) {
  const { data, error } = await supabase
    .from('family_subscriptions')
    .insert({
      family_id: input.familyId,
      created_by_profile_id: input.profileId,
      title: input.title.trim(),
      provider: input.provider?.trim() || null,
      amount_cents: input.amountCents,
      billing_cycle: input.billingCycle,
      next_billing_at: input.nextBillingAt ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Subscription;
}
