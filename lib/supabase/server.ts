import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import { adminCookieOptions } from "@/lib/supabase/admin-cookies";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  const store = await cookies();

  return createServerClient(config.url, config.key, {
    cookieOptions: adminCookieOptions,
    global: {
      fetch: (input, init) => {
        const timeout = AbortSignal.timeout(12_000);
        return fetch(input, {
          ...init, cache: "no-store",
          signal: init?.signal ? AbortSignal.any([timeout, init.signal]) : timeout,
        });
      },
    },
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
