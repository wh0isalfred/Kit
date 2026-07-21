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
  return { supabase, userId: user.id };
}

const bump = () => {
  revalidatePath("/admin/summer");
  revalidatePath("/summer");
};

export type ResourceKind =
  | "link"
  | "video"
  | "file"
  | "slides"
  | "code"
  | "recording"
  | "homework";

export type ResourceInput = {
  id?: string;
  cohortYear: number;
  week: number;
  dayNumber: number | null;
  title: string;
  description: string;
  kind: ResourceKind;
  url: string;
  storagePath: string | null;
  codeBody: string;
  codeLanguage: string;
  published: boolean;
  availableFrom: string | null;
  sortOrder: number;
};

export type Result = { ok: true; id?: string } | { ok: false; error: string };

export async function saveResource(input: ResourceInput): Promise<Result> {
  const { supabase, userId } = await assertAdmin();

  if (!input.title.trim()) {
    return { ok: false, error: "Give it a title — students see this." };
  }

  /* A resource with no payload renders as a dead card in a child's
     portal. The DB constraint catches it too; this is the friendly
     version of the same rule. */
  const usesUrl = ["link", "video", "recording"].includes(input.kind);
  const usesFile = ["file", "slides", "homework"].includes(input.kind);
  const usesCode = input.kind === "code";

  if (usesUrl && !input.url.trim()) {
    return { ok: false, error: "Add the link." };
  }
  if (usesFile && !input.storagePath && !input.url.trim()) {
    return { ok: false, error: "Upload a file, or paste a link to it instead." };
  }
  if (usesCode && !input.codeBody.trim()) {
    return { ok: false, error: "Add the code." };
  }

  const row = {
    cohort_year: input.cohortYear,
    week: input.week,
    day_number: input.dayNumber,
    title: input.title.trim(),
    description: input.description.trim() || null,
    kind: input.kind,
    url: input.url.trim() || null,
    storage_path: input.storagePath || null,
    code_body: usesCode ? input.codeBody : null,
    code_language: usesCode ? input.codeLanguage.trim() || "text" : null,
    published: input.published,
    available_from: input.availableFrom || null,
    sort_order: input.sortOrder,
    created_by: userId,
  };

  if (input.id) {
    const { error } = await supabase
      .from("summer_resources")
      .update(row)
      .eq("id", input.id);
    if (error) return { ok: false, error: friendly(error.message) };
    bump();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("summer_resources")
    .insert(row)
    .select("id")
    .single();

  if (error) return { ok: false, error: friendly(error.message) };
  bump();
  return { ok: true, id: data.id };
}

/** Publish toggle on its own — the common one-click action. */
export async function toggleResourcePublished(
  id: string,
  published: boolean
): Promise<Result> {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("summer_resources")
    .update({ published })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  bump();
  return { ok: true };
}

export async function deleteResource(id: string): Promise<Result> {
  const { supabase } = await assertAdmin();

  // Remove the stored file too, or the bucket fills with orphans
  // nothing references.
  const { data: existing } = await supabase
    .from("summer_resources")
    .select("storage_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("summer_resources").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (existing?.storage_path) {
    await supabase.storage.from("summer").remove([existing.storage_path]);
  }

  bump();
  return { ok: true };
}

/**
 * Uploads into the `summer` bucket. The path shape matters — the
 * storage policy in migration 0012 parses ownership out of it, and
 * a flat bucket would force every download through app-layer signed
 * URLs anyway.
 *
 * Files are served to students as short-lived signed URLs after the
 * cookie check (ADR 002). Note the honest tradeoff already recorded
 * in 0012: a signed URL, once minted, is forwardable. Fine for
 * slides and homework; don't put anything sensitive here.
 */
export async function uploadResourceFile(
  formData: FormData
): Promise<{ ok: true; path: string; name: string } | { ok: false; error: string }> {
  const { supabase } = await assertAdmin();

  const file = formData.get("file") as File | null;
  const cohortYear = formData.get("cohortYear") as string;
  const week = formData.get("week") as string;

  if (!file || file.size === 0) return { ok: false, error: "No file selected." };

  /* Supabase's free tier is 1GB total. A single screen recording
     eats a meaningful slice of that, so large files are refused
     here with a pointer to the cheaper option rather than silently
     consuming the quota. */
  const MAX_BYTES = 25 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error:
        "That file is over 25MB. Put videos on YouTube or Drive and add them as a link instead — storage here is limited.",
    };
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);

  const path = `${cohortYear}/week${week}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("summer")
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (error) return { ok: false, error: error.message };

  return { ok: true, path, name: file.name };
}

/** Reorder within a day. Small lists, so a plain sequence of updates. */
export async function moveResource(
  id: string,
  direction: "up" | "down"
): Promise<Result> {
  const { supabase } = await assertAdmin();

  const { data: me } = await supabase
    .from("summer_resources")
    .select("id, cohort_year, week, day_number, sort_order")
    .eq("id", id)
    .single();

  if (!me) return { ok: false, error: "Resource not found." };

  const query = supabase
    .from("summer_resources")
    .select("id, sort_order")
    .eq("cohort_year", me.cohort_year)
    .eq("week", me.week);

  const { data: siblings } = me.day_number === null
    ? await query.is("day_number", null).order("sort_order")
    : await query.eq("day_number", me.day_number).order("sort_order");

  if (!siblings) return { ok: false, error: "Couldn't reorder." };

  const index = siblings.findIndex((s) => s.id === id);
  const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return { ok: true }; // already at the end

  await supabase
    .from("summer_resources")
    .update({ sort_order: swapWith.sort_order })
    .eq("id", id);
  await supabase
    .from("summer_resources")
    .update({ sort_order: me.sort_order })
    .eq("id", swapWith.id);

  bump();
  return { ok: true };
}

function friendly(raw: string): string {
  if (raw.includes("summer_resources_week_fk")) {
    return "That week doesn't exist yet. Save the week's details first, then add resources to it.";
  }
  if (raw.includes("summer_resources_has_target")) {
    return "A resource needs a link, a file, or some code.";
  }
  return raw;
}
