"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Mirrors getSubmissionFileUrl in admin's batch-actions.ts, and
 * applies the download-option fix doc 07/02 already document as a
 * real, previously-hit bug: without { download: filename }, any
 * browser-renderable type (markdown, plain text, some PDFs) opens
 * inline instead of downloading — binary types like .zip worked by
 * accident, which is exactly why that bug wasn't caught until someone
 * tried a .pptx. Applying the fix here from the start rather than
 * discovering the same gap a second time.
 *
 * Uses plain createClient(), not assertAdmin() or
 * assertTeacherForBatch() — RLS on summer_resources (0045) is the
 * real gate for whether this teacher can even see the row this
 * storage_path belongs to; a signed URL for a path they were never
 * allowed to read isn't reachable in the first place since the UI
 * only ever calls this for a resource already fetched under RLS.
 */
export async function getTeacherResourceFileUrl(
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Strip the upload-time "{timestamp}-" prefix so the downloaded
  // file has a clean, real name rather than "1786xxxxx-README.md" —
  // same fix doc 07 documents for this exact pattern elsewhere.
  const rawName = storagePath.split("/").pop() ?? "file";
  const downloadName = rawName.replace(/^\d+-/, "");

  const { data, error } = await supabase.storage
    .from("summer")
    .createSignedUrl(storagePath, 60 * 10, { download: downloadName });

  if (error || !data) {
    console.error("getTeacherResourceFileUrl:", storagePath, error?.message);
    return { ok: false, error: "Couldn't open that file." };
  }

  return { ok: true, url: data.signedUrl };
}
