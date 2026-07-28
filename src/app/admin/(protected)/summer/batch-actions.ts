"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

type Result<T = {}> = { ok: true; id?: string } & T | { ok: false; error: string };

export async function createBatch(
  courseSlug: string,
  year: number,
  cohortNumber: number,
  label: string,
  capacity: number
): Promise<Result<{ id: string }>> {
  const supabase = await assertAdmin();

  if (!label.trim()) {
    return { ok: false, error: "Batch label is required" };
  }
  if (capacity < 1) {
    return { ok: false, error: "Capacity must be at least 1" };
  }

  const { data, error } = await supabase
    .from("batches")
    .insert({
      course_slug: courseSlug,
      year,
      cohort_number: cohortNumber,
      cohort_label: label.trim(),
      capacity,
      status: "active",
      next_student_no: 1,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/summer");
  return { ok: true, id: data.id };
}

export async function updateBatch(
  batchId: string,
  label: string,
  capacity: number
): Promise<Result> {
  const supabase = await assertAdmin();

  if (!label.trim()) {
    return { ok: false, error: "Batch label is required" };
  }
  if (capacity < 1) {
    return { ok: false, error: "Capacity must be at least 1" };
  }

  const { error } = await supabase
    .from("batches")
    .update({
      cohort_label: label.trim(),
      capacity,
    })
    .eq("id", batchId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/summer");
  return { ok: true };
}

export async function deleteBatch(batchId: string): Promise<Result> {
  const supabase = await assertAdmin();

  /* Check if the batch has any students. If so, refuse — don't
     orphan them by deleting their batch. */
  const { count } = await supabase
    .from("summer_students")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `This batch has ${count} student${count === 1 ? "" : "s"} enrolled. Remove them first or reassign to another batch.`,
    };
  }

  const { error } = await supabase.from("batches").delete().eq("id", batchId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/summer");
  return { ok: true };
}
