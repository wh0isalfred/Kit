import { createClient } from "@/lib/supabase/server";

/**
 * Mirrors the `courses` table / `public_courses` view. Kept as a
 * hand-written type rather than importing generated Supabase types,
 * so this works today even before `database.types.ts` exists. Swap
 * to the generated `Database["public"]["Tables"]["courses"]["Row"]`
 * once you've run the typegen command — no call-site changes needed.
 */
export type CourseRow = {
  slug: string;
  code: string;
  title: string;
  type: "term" | "summer";
  track: string | null;
  description: string | null;
  status: "live" | "coming_soon";
  price_naira: number;
  price_monthly_naira: number | null;
  sort_order: number;
};

/**
 * Every course, live and coming_soon — what the homepage grid reads
 * from (live cards + coming-soon pills in one query).
 *
 * Reads from `public_courses`, not `courses` — the view does the
 * kobo→naira conversion in SQL (`price_naira` / `price_monthly_naira`),
 * which is the actual "display boundary" Doc 2 §4 means when it says
 * money is stored as kobo and converted only at that boundary. Nothing
 * past this function should ever do kobo math again.
 *
 * This is deliberately a *different* query from the one in
 * src/app/apply/actions.ts, which reads `courses` directly for its
 * own raw price_kobo — that's intentional, not duplication to clean
 * up: display code gets pre-converted naira from the view, the
 * Server Action re-derives kobo from the source table regardless of
 * what the client displayed. Don't merge these two paths.
 */
export async function getAllCourses(): Promise<CourseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_courses")
    .select(
      "slug, code, title, type, track, description, status, price_naira, price_monthly_naira, sort_order"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    // Fail soft on the marketing site — an empty grid is better than
    // a crashed homepage. The error is still logged so it doesn't
    // disappear silently.
    console.error("getAllCourses:", error.message);
    return [];
  }
  return (data as CourseRow[]) ?? [];
}

/** Only courses a parent can actually submit an application for right now. */
export async function getLiveCourses(): Promise<CourseRow[]> {
  const all = await getAllCourses();
  return all.filter((c) => c.status === "live");
}
