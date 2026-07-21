"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Every action here re-checks admin server-side. The (protected)
 * layout guard is a UX convenience — it stops a non-admin seeing the
 * page. It is NOT the security boundary, because a Server Action can
 * be invoked directly without ever rendering that layout.
 *
 * The real boundary is RLS: summer_cohorts and summer_content are
 * admin-only for writes (migration 0010). Even if this check were
 * removed, a non-admin's update would affect zero rows. This exists
 * so the failure is a clear error rather than a silent no-op.
 */
async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorised");
  return supabase;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export type CohortInput = {
  year: number;
  label: string;
  currentWeek: number;
  startsOn: string | null;
  endsOn: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  prizeNaira: number | null;
};

export async function saveCohort(input: CohortInput): Promise<ActionResult> {
  const supabase = await assertAdmin();

  if (!input.label.trim()) {
    return { ok: false, error: "A cohort label is required." };
  }
  if (input.currentWeek < 1 || input.currentWeek > 12) {
    return { ok: false, error: "Current week must be between 1 and 12." };
  }
  if (input.startsOn && input.endsOn && input.startsOn > input.endsOn) {
    return { ok: false, error: "The camp can't end before it starts." };
  }
  if (
    input.registrationOpensAt &&
    input.registrationClosesAt &&
    input.registrationOpensAt > input.registrationClosesAt
  ) {
    return { ok: false, error: "Registration can't close before it opens." };
  }

  const { error } = await supabase
    .from("summer_cohorts")
    .update({
      label: input.label.trim(),
      current_week: input.currentWeek,
      starts_on: input.startsOn || null,
      ends_on: input.endsOn || null,
      registration_opens_at: input.registrationOpensAt || null,
      registration_closes_at: input.registrationClosesAt || null,
      // Stored as kobo. Converted here, at the boundary — never in
      // the component.
      prize_kobo: input.prizeNaira !== null ? Math.round(input.prizeNaira * 100) : null,
    })
    .eq("year", input.year);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/");           // homepage countdown reads this
  revalidatePath("/summer");
  return { ok: true };
}

/**
 * Only one cohort may be active — summer_cohorts_one_active is a
 * unique index, so activating a second would fail rather than
 * silently creating two. Deactivate the others first.
 */
export async function setActiveCohort(year: number): Promise<ActionResult> {
  const supabase = await assertAdmin();

  const { error: clearError } = await supabase
    .from("summer_cohorts")
    .update({ active: false })
    .neq("year", year);
  if (clearError) return { ok: false, error: clearError.message };

  const { error } = await supabase
    .from("summer_cohorts")
    .update({ active: true })
    .eq("year", year);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/");
  revalidatePath("/summer");
  return { ok: true };
}

export type WeekInput = {
  cohortYear: number;
  week: number;
  published: boolean;
  classTitle: string;
  classNote: string;
  meetLink: string;
  nextClassAt: string | null;
};

/**
 * Upsert one cohort-week. summer_content_one_per_week makes
 * (cohort_year, week) unique, so onConflict on that pair is the
 * correct upsert target.
 *
 * `published` matters more than it looks: get_summer_portal()
 * returns ZERO ROWS for an unpublished week, so the portal renders
 * "materials coming soon" instead of a page of empty headers. Don't
 * publish a week until it actually has content.
 */
export async function saveWeek(input: WeekInput): Promise<ActionResult> {
  const supabase = await assertAdmin();

  if (input.week < 1 || input.week > 12) {
    return { ok: false, error: "Week must be between 1 and 12." };
  }
  if (input.published && !input.classTitle.trim()) {
    return {
      ok: false,
      error: "Give the week a title before publishing it — students will see this.",
    };
  }

  const { error } = await supabase
    .from("summer_content")
    .upsert(
      {
        cohort_year: input.cohortYear,
        week: input.week,
        published: input.published,
        class_title: input.classTitle.trim() || null,
        class_note: input.classNote.trim() || null,
        meet_link: input.meetLink.trim() || null,
        next_class_at: input.nextClassAt || null,
      },
      { onConflict: "cohort_year,week" }
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/summer");
  return { ok: true };
}
