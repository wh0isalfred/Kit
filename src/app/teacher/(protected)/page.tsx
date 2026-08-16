import { createClient } from "@/lib/supabase/server";
import { getMyBatches } from "./actions";
import TeacherLandingView from "./TeacherLandingView";

export const dynamic = "force-dynamic";

/**
 * The protected layout already fetched the teacher's name for the
 * rail, but Next's App Router doesn't pass layout data down to pages
 * as props — each needs its own fetch. This one is a single indexed
 * lookup (teachers.user_id, unique per 0038), not a real cost.
 */
export default async function TeacherLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: teacher } = user
    ? await supabase.from("teachers").select("name").eq("user_id", user.id).single()
    : { data: null };

  const result = await getMyBatches();

  if (!result.ok) {
    return <p className="af-submit-error">Couldn't load your batches: {result.error}</p>;
  }

  return <TeacherLandingView name={teacher?.name ?? "there"} batches={result.batches} />;
}
