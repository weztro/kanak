"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "@/server/actions/accommodation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Category } from "@/types/database";

export interface CategoryWithCount extends Category {
  item_count: number;
}

export interface CategoryActionResponse {
  success: boolean;
  error?: string;
  data?: Category;
}

const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(50),
  description: z.string().max(200).optional().nullable(),
  icon: z.string().max(30).optional().nullable(),
  sort_order: z.number().int().min(0).max(999).optional().default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/**
 * Fetch all categories (system defaults + custom for active accommodation) with item usage count.
 */
export async function getCategoriesWithStats(): Promise<CategoryWithCount[]> {
  const accId = await getActiveAccommodationId();
  const supabase = await createClient();

  let query = supabase
    .from("categories")
    .select(`
      *,
      items:items(count)
    `);

  if (accId) {
    query = query.or(`is_system.eq.true,accommodation_id.eq.${accId}`);
  } else {
    query = query.eq("is_system", true);
  }

  const { data, error } = await query
    .order("is_system", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((cat) => {
    const rawItems = cat.items as unknown as { count: number }[];
    const count = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems[0].count : 0;
    return {
      ...(cat as unknown as Category),
      item_count: count,
    };
  });
}

/**
 * Create a new custom category for the active accommodation.
 */
export async function createCategoryAction(values: unknown): Promise<CategoryActionResponse> {
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) {
    return { success: false, error: "No active accommodation selected" };
  }

  const adminClient = createAdminClient();

  // Check if name already exists in this accommodation or system
  const { data: existing } = await adminClient
    .from("categories")
    .select("id")
    .or(`is_system.eq.true,accommodation_id.eq.${accId}`)
    .ilike("name", parsed.data.name.trim())
    .maybeSingle();

  if (existing) {
    return { success: false, error: "A category with this name already exists" };
  }

  const { data, error } = await adminClient
    .from("categories")
    .insert({
      accommodation_id: accId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      icon: parsed.data.icon?.trim() || "tag",
      sort_order: parsed.data.sort_order ?? 0,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, data: data as unknown as Category };
}

/**
 * Update an existing category. System categories can only have their display order or icon adjusted,
 * custom categories can have their name and description modified.
 */
export async function updateCategoryAction(
  id: string,
  values: unknown
): Promise<CategoryActionResponse> {
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  const adminClient = createAdminClient();

  const { data: cat, error: findError } = await adminClient
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (findError || !cat) {
    return { success: false, error: "Category not found" };
  }

  // If system category, only allow icon / sort_order update
  const updatePayload: Record<string, unknown> = {
    icon: parsed.data.icon?.trim() || cat.icon,
    sort_order: parsed.data.sort_order ?? cat.sort_order,
  };

  if (!cat.is_system) {
    // Custom category: allow renaming and description update
    if (cat.accommodation_id !== accId) {
      return { success: false, error: "Unauthorized to edit this category" };
    }
    updatePayload.name = parsed.data.name.trim();
    updatePayload.description = parsed.data.description?.trim() || null;
  }

  const { data, error } = await adminClient
    .from("categories")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, data: data as unknown as Category };
}

/**
 * Delete a custom category. System categories cannot be deleted.
 * Categories with existing items cannot be deleted to maintain referential integrity.
 */
export async function deleteCategoryAction(id: string): Promise<CategoryActionResponse> {
  const accId = await getActiveAccommodationId();
  const adminClient = createAdminClient();

  const { data: cat, error: findError } = await adminClient
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (findError || !cat) {
    return { success: false, error: "Category not found" };
  }

  if (cat.is_system) {
    return { success: false, error: "System default categories cannot be deleted." };
  }

  if (cat.accommodation_id !== accId) {
    return { success: false, error: "Unauthorized to delete this category" };
  }

  // Check if items are assigned to this category
  const { count, error: countError } = await adminClient
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete: ${count} item(s) are currently assigned to this category. Please reassign or delete those items first.`,
    };
  }

  const { error } = await adminClient.from("categories").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
