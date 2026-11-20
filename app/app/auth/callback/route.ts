// Magic-link landing: Supabase emails a link to /auth/callback?code=… — this
// handler exchanges the code for a session cookie and sends the visitor to
// their scrapbook. When saving is not configured there is nothing to
// exchange; the handler says so via the notice parameter instead of failing.
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/account";

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/account?notice=not-connected`);
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/account?notice=link-failed`);
}
