import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  const store = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (updates) => {
        try {
          for (const { name, value, options } of updates) store.set(name, value, options);
        } catch {
          // Server Components read cookies. Proxy refreshes them before rendering.
        }
      },
    },
  });
}
