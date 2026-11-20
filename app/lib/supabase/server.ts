// Server Supabase client — used only by the auth callback route handler to
// exchange the magic-link code for a session cookie. No server-rendered page
// depends on the session: reading is static and ungated, and all account UI
// is client-side, so there is deliberately no auth middleware in this build.
//
// Returns null when Supabase is not configured (env vars absent) so callers
// can degrade honestly instead of throwing.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./client";

export async function createServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a context that cannot set cookies; the session is
          // still picked up by the browser client on the next page load.
        }
      },
    },
  });
}
