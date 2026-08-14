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
 *
 * meet_link / next_class_at used to live here but don't anymore —
 * they're per-batch now (summer_batch_sessions, via saveBatchSession
 * below), since different batches run at different times. This
 * table is curriculum only: what's being taught, not when or by whom.
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
      },
      { onConflict: "cohort_year,week" }
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/summer");
  return { ok: true };
}

/**
 * Per-batch, per-week session details — instructor, meet link,
 * schedule. This is what actually varies between batches running
 * the same curriculum at different times.
 */
export type BatchSessionInput = {
  batchId: string;
  week: number;
  instructor: string;
  meetLink: string;
  nextClassAt: string | null;
};

export async function saveBatchSession(input: BatchSessionInput): Promise<ActionResult> {
  const supabase = await assertAdmin();

  if (input.week < 1 || input.week > 3) {
    return { ok: false, error: "Week must be between 1 and 3." };
  }

  const { error } = await supabase
    .from("summer_batch_sessions")
    .upsert(
      {
        batch_id: input.batchId,
        week: input.week,
        instructor: input.instructor.trim() || null,
        meet_link: input.meetLink.trim() || null,
        next_class_at: input.nextClassAt || null,
      },
      { onConflict: "batch_id,week" }
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/smportal");
  return { ok: true };
}

/**
 * Replaces setSummerLive below — live state is per (batch, week) now,
 * not cohort-wide, since two batches are never live at the same
 * moment. setSummerLive is left in place, unused by the UI after
 * this change, rather than deleted outright — see the note on it.
 */
export async function setBatchLive(
  batchId: string,
  week: number,
  live: boolean
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_batch_live", {
    p_batch_id: batchId,
    p_week: week,
    p_live: live,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/smportal");
  return { ok: true };
}

/**
 * Superseded by setBatchLive above — this still works exactly as
 * before (sets summer_cohorts.is_live), but the portal no longer
 * reads that column, so calling this now has no visible effect on
 * students. Left in place, not deleted, so GoLiveControl.tsx (which
 * still imports this) doesn't break the build if it isn't removed in
 * the same pass. Delete both together once you've confirmed the new
 * batch-scoped flow works.
 */
export async function setSummerLive(
  cohortYear: number,
  live: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_summer_live", {
    p_cohort_year: cohortYear,
    p_live: live,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  revalidatePath("/smportal");
  return { ok: true };
}

/**
 * Email 2 of 2 — the Student ID and portal walkthrough.
 *
 * Scheduled 15 minutes out via Resend's native scheduling, purely so
 * the parent isn't hit with two emails in the same second. No cron, no
 * queue table — Resend holds it.
 *
 * Deliberately best-effort, like the welcome email: a failure here
 * must never block enrolment. But unlike the welcome email, this one
 * carries the student's ONLY credential, so a failure is recorded (or
 * rather, not recorded) in summer_students.id_email_sent_at — a NULL
 * there means that family cannot log in and needs chasing.
 */
