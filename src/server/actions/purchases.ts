"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { purchaseSchema, PurchaseInput } from "@/lib/validations/purchase";
import { validateFileSignature } from "@/lib/security/file-signature";
import { normalizeQuantity } from "@/lib/units";
import { revalidatePath } from "next/cache";
import { Purchase } from "@/types/database";

export interface PurchaseActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fetch purchases for the active accommodation.
 */
export async function getPurchases(): Promise<Purchase[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select(`
      *,
      buyer:members(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      ),
      items:purchase_items(
        *,
        item:items(name, base_unit, category:categories(name))
      )
    `)
    .eq("accommodation_id", accId)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data as unknown as Purchase[]) || [];
}

/**
 * Fetch a single purchase with all items and allocations.
 */
export async function getPurchaseById(purchaseId: string): Promise<Purchase | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select(`
      *,
      buyer:members(
        id,
        role,
        profile:profiles(id, full_name, avatar_url)
      ),
      items:purchase_items(
        *,
        item:items(name, base_unit, category:categories(name))
      )
    `)
    .eq("id", purchaseId)
    .maybeSingle();

  return (data as unknown as Purchase) || null;
}

/**
 * Upload purchase bill receipt to private Supabase Storage bucket 'purchase-bills'
 */
export async function uploadBillFile(
  accommodationId: string,
  purchaseTempId: string,
  file: File
): Promise<{ path: string; name: string; size: number; mime: string } | null> {
  // Validate magic byte signatures
  const validation = await validateFileSignature(file);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid file format");
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "bin";
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${accommodationId}/${purchaseTempId}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from("purchase-bills")
    .upload(storagePath, file, {
      contentType: validation.detectedMime || file.type,
      upsert: false,
    });

  if (error || !data) {
    throw new Error(error?.message || "Storage upload failed");
  }

  return {
    path: data.path,
    name: file.name,
    size: file.size,
    mime: validation.detectedMime || file.type,
  };
}

/**
 * Get temporary signed URL for a private bill file (valid for 60 minutes)
 */
export async function getSignedBillUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("purchase-bills")
    .createSignedUrl(filePath, 3600); // 1 hour expiration

  if (error || !data) {
    return null;
  }
  return data.signedUrl;
}

/**
 * Post purchase atomically via post_purchase_atomic RPC.
 */
export async function createPurchaseAction(
  values: unknown,
  fileFormData?: FormData | null
): Promise<PurchaseActionResponse> {
  const parsed = purchaseSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Handle bill file upload if present
  let billMeta: { path: string; name: string; size: number; mime: string } | null = null;
  if (fileFormData) {
    const file = fileFormData.get("billFile") as File;
    if (file && file.size > 0) {
      try {
        billMeta = await uploadBillFile(accId, crypto.randomUUID(), file);
      } catch (err: unknown) {
        return { success: false, error: (err as Error).message };
      }
    }
  }

  // Normalize items into base units
  const processedItems = parsed.data.items.map((item) => {
    const { normalizedQuantity } = normalizeQuantity(item.quantity, item.unit);
    return {
      item_id: item.itemId,
      quantity: item.quantity,
      unit: item.unit,
      quantity_normalized: normalizedQuantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    };
  });

  // Call atomic PostgreSQL stored procedure
  const { data: purchaseId, error: rpcError } = await supabase.rpc("post_purchase_atomic", {
    p_accommodation_id: accId,
    p_purchase_date: parsed.data.purchaseDate,
    p_shop_name: parsed.data.shopName.trim(),
    p_purchased_by: parsed.data.purchasedBy,
    p_subtotal: parsed.data.subtotal,
    p_discount: parsed.data.discount,
    p_tax: parsed.data.tax,
    p_total_amount: parsed.data.totalAmount,
    p_payment_source: parsed.data.paymentSource,
    p_payment_method: parsed.data.paymentMethod,
    p_bill_file_path: billMeta?.path || parsed.data.billFilePath || null,
    p_bill_file_name: billMeta?.name || parsed.data.billFileName || null,
    p_bill_file_size: billMeta?.size || parsed.data.billFileSize || null,
    p_bill_file_mime: billMeta?.mime || parsed.data.billFileMime || null,
    p_notes: parsed.data.notes || null,
    p_items: processedItems,
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/settlements");
  return { success: true, data: { id: purchaseId } };
}

/**
 * Cancel a posted purchase with compensating stock and fund reversals.
 */
export async function cancelPurchaseAction(purchaseId: string): Promise<PurchaseActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation" };

  // Find user's member ID
  const { data: member } = await supabase
    .from("members")
    .select("id, role")
    .eq("accommodation_id", accId)
    .eq("profile_id", user.id)
    .single();

  if (!member) {
    return { success: false, error: "Member profile not found" };
  }

  // Call atomic cancel RPC
  const { error } = await supabase.rpc("cancel_purchase_atomic", {
    p_purchase_id: purchaseId,
    p_cancelled_by: member.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/settlements");
  return { success: true };
}

