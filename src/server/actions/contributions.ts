"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { contributionSchema } from "@/lib/validations/expense";
import { revalidatePath } from "next/cache";
import { Contribution, FundTransaction } from "@/types/database";

export interface ContributionActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fetch monthly contributions for active accommodation.
 */
export async function getContributions(): Promise<Contribution[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("contributions")
    .select(`
      *,
      member:members(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      )
    `)
    .eq("accommodation_id", accId)
    .order("payment_date", { ascending: false });

  return (data as unknown as Contribution[]) || [];
}

/**
 * Fetch common fund ledger transactions (inflows & outflows).
 */
export async function getFundTransactions(): Promise<FundTransaction[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("fund_transactions")
    .select(`
      *,
      recorder:profiles(full_name)
    `)
    .eq("accommodation_id", accId)
    .order("created_at", { ascending: false });

  return (data as unknown as FundTransaction[]) || [];
}

/**
 * Record monthly contribution atomically via record_contribution_atomic RPC.
 */
export async function recordContributionAction(
  values: unknown
): Promise<ContributionActionResponse> {
  const parsed = contributionSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();

  const { data: contribId, error } = await supabase.rpc("record_contribution_atomic", {
    p_accommodation_id: accId,
    p_member_id: parsed.data.memberId,
    p_period_month: parsed.data.periodMonth,
    p_amount: parsed.data.amount,
    p_payment_date: parsed.data.paymentDate,
    p_payment_method: parsed.data.paymentMethod,
    p_reference_id: parsed.data.referenceId || null,
    p_notes: parsed.data.notes || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/contributions");
  revalidatePath("/dashboard");
  revalidatePath("/settlements");
  return { success: true, data: { id: contribId } };
}

