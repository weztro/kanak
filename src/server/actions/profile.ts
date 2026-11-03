"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface ProfileData {
  id: string;
  email?: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
}

export interface ProfileActionResponse {
  success: boolean;
  error?: string;
  data?: ProfileData;
}

const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(60),
  phone: z.string().max(20).optional().nullable(),
  avatar_url: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Get current user profile details
 */
export async function getUserProfile(): Promise<ProfileData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // If not found, create one
    const newProfile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      avatar_url: user.user_metadata?.avatar_url || null,
      phone: null,
    };
    await adminClient.from("profiles").upsert(newProfile);
    return { ...newProfile, email: user.email };
  }

  return {
    id: profile.id,
    email: user.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    phone: profile.phone,
  };
}

/**
 * Update current user profile
 */
export async function updateUserProfileAction(
  values: unknown
): Promise<ProfileActionResponse> {
  const parsed = updateProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please log in first" };
  }

  const adminClient = createAdminClient();
  const updateData = {
    full_name: parsed.data.full_name.trim(),
    phone: parsed.data.phone?.trim() || null,
    avatar_url: parsed.data.avatar_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminClient
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Also update auth user metadata for consistency
  try {
    await supabase.auth.updateUser({
      data: {
        full_name: updateData.full_name,
        avatar_url: updateData.avatar_url,
      },
    });
  } catch {
    // Non-fatal if metadata update fails
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    data: {
      id: user.id,
      email: user.email,
      ...updateData,
    },
  };
}
