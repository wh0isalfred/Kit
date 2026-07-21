import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE CLIENT — BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * Every RLS policy in migration 0010 is inert for this client. It
 * can read any student's parent phone number, any application, any
 * payment. Treat every use as if you'd written raw SQL as superuser.
 *
 * Legitimate uses, and there are only two:
 *   1. The Paystack webhook — no user session exists; Paystack's
 *      server is the caller. The signature check is the auth.
 *   2. Creating auth.users on approval — requires admin privileges
 *      by definition.
 *
 * NEVER import this from:
 *   - a "use client" component
 *   - a Server Action reachable by a non-admin
 *   - anything on the marketing site
 *
 * For anything with a logged-in user, use @/lib/supabase/server
 * instead and let RLS do its job. Reaching for this client to "make
 * a query work" is how the security model quietly stops existing.
 *
 * SUPABASE_SERVICE_ROLE_KEY must never be prefixed NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
