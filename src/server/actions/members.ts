"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAccommodationId } from "./accommodation";
import { revalidatePath } from "next/cache";
import { Member, MemberRole } from "@/types/database";

export interface MemberActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Fetch all members of the active accommodation with their profile details.
 */
export async function getActiveAccommodationMembers(): Promise<Member[]> {
  const accId = await getActiveAccommodationId();
  if (!accId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select(`
      id,
      accommodation_id,
      profile_id,
      role,
      joining_date,
      leaving_date,
      is_active,
      created_at,
      updated_at,
      profile:profiles(id, full_name, avatar_url, phone)
    `)
    .eq("accommodation_id", accId)
    .order("joining_date", { ascending: true });

  return (data as unknown as Member[]) || [];
}

/**
 * Update member role (admin/member). Restricted to accommodation admins only.
 */
export async function updateMemberRoleAction(
  memberId: string,
  newRole: MemberRole
): Promise<MemberActionResponse> {
  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation selected" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Verify caller is admin
  const { data: adminCheck } = await supabase
    .from("members")
    .select("role")
    .eq("accommodation_id", accId)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminCheck) {
    return { success: false, error: "Only admins can change member roles." };
  }

  const { error } = await supabase
    .from("members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("accommodation_id", accId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/members");
  return { success: true };
}

/**
 * Toggle member active status.
 */
export async function toggleMemberStatusAction(
  memberId: string,
  isActive: boolean
): Promise<MemberActionResponse> {
  const accId = await getActiveAccommodationId();
  if (!accId) return { success: false, error: "No active accommodation selected" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Verify caller is admin
  const { data: adminCheck } = await supabase
    .from("members")
    .select("role")
    .eq("accommodation_id", accId)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminCheck) {
    return { success: false, error: "Only admins can change member status." };
  }

  const updateData: { is_active: boolean; leaving_date?: string | null; updated_at: string } = {
    is_active: isActive,
    leaving_date: isActive ? null : new Date().toISOString().split("T")[0],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("members")
    .update(updateData)
    .eq("id", memberId)
    .eq("accommodation_id", accId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/members");
  return { success: true };
}

