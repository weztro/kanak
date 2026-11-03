"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createAccommodationSchema, inviteMemberSchema } from "@/lib/validations/accommodation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Accommodation, Member } from "@/types/database";

export interface AccommodationResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

const CURRENT_ACCOMMODATION_COOKIE = "kanak_active_accommodation";

/**
 * Returns the currently active accommodation ID from the cookie, or the user's first accommodation.
 */
export async function getActiveAccommodationId(): Promise<string | null> {
  const cookieStore = await cookies();
  const savedId = cookieStore.get(CURRENT_ACCOMMODATION_COOKIE)?.value;
  if (savedId) {
    return savedId;
  }

  // Fallback to first accommodation the user is member of
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("accommodation_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.accommodation_id) {
    try {
      cookieStore.set(CURRENT_ACCOMMODATION_COOKIE, data.accommodation_id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: "lax",
      });
    } catch {
      // Ignored: Server Component render pass cannot modify cookies, return id directly
    }
    return data.accommodation_id;
  }

  return null;
}

/**
 * Switch active accommodation.
 */
export async function switchAccommodationAction(accommodationId: string): Promise<AccommodationResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify membership
  const { data } = await supabase
    .from("members")
    .select("id")
    .eq("accommodation_id", accommodationId)
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    return { success: false, error: "You are not an active member of this accommodation." };
  }

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ACCOMMODATION_COOKIE, accommodationId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Get all accommodations the logged in user belongs to.
 */
export async function getUserAccommodations(): Promise<Accommodation[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("members")
    .select(`
      accommodation_id,
      accommodations:accommodations(*)
    `)
    .eq("profile_id", user.id)
    .eq("is_active", true);

  if (!data) return [];
  // Typecast accommodations
  return data
    .map((item) => (item as unknown as { accommodations: Accommodation }).accommodations)
    .filter(Boolean);
}

/**
 * Create a new shared accommodation and set creator as admin.
 */
export async function createAccommodationAction(values: unknown): Promise<AccommodationResponse> {
  const parsed = createAccommodationSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please log in first" };
  }

  // Ensure user profile exists
  const adminClient = createAdminClient();
  await adminClient.from("profiles").upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
  });

  // 1. Insert accommodation
  const { data: acc, error: accError } = await supabase
    .from("accommodations")
    .insert({
      name: parsed.data.name,
      monthly_budget: parsed.data.monthlyBudget,
      default_monthly_contribution: parsed.data.defaultMonthlyContribution,
      currency: parsed.data.currency || "INR",
      created_by: user.id,
    })
    .select()
    .single();

  if (accError || !acc) {
    return { success: false, error: accError?.message || "Failed to create accommodation" };
  }

  // 2. Add creator as admin using admin client to ensure clean setup
  const { error: memError } = await adminClient.from("members").insert({
    accommodation_id: acc.id,
    profile_id: user.id,
    role: "admin",
    is_active: true,
  });

  if (memError) {
    return { success: false, error: memError.message };
  }

  // 3. Set active cookie
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ACCOMMODATION_COOKIE, acc.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { success: true, data: acc };
}

/**
 * Join an accommodation using its unique invite code.
 */
export async function joinAccommodationByCodeAction(inviteCode: string): Promise<AccommodationResponse> {
  const cleanCode = inviteCode?.trim();
  if (!cleanCode) {
    return { success: false, error: "Please provide a valid invite code" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please log in first" };
  }

  // Use admin client to query accommodation by invite code and insert membership,
  // bypassing RLS since non-members cannot query accommodations they do not yet belong to.
  const adminClient = createAdminClient();

  // Find accommodation (case-insensitive)
  const { data: acc, error: findError } = await adminClient
    .from("accommodations")
    .select("id, name")
    .ilike("invite_code", cleanCode)
    .maybeSingle();

  if (findError || !acc) {
    return { success: false, error: "Invalid invite code or accommodation not found." };
  }

  // Ensure user profile exists in public.profiles to satisfy foreign key constraint
  await adminClient.from("profiles").upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
  });

  // Check if already a member
  const { data: existing } = await adminClient
    .from("members")
    .select("id, is_active")
    .eq("accommodation_id", acc.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    if (!existing.is_active) {
      await adminClient.from("members").update({ is_active: true }).eq("id", existing.id);
    }
  } else {
    // Add user as regular member (strictly enforced: never admin)
    const { error: joinError } = await adminClient.from("members").insert({
      accommodation_id: acc.id,
      profile_id: user.id,
      role: "member",
      is_active: true,
    });
    if (joinError) {
      return { success: false, error: joinError.message };
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ACCOMMODATION_COOKIE, acc.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { success: true, data: acc };
}

/**
 * Get active members of the accommodation.
 */
export async function getAccommodationMembers(accommodationId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("accommodation_id", accommodationId)
    .eq("is_active", true)
    .order("role", { ascending: true });

  return (data as unknown as Member[]) || [];
}

/**
 * Invite a member to the accommodation.
 */
export async function inviteMemberAction(
  accommodationId: string,
  values: unknown
): Promise<AccommodationResponse> {
  const parsed = inviteMemberSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Check if admin
  const { data: adminCheck } = await supabase
    .from("members")
    .select("role")
    .eq("accommodation_id", accommodationId)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminCheck) {
    return { success: false, error: "Only accommodation admins can invite members." };
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      accommodation_id: accommodationId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/members");
  return { success: true, data: invitation };
}

/**
 * Update accommodation settings (restricted to admin).
 */
export async function updateAccommodationSettingsAction(
  accommodationId: string,
  values: {
    name: string;
    monthlyBudget: number;
    defaultMonthlyContribution: number;
    currency: string;
  }
): Promise<AccommodationResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Verify admin role
  const { data: adminCheck } = await supabase
    .from("members")
    .select("role")
    .eq("accommodation_id", accommodationId)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!adminCheck) {
    return { success: false, error: "Only admins can change accommodation settings." };
  }

  const { error } = await supabase
    .from("accommodations")
    .update({
      name: values.name.trim(),
      monthly_budget: values.monthlyBudget,
      default_monthly_contribution: values.defaultMonthlyContribution,
      currency: values.currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accommodationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
