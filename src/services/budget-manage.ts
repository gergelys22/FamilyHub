import { supabase } from '@/lib/supabase';

// A policyk (family_budget_*_family) szerint a tagok törölhetnek, módosítani viszont csak a létrehozó tud.
// A PostgREST hiba nélkül 0 sort módosít, ha a RLS nem engedi, ezért a .select('id') alapján ellenőrzünk.
function ensureChanged(rows: unknown[] | null, message: string) {
  if (!rows || rows.length === 0) throw new Error(message);
}

const EDIT_DENIED = 'Csak a tétel létrehozója módosíthatja.';
const DELETE_DENIED = 'A törlés nem sikerült, vagy nincs jogosultságod hozzá.';

export async function updateBudgetTransaction(
  id: string,
  input: {
    title: string;
    description: string;
    category: string;
    amountCents: number;
    spentAt: string;
    paidByProfileId: string | null;
  },
) {
  const { data, error } = await supabase
    .from('family_budget_transactions')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      category: input.category,
      amount_cents: input.amountCents,
      spent_at: input.spentAt,
      paid_by_profile_id: input.paidByProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  ensureChanged(data, EDIT_DENIED);
}

export async function updateBudgetGoal(
  id: string,
  input: { title: string; targetCents: number; savedCents: number; deadline: string | null },
) {
  const { data, error } = await supabase
    .from('family_budget_goals')
    .update({
      title: input.title.trim(),
      target_cents: input.targetCents,
      saved_cents: input.savedCents,
      deadline: input.deadline,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  ensureChanged(data, EDIT_DENIED);
}

export async function deleteBudgetGoal(id: string) {
  const { data, error } = await supabase.from('family_budget_goals').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  ensureChanged(data, DELETE_DENIED);
}

export async function updateSubscription(
  id: string,
  input: {
    title: string;
    provider: string;
    amountCents: number;
    billingCycle: string;
    nextBillingAt: string | null;
  },
) {
  const { data, error } = await supabase
    .from('family_subscriptions')
    .update({
      title: input.title.trim(),
      provider: input.provider.trim() || null,
      amount_cents: input.amountCents,
      billing_cycle: input.billingCycle,
      next_billing_at: input.nextBillingAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  ensureChanged(data, EDIT_DENIED);
}

export async function setSubscriptionActive(id: string, active: boolean) {
  const { data, error } = await supabase
    .from('family_subscriptions')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  ensureChanged(data, EDIT_DENIED);
}

export async function deleteSubscription(id: string) {
  const { data, error } = await supabase.from('family_subscriptions').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  ensureChanged(data, DELETE_DENIED);
}