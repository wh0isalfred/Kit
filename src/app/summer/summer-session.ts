"use server";

import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";

/* ────────────────────────────────────────────────────────────
   Summer session — ADR 002.
   ────────────────────────────────────────────────────────────
   Summer students have no Supabase Auth account. The whole gate is
   a signed cookie: verify_summer_id() confirms the ID against the
   roster (rate-limited, atomic), and on success we set a cookie the
   portal reads.

   The cookie is HMAC-signed with the service role key so it can't be
   forged — a kid can't hand-craft a cookie for an ID that was never
   issued. It carries the summer_student id and cohort year, nothing
   sensitive.
   ──────────────────────────────────────────────────────────── */

const COOKIE = "kit_summer";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — a camp runs 3 weeks

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** payload.signature — payload is base64url of {sid, year, iat}. */
function makeToken(sid: string, year: number): string {
  const payload = Buffer.from(
    JSON.stringify({ sid, year, iat: Date.now() })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export type SummerSession = { sid: string; year: number } | null;

/**
 * Reads and verifies the cookie. Returns null for anything that
 * isn't a validly-signed, unexpired token. The portal calls this;
 * null means "send them back to the gate".
 */
export async function getSummerSession(): Promise<SummerSession> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;

  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;

  // Constant-time compare; throws on length mismatch, hence try.
  try {
    const expected = sign(payload);
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  try {
    const { sid, year, iat } = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );
    if (Date.now() - iat > MAX_AGE * 1000) return null; // expired
    return { sid, year };
  } catch {
    return null;
  }
}

export type GateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "rate_limited" | "error"; retryAfter?: number };

/**
 * The entry point the /summer sign-in box calls. Hands the ID
 * straight to verify_summer_id(), which does rate-limit -> lookup ->
 * record atomically and reveals nothing about WHY a bad ID failed.
 * On success, sets the signed cookie.
 */
export async function enterSummerId(rawId: string): Promise<GateResult> {
  if (!rawId.trim()) return { ok: false, reason: "not_found" };

  const supabase = await createClient();
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const ua = headerList.get("user-agent") ?? null;

  const { data, error } = await supabase.rpc("verify_summer_id", {
    p_summer_id: rawId.trim(),
    p_ip: ip,
    p_user_agent: ua,
  });

  if (error) {
    console.error("enterSummerId:", error.message);
    return { ok: false, reason: "error" };
  }

  const row = data?.[0];
  if (!row?.ok) {
    return {
      ok: false,
      reason: row?.reason === "rate_limited" ? "rate_limited" : "not_found",
      retryAfter: row?.retry_after ?? undefined,
    };
  }

  const store = await cookies();
  store.set(COOKIE, makeToken(row.student_id, row.cohort_year), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });

  return { ok: true };
}

