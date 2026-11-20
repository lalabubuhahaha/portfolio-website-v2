import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });
  const isLogin = request.nextUrl.pathname === "/admin/login";

  function finish(signedIn: boolean) {
    if (!signedIn && !isLogin && (request.method === "GET" || request.method === "HEAD")) {
      const redirect = NextResponse.redirect(new URL("/admin/login", request.url));
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      response = redirect;
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (!config) return finish(false);

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates, headers) => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        const previous = response;
        response = NextResponse.next({ request });
        for (const cookie of previous.cookies.getAll()) response.cookies.set(cookie);
        for (const { name, value, options } of updates) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return finish(Boolean(data?.claims.sub));
}

export const config = { matcher: ["/admin/:path*"] };
