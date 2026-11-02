"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { shoppingItemSchema } from "@/lib/validations/settlement";
import { revalidatePath } from "next/cache";
import { ShoppingListItem, ShoppingItemStatus } from "@/types/database";

export interface ShoppingActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Get or create active shopping list for accommodation.
 */
async function getOrCreateActiveShoppingList(accId: string): Promise<string> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("accommodation_id", accId)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("shopping_lists")
    .insert({
      accommodation_id: accId,
      title: "Shared Flat Grocery List",
      status: "ACTIVE",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "Failed to create shopping list");
  }

  return created.id;
}

/**
 * Fetch all items in the active shopping list.
 */
export async function getShoppingListItems(): Promise<ShoppingListItem[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const listId = await getOrCreateActiveShoppingList(accId);
  const supabase = await createClient();

  const { data } = await supabase
    .from("shopping_list_items")
    .select(`
      *,
      item:items(id, name, base_unit, category:categories(name)),
      assignee:members(
        id,
        profile:profiles(full_name)
      )
    `)
    .eq("shopping_list_id", listId)
    .order("created_at", { ascending: false });

  return (data as unknown as ShoppingListItem[]) || [];
}

/**
 * Add an item to the shopping list.
 */
export async function addShoppingListItemAction(
  values: unknown
): Promise<ShoppingActionResponse> {
  const parsed = shoppingItemSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const listId = await getOrCreateActiveShoppingList(accId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shopping_list_items")
    .insert({
      shopping_list_id: listId,
      item_id: parsed.data.itemId || null,
      custom_item_name: parsed.data.customItemName?.trim() || null,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      priority: parsed.data.priority,
      assigned_to: parsed.data.assignedTo || null,
      status: "PENDING",
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/shopping");
  return { success: true, data };
}

/**
 * Update shopping list item status (PENDING / PURCHASED / CANCELLED).
 */
export async function updateShoppingListItemStatusAction(
  itemId: string,
  status: ShoppingItemStatus
): Promise<ShoppingActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ status })
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/shopping");
  return { success: true };
}

/**
 * Delete item from shopping list.
 */
export async function deleteShoppingListItemAction(itemId: string): Promise<ShoppingActionResponse> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/shopping");
  return { success: true };
}

/**
 * Auto-populate low-stock items into the shopping list.
 */
export async function autoPopulateLowStockItemsAction(): Promise<ShoppingActionResponse> {
  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const listId = await getOrCreateActiveShoppingList(accId);
  const supabase = await createClient();

  // 1. Fetch items where current_stock <= minimum_stock
  const { data: items } = await supabase
    .from("items")
    .select(`
      id,
      name,
      base_unit,
      minimum_stock,
      inventory:inventory(current_stock)
    `)
    .eq("accommodation_id", accId)
    .eq("is_active", true);

  if (!items || items.length === 0) {
    return { success: true, data: { addedCount: 0 } };
  }

  // 2. Fetch existing pending items in shopping list
  const { data: existingItems } = await supabase
    .from("shopping_list_items")
    .select("item_id")
    .eq("shopping_list_id", listId)
    .eq("status", "PENDING");

  const existingItemIds = new Set((existingItems || []).map((e) => e.item_id).filter(Boolean));

  let addedCount = 0;
  for (const item of items) {
    const inv = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory;
    const currentStock = inv?.current_stock || 0;
    const minStock = item.minimum_stock || 0;

    if (currentStock <= minStock && !existingItemIds.has(item.id)) {
      const suggestedQty = Math.max(1, minStock * 2 - currentStock);
      await supabase.from("shopping_list_items").insert({
        shopping_list_id: listId,
        item_id: item.id,
        quantity: suggestedQty,
        unit: item.base_unit,
        priority: currentStock <= 0 ? "URGENT" : "HIGH",
        status: "PENDING",
        notes: `Auto-suggested: stock is down to ${currentStock} ${item.base_unit}`,
      });
      addedCount++;
    }
  }

  revalidatePath("/shopping");
  return { success: true, data: { addedCount } };
}

