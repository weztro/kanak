"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { settlementSchema } from "@/lib/validations/settlement";
import { calculateOptimalSettlements, SettlementSuggestion } from "@/lib/settlements/debt-simplifier";
import { revalidatePath } from "next/cache";
import { MemberBalanceRow, Settlement } from "@/types/database";

export interface SettlementActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fetch authoritative member balance rows and optimal settlement recommendations.
 */
export async function getMemberBalancesData(): Promise<{
  balances: MemberBalanceRow[];
  suggestions: SettlementSuggestion[];
}> {
  const accId = await getActiveAccommodationId();
  if (!accId) return { balances: [], suggestions: [] };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_member_balances", {
    p_accommodation_id: accId,
  });

  if (error || !data) {
    return { balances: [], suggestions: [] };
  }

  const balances = data as MemberBalanceRow[];

  // Calculate minimal debt transactions
  const suggestions = calculateOptimalSettlements(
    balances.map((b) => ({
      member_id: b.member_id,
      full_name: b.full_name,
      net_balance: Number(b.net_balance),
    }))
  );

  return { balances, suggestions };
}

/**
 * Fetch past settlement records.
 */
export async function getSettlementHistory(): Promise<Settlement[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("settlements")
    .select(`
      *,
      from_member:members!from_member_id(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      ),
      to_member:members!to_member_id(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      )
    `)
    .eq("accommodation_id", accId)
    .order("settlement_date", { ascending: false });

  return (data as unknown as Settlement[]) || [];
}

/**
 * Record a settlement payment.
 */
export async function recordSettlementAction(
  values: unknown
): Promise<SettlementActionResponse> {
  const parsed = settlementSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settlements")
    .insert({
      accommodation_id: accId,
      from_member_id: parsed.data.fromMemberId,
      to_member_id: parsed.data.toMemberId,
      amount: parsed.data.amount,
      settlement_date: parsed.data.settlementDate,
      payment_method: parsed.data.paymentMethod,
      transaction_reference: parsed.data.transactionReference || null,
      status: "COMPLETED",
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settlements");
  revalidatePath("/dashboard");
  return { success: true, data };
}

