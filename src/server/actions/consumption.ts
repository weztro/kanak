"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { consumptionSchema } from "@/lib/validations/consumption";
import { normalizeQuantity } from "@/lib/units";
import { revalidatePath } from "next/cache";
import { ConsumptionLog } from "@/types/database";

export interface ConsumptionActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fetch daily consumption logs for active accommodation.
 */
export async function getConsumptionLogs(): Promise<ConsumptionLog[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("consumption_logs")
    .select(`
      *,
      recorder:members(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      ),
      items:consumption_items(
        *,
        item:items(id, name, base_unit, category:categories(name))
      )
    `)
    .eq("accommodation_id", accId)
    .order("consumption_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data as unknown as ConsumptionLog[]) || [];
}

/**
 * Record cooking consumption atomically via record_consumption_atomic RPC.
 */
export async function recordConsumptionAction(
  values: unknown
): Promise<ConsumptionActionResponse> {
  const parsed = consumptionSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();

  // Normalize items into base units
  const processedItems = parsed.data.items.map((item) => {
    const { normalizedQuantity } = normalizeQuantity(item.quantity, item.unit);
    return {
      item_id: item.itemId,
      quantity: item.quantity,
      unit: item.unit,
      quantity_normalized: normalizedQuantity,
    };
  });

  // Call atomic PostgreSQL procedure
  const { data: logId, error } = await supabase.rpc("record_consumption_atomic", {
    p_accommodation_id: accId,
    p_consumption_date: parsed.data.consumptionDate,
    p_meal_type: parsed.data.mealType,
    p_recorded_by: parsed.data.recordedBy,
    p_notes: parsed.data.notes || null,
    p_items: processedItems,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/consumption");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true, data: { id: logId } };
}

