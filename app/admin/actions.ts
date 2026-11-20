"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(1024),
});

export async function signIn(_previous: string, form: FormData) {
  const input = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!input.success) return "Enter a valid email address and password.";

  const supabase = await createSupabaseServerClient();
  if (!supabase) return "Supabase configuration is missing or invalid.";

  const { data, error } = await supabase.auth.signInWithPassword(input.data);
  if (error || !data.user) return "Sign-in failed. Check your credentials or try again later.";

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (membershipError || !membership) {
    await supabase.auth.signOut({ scope: "local" });
    return membershipError ? "Could not verify admin access. Try again later." : "This account does not have admin access.";
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) redirect("/admin/login?signout=failed");
  }
  redirect("/admin/login");
}
