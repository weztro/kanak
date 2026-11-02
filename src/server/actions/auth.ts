"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, forgotPasswordSchema, updatePasswordSchema } from "@/lib/validations/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ActionResponse {
  success: boolean;
  error?: string;
}

export async function loginAction(values: unknown): Promise<ActionResponse> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function registerAction(values: unknown): Promise<ActionResponse> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    // Upsert user profile
    await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: parsed.data.fullName,
    });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPasswordAction(values: unknown): Promise<ActionResponse> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/update-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updatePasswordAction(values: unknown): Promise<ActionResponse> {
  const parsed = updatePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

