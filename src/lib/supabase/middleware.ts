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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not remove or reorder — see the comment above.
  await supabase.auth.getUser();

  return response;
}
