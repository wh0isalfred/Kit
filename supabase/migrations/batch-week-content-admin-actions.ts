/* ══════════════════════════════════════════════════════════════
   BATCH WEEK CONTENT — title/note, per-batch curriculum
   Admin's own version of the same functions built for teachers
   (teacher/batch/[batchId]/actions.ts) — same table
   (batch_week_content, migration 0040), same shape, gated by
   assertAdmin() instead of assertTeacherForBatch since batch_week_content
   already has an is_admin() ALL policy from 0040. Added here because
   admin's Class tab (ClassSessionForm.tsx) never got the week-content
   block that shipped for teachers — admin and teacher were showing
   different things on the same tab until this.
   ══════════════════════════════════════════════════════════════ */

export type BatchWeekContent = {
  title: string | null;
  note_to_students: string | null;
  published: boolean;
};

export async function getBatchWeekContentAdmin(
  batchId: string,
  weekNumber: number
): Promise<{ ok: true; content: BatchWeekContent | null } | { ok: false; error: string }> {
  const supabase = await assertAdmin();

  const { data, error } = await supabase
    .from("batch_week_content")
    .select("title, note_to_students, published")
    .eq("batch_id", batchId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  return { ok: true, content: data };
}

export type SaveBatchWeekContentAdminInput = {
  batch_id: string;
  week_number: number;
  title: string;
  note_to_students: string;
  published: boolean;
};

export async function saveBatchWeekContentAdmin(
  input: SaveBatchWeekContentAdminInput
): Promise<Result> {
  const supabase = await assertAdmin();

  if (input.published && !input.title.trim()) {
    return {
      ok: false,
      error: "Give the week a title before publishing it — students will see this.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("batch_week_content").upsert(
    {
      batch_id: input.batch_id,
      week_number: input.week_number,
      title: input.title.trim() || null,
      note_to_students: input.note_to_students.trim() || null,
      published: input.published,
      updated_by: user?.id ?? null,
    },
    { onConflict: "batch_id,week_number" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/summer");
  return { ok: true };
}
