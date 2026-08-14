import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a file directly to Supabase Storage using a signed upload
 * URL minted server-side. The bytes never touch Vercel.
 *
 * Callers keep the same shape they had with the old Server Action
 * upload — pass a file, get back { path, name } — so components only
 * change which function they call, not how they handle the result.
 */
export async function uploadDirect(
  file: File,
  mint: () => Promise <{ ok: true; uploadUrl: string; token: string; path: string } | { ok: false; error: string } >,
  maxBytes = 25 * 1024 * 1024
): Promise<{ ok: true; path: string; name: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return {
      ok: false,
      error: `That file is over ${mb}MB. Put large videos on YouTube or Drive and add them as a link instead.`,
    };
  }

  const minted = await mint();
  if (!minted.ok) return { ok: false, error: minted.error };

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("summer")
    .uploadToSignedUrl(minted.path, minted.token, file, {
      contentType: file.type || undefined,
    });

  if (error) {
    console.error("uploadDirect:", error.message);
    return { ok: false, error: "Upload failed — try again." };
  }

  return { ok: true, path: minted.path, name: file.name };
}