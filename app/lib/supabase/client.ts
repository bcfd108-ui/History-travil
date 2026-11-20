// Browser Supabase client — Stage 2 (accounts + saving).
//
// The app reads its Supabase URL and anon key from environment variables:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
// They are wired at deployment (Stage 3: the Marketplace integration injects
// them into the Vercel project). They are NEVER hard-coded here.
//
// When either variable is absent the app is UNCONFIGURED: reading the
// catalog, the Desk, the hunts, and the tours works fully (it never touches
// Supabase), and every saving feature renders its honest dormant state —
// "saving is not connected yet" — instead of pretending to persist.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

let browserClient: SupabaseClient | null = null;

/** The shared browser client, or null when Supabase is not configured. */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
