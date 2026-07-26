import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Only /admin needs session refresh. The marketing site, /apply,
  // /apply/callback, /summer and /smportal are all anonymous or use
  // their own cookie — running the Supabase auth refresh on them is
  // what was 404ing the callback page.
  matcher: ["/admin/:path*"],
};