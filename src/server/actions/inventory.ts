"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { itemSchema, stockAdjustmentSchema, ItemInput, StockAdjustmentInput } from "@/lib/validations/inventory";
import { normalizeQuantity } from "@/lib/units";
import { revalidatePath } from "next/cache";
import { Category, Item, StockTransaction } from "@/types/database";

export interface InventoryActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fetch all categories (system presets + custom accommodation categories).
 */
export async function getCategories(): Promise<Category[]> {
  const accId = await getActiveAccommodationId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("categories")
    .select("*")
    .or(`is_system.eq.true,accommodation_id.eq.${accId}`)
    .order("sort_order", { ascending: true });

  return (data as Category[]) || [];
}

/**
 * Fetch inventory items with current stock and category info.
 */
export async function getInventoryItems(): Promise<Item[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select(`
      id,
      accommodation_id,
      category_id,
      name,
      description,
      base_unit,
      minimum_stock,
      is_active,
      created_at,
      updated_at,
      category:categories(*),
      inventory:inventory(*)
    `)
    .eq("accommodation_id", accId)
    .order("name", { ascending: true });

  // Handle inventory relation
  return (data as unknown as Item[]) || [];
}

/**
 * Create a new inventory item.
 */
export async function createItemAction(values: unknown): Promise<InventoryActionResponse> {
  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // 1. Insert item
  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      accommodation_id: accId,
      category_id: parsed.data.categoryId,
      name: parsed.data.name.trim(),
      base_unit: parsed.data.baseUnit,
      minimum_stock: parsed.data.minimumStock,
      description: parsed.data.description,
      is_active: true,
    })
    .select()
    .single();

  if (itemError) {
    if (itemError.code === "23505") {
      return { success: false, error: "An item with this name already exists in your inventory." };
    }
    return { success: false, error: itemError.message };
  }

  // 2. Initialize inventory row
  await supabase.from("inventory").insert({
    accommodation_id: accId,
    item_id: item.id,
    current_stock: 0,
    average_purchase_price: 0,
  });

  revalidatePath("/inventory");
  return { success: true, data: item };
}

/**
 * Update an existing item master record.
 */
export async function updateItemAction(
  itemId: string,
  values: unknown
): Promise<InventoryActionResponse> {
  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({
      category_id: parsed.data.categoryId,
      name: parsed.data.name.trim(),
      base_unit: parsed.data.baseUnit,
      minimum_stock: parsed.data.minimumStock,
      description: parsed.data.description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("accommodation_id", accId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

/**
 * Record manual opening inventory.
 */
export async function recordOpeningInventoryAction(
  entries: { itemId: string; quantity: number; unit: string; unitPrice: number }[]
): Promise<InventoryActionResponse> {
  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  for (const entry of entries) {
    if (entry.quantity <= 0) continue;

    const { normalizedQuantity } = normalizeQuantity(entry.quantity, entry.unit);

    // Get current stock
    const { data: inv } = await supabase
      .from("inventory")
      .select("current_stock")
      .eq("item_id", entry.itemId)
      .maybeSingle();

    const stockBefore = inv?.current_stock || 0;
    const stockAfter = stockBefore + normalizedQuantity;

    // Upsert inventory
    await supabase.from("inventory").upsert({
      accommodation_id: accId,
      item_id: entry.itemId,
      current_stock: stockAfter,
      average_purchase_price: entry.unitPrice,
      updated_at: new Date().toISOString(),
    });

    // Create stock transaction
    await supabase.from("stock_transactions").insert({
      accommodation_id: accId,
      item_id: entry.itemId,
      transaction_type: "OPENING",
      quantity: entry.quantity,
      unit: entry.unit,
      quantity_normalized: normalizedQuantity,
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_price: entry.unitPrice,
      reason: "Initial manual opening stock",
      recorded_by: user.id,
    });
  }

  revalidatePath("/inventory");
  return { success: true };
}

/**
 * Record stock adjustment (correction or wastage).
 */
export async function recordStockAdjustmentAction(
  values: unknown
): Promise<InventoryActionResponse> {
  const parsed = stockAdjustmentSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { normalizedQuantity } = normalizeQuantity(parsed.data.quantity, parsed.data.unit);

  // Fetch current stock
  const { data: inv, error: invError } = await supabase
    .from("inventory")
    .select("current_stock, average_purchase_price")
    .eq("item_id", parsed.data.itemId)
    .single();

  if (invError || !inv) {
    return { success: false, error: "Item not found in inventory" };
  }

  const stockBefore = inv.current_stock;
  let stockAfter: number;
  let quantityDelta: number;

  if (parsed.data.adjustmentType === "WASTAGE") {
    // Wastage always reduces stock
    if (stockBefore < normalizedQuantity) {
      return {
        success: false,
        error: `Cannot record wastage greater than current stock (${stockBefore}).`,
      };
    }
    stockAfter = stockBefore - normalizedQuantity;
    quantityDelta = -normalizedQuantity;
  } else {
    // ADJUSTMENT correction can increase or decrease; here we treat the entry as setting or reducing
    stockAfter = Math.max(0, stockBefore - normalizedQuantity);
    quantityDelta = -normalizedQuantity;
  }

  // Update inventory
  await supabase
    .from("inventory")
    .update({
      current_stock: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("item_id", parsed.data.itemId);

  // Record transaction
  await supabase.from("stock_transactions").insert({
    accommodation_id: accId,
    item_id: parsed.data.itemId,
    transaction_type: parsed.data.adjustmentType,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    quantity_normalized: quantityDelta,
    stock_before: stockBefore,
    stock_after: stockAfter,
    unit_price: inv.average_purchase_price,
    reason: parsed.data.reason,
    recorded_by: user.id,
  });

  revalidatePath("/inventory");
  return { success: true };
}

/**
 * Fetch immutable stock transactions for an item.
 */
export async function getItemStockHistory(itemId: string): Promise<StockTransaction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stock_transactions")
    .select(`
      *,
      recorder:profiles(full_name)
    `)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  return (data as unknown as StockTransaction[]) || [];
}

