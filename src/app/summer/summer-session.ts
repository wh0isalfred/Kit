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
 */
export async function getSummerFileUrl(
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSummerSession();
  if (!session) return { ok: false, error: "Not signed in." };

  // Confine to this cohort's folder — a valid session for 2026 can't
  // fish files out of another year.
  if (!storagePath.startsWith(`${session.year}/`)) {
    return { ok: false, error: "Not available." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("summer")
    .createSignedUrl(storagePath, 60 * 10); // 10 minutes

  if (error || !data) return { ok: false, error: "Couldn't open that file." };
  return { ok: true, url: data.signedUrl };
}
