import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth cookie on every request that passes
 * through middleware.
 *
 * THE ONE THING NOT TO REMOVE: `await supabase.auth.getUser()` below.
 * This is the exact bug flagged in the DB handoff doc — skip that
 * call and session refresh silently no-ops, so logged-in
 * students/teachers/admins get bounced unpredictably. It looks like
 * dead code because the return value isn't used directly; it isn't.
 * The call itself is what triggers the cookie refresh.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Missing env in the Edge bundle would produce a fetch to
  // "undefined/auth/v1/user" — bail rather than throw.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  /* The call itself is what refreshes the cookie — the return value
     is unused on purpose. Wrapped because the Edge runtime can fail
     to reach Supabase (proxy, IPv6, DNS) and a refresh failure must
     not 500 the request. The real auth gate is getUser() in
     admin/(protected)/layout.tsx, which runs in Node. */
  try {
    await supabase.auth.getUser();
  } catch (err) {
    console.warn("session refresh skipped:", (err as Error).message);
  }

  return response;
}