export async function signOutSummer(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Mints a short-lived signed URL for a stored file, but only after
 * confirming the caller holds a valid summer session. Storage
 * objects in the `summer` bucket have no student-facing RLS (ADR
 * 002), so this cookie check IS the gate.
 *
 * Honest tradeoff, already noted in migration 0012: a signed URL is
 * forwardable once minted. Fine for slides and homework.
 * 
 * {Just need to make a change so I can commit}
 * 
 */
export async function getSummerFileUrl(
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSummerSession();
  if (!session) return { ok: false, error: "Not signed in." };

  // Two legitimate path shapes exist in the `summer` bucket:
  //   {year}/week{n}/...                     — admin-uploaded resources
  //   submissions/{sid}/{resourceId}/...     — a student's own homework
  //
  // The original check only allowed the first, so reopening your own
  // submitted file failed every time. Submissions are scoped to the
  // caller's OWN sid, which is stricter than the resource rule — a
  // student can never reach another student's work.
  const isCohortResource = storagePath.startsWith(`${session.year}/`);
  const isOwnSubmission = storagePath.startsWith(`submissions/${session.sid}/`);

  if (!isCohortResource && !isOwnSubmission) {
    return { ok: false, error: "Not available." };
  }

  const supabase = await createClient();

  // Strip the "{timestamp}-" prefix the upload code adds (see
  // uploadResourceFile) so the browser saves the file under its
  // original name — "README.md", not "1753812345678-README.md".
  const rawName = storagePath.split("/").pop() ?? "download";
  const downloadName = rawName.replace(/^\d+-/, "");

  const { data, error } = await supabase.storage
    .from("summer")
    .createSignedUrl(storagePath, 60 * 10, { download: downloadName });

  if (error || !data) {
    console.error("getSummerFileUrl:", storagePath, error?.message);
    return { ok: false, error: "Couldn't open that file." };
  }
  return { ok: true, url: data.signedUrl };
}

/**
 * Records attendance for the CALLER'S OWN session — never accepts a
 * student id from the client. check_in_attendance() itself trusts
 * whatever id it's given, so this server action is the actual
 * boundary: it reads the signed cookie, and that's the only identity
 * that ever reaches the RPC.
 *
 * Fire-and-forget from the UI's perspective — called on "Join class"
 * click without blocking navigation to the meet link.
 */
export async function checkIntoClass(
  batchId: string,
  week: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSummerSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_attendance", {
    p_summer_student_id: session.sid,
    p_batch_id: batchId,
    p_week: week,
  });

  if (error) {
    console.error("checkIntoClass:", error.message);
    return { ok: false, error: "Couldn't record attendance." };
  }
  return { ok: true };
}

/**
 * Turn in homework — link OR file, the caller's own session only.
 * Wraps turn_in_homework (0023), which upserts and resets any prior
 * feedback. Exactly one of url / storagePath should be set,
 * matching the task's submission_type; the RPC guards that the
 * target actually accepts submissions.
 */
export async function turnInHomework(args: {
  resourceId: string;
  url?: string;
  storagePath?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSummerSession();
  if (!session) return { ok: false, error: "Not signed in." };

  if (!args.url?.trim() && !args.storagePath) {
    return { ok: false, error: "Attach a link or file first." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("turn_in_homework", {
    p_summer_student_id: session.sid,
    p_resource_id: args.resourceId,
    p_url: args.url?.trim() || null,
    p_storage_path: args.storagePath || null,
  });

  if (error) {
    console.error("turnInHomework:", error.message);
    return { ok: false, error: "Couldn't turn that in — try again." };
  }
  return { ok: true };
}

/**
 * Unsubmit — pull work back to the "not turned in" state. The RPC
 * refuses if a teacher has already returned it (would discard their
 * feedback), so a failure there is expected, not a bug.
 */
export async function unsubmitHomework(
  resourceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSummerSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("unsubmit_homework", {
    p_summer_student_id: session.sid,
    p_resource_id: resourceId,
  });

  if (error) {
    console.error("unsubmitHomework:", error.message);
    return { ok: false, error: "Couldn't unsubmit — try again." };
  }
  return { ok: true };
}

/**
 * Mints a signed upload URL for a student's own homework file. Same
 * reasoning as createResourceUploadUrl — the file bypasses Vercel
 * entirely, removing the ~4.5MB serverless payload ceiling.
 *
 * The path is built HERE from the verified session's sid, never from
 * anything the client sends, so a student cannot mint a URL pointing
 * into another student's folder.
 */
export async function createSubmissionUploadUrl(args: {
  fileName: string;
  resourceId: string;
}): Promise <{ ok: true; uploadUrl: string; token: string; path: string } | { ok: false; error: string }> {
  const session = await getSummerSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const safeName = args.fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);

  // submissions/{student}/{resource}/{ts}-name — sid comes from the
  // verified cookie, NOT from the client.
  const path = `submissions/${session.sid}/${args.resourceId}/${Date.now()}-${safeName}`;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("summer")
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("createSubmissionUploadUrl:", error?.message);
    return { ok: false, error: "Couldn't start the upload. Try again." };
  }

  return { ok: true, uploadUrl: data.signedUrl, token: data.token, path };
}
