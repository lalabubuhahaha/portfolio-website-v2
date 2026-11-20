import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getAdminSession = cache(async () => {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { state: "unconfigured" } as const;

  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && ![401, 403].includes(error.status ?? 0)) {
    return { state: "unavailable" } as const;
  }
  if (!data.user) return { state: "signed-out" } as const;

  const { data: membership, error: membershipError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (membershipError) return { state: "unavailable" } as const;
  if (!membership) return { state: "forbidden" } as const;
  return { state: "authorized", user: data.user, supabase } as const;
});

export async function requireAdmin() {
  const session = await getAdminSession();
  if (session.state !== "authorized") redirect("/admin/login");
  return session;
}
