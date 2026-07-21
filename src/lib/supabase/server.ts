import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads/writes the auth cookie via Next's cookies() API.
 *
 * Do NOT import this into a Client Component ("use client") — it
 * uses next/headers, which only works on the server. Client
 * Components that need Supabase directly (none currently do — the
 * apply form goes through a Server Action instead) should get their
 * own browser client in client.ts.
 *
 * Once you've run:
 *   npx supabase gen types typescript --linked > src/lib/database.types.ts
 * you can tighten this up with:
 *   import type { Database } from "@/lib/database.types";
 *   createServerClient<Database>(...)
 * for full query type-safety. Left untyped for now so this file
 * doesn't depend on a codegen step that may not have run yet.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render, which can't set
            // cookies. Safe to ignore as long as middleware.ts is
            // refreshing the session on every request (see
            // src/lib/supabase/middleware.ts).
          }
        },
      },
    }
  );
}
