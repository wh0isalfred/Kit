import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSummerSession } from "../../../summer/summer-session";
import Footer from "@/components/site/Footer";
import HomeworkDetail, { type HomeworkItem, type MySubmission } from "./HomeworkDetail";

export const dynamic = "force-dynamic";

export default async function HomeworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSummerSession();
  if (!session) redirect("/summer");

  const supabase = await createClient();

  // The assignment itself.
  //
  // BUG FIX: this used to be a direct `.from("summer_resources").select(...)`.
  // 0016's RLS on summer_resources grants SELECT to is_admin() only — there is
  // no anon/student read policy, by design, since summer students have no
  // Supabase Auth session for RLS to scope to (ADR 002). That means the direct
  // read always came back empty for a real student session, `item` was always
  // null, and every real homework link 404'd. Same bug class 0024 fixed for
  // summer_submissions, just missed here.
  //
  // get_summer_resources is the correct read path — it's SECURITY DEFINER,
  // already used by the portal and the resources page, and it already filters
  // to published + this cohort year + week <= current_week internally. That
  // means once a row comes back matching this id, those checks are already
  // satisfied — no need to re-check them here.
  const { data: resources, error: resourcesError } = await supabase.rpc(
    "get_summer_resources",
    {
      p_cohort_year: session.year,
      p_summer_student_id: session.sid,
    }
  );

  if (resourcesError) {
    console.error("HomeworkDetailPage get_summer_resources:", resourcesError.message);
  }

  const item = resources?.find((r) => r.id === id && r.kind === "homework") ?? null;

  if (!item) {
    notFound();
  }

  // This student's own submission, if any — via RPC, because RLS blocks anon
  // direct reads of summer_submissions (0023). The RPC is the read side of the
  // same trusted-sid model as turn-in.
  const { data: subRows } = await supabase.rpc("get_my_submission", {
    p_summer_student_id: session.sid,
    p_resource_id: id,
  });
  const sub = subRows?.[0] ?? null;

  const homeworkItem: HomeworkItem = {
    id: item.id,
    week: item.week,
    title: item.title,
    description: item.description,
    submission_type: item.submission_type as "link" | "file" | null,
    url: item.url,
    storage_path: item.storage_path,
  };

  return (
    <div>
      <HomeworkDetail
        item={homeworkItem}
        submission={(sub ?? null) as MySubmission}
      />
      <Footer />
    </div>
  );
}
