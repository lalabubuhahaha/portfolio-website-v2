import type { CookieOptions } from "@supabase/ssr";

export const adminCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
} satisfies CookieOptions;
