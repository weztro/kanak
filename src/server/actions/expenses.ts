"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { expenseSchema } from "@/lib/validations/expense";
import { revalidatePath } from "next/cache";
import { Expense } from "@/types/database";

export interface ExpenseActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fetch non-grocery accommodation expenses.
 */
export async function getExpenses(): Promise<Expense[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select(`
      *,
      payer:members(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      )
    `)
    .eq("accommodation_id", accId)
    .order("expense_date", { ascending: false });

  return (data as unknown as Expense[]) || [];
}

/**
 * Record a non-grocery shared expense atomically via post_expense_atomic RPC.
 */
export async function createExpenseAction(values: unknown): Promise<ExpenseActionResponse> {
  const parsed = expenseSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();

  const { data: expenseId, error } = await supabase.rpc("post_expense_atomic", {
    p_accommodation_id: accId,
    p_description: parsed.data.description.trim(),
    p_category: parsed.data.category,
    p_amount: parsed.data.amount,
    p_paid_by: parsed.data.paidBy,
    p_payment_source: parsed.data.paymentSource,
    p_expense_date: parsed.data.expenseDate,
    p_receipt_url: parsed.data.receiptUrl || null,
    p_notes: parsed.data.notes || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/settlements");
  return { success: true, data: { id: expenseId } };
}

