"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Deliberately a SEPARATE page from /teacher/set-password (Alfred's
 * call) — different moment, different copy, mechanically near-
 * identical otherwise.
 *
 * ROOT CAUSE, found by decoding a real token and reading
 * @supabase/ssr's actual source (not assumed): createBrowserClient
 * hardcodes `flowType: "pkce"` — unconditionally, not overridable via
 * the options object, since it's applied AFTER any auth options this
 * component passes in. PKCE expects a `?code=...` query param and a
 * locally-stored code_verifier from when the flow was initiated. But
 * supabase.auth.admin.generateLink() (used server-side to build the
 * invite/reset email) produces a CLASSIC IMPLICIT-FLOW link instead —
 * a `#access_token=...&refresh_token=...` fragment, no `code` param
 * at all. The two flows are simply incompatible: the client was
 * always going to see "no code param, nothing to do" and report
 * INITIAL_SESSION with session: null — not an error, not a race, not
 * an expired token. Confirmed directly: a decoded, unexpired,
 * correctly-issued JWT was sitting right there in the URL the whole
 * time; the client just wasn't looking for that shape of response.
 *
 * Fix: don't rely on detectSessionInUrl's automatic (PKCE-only)
 * handling at all. Parse the fragment ourselves and hand the tokens
 * straight to setSession() — this works with implicit-flow tokens
 * regardless of what flowType the client is configured for, since
 * setSession() just accepts a token pair directly rather than trying
 * to exchange a PKCE code for one.
 */
export default function ResetPasswordForm() {
  const router = useRouter();

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  );

  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || type !== "recovery") {
      console.error("reset-password: fragment missing expected recovery tokens", {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type,
      });
      setSessionError(true);
      setReady(true);
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (error || !data.session) {
          console.error("reset-password: setSession failed", error);
          setSessionError(true);
        } else {
          // Clean the token out of the URL now that it's been
          // consumed into a real session — leaving it in the address
          // bar is a needless exposure (browser history, screen
          // shares, etc.) once it's no longer needed there.
          window.history.replaceState(null, "", window.location.pathname);
        }
        setReady(true);
      });
  }, [supabase]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      // Don't discard this — logging the real cause is what actually
      // found the root bug here instead of guessing at "expired".
      console.error("resetPassword updateUser:", error.message, error);
      setError("Couldn't reset your password. Try requesting a new link from the login page.");
      return;
    }

    router.push("/teacher");
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="admin-login">
        <div className="af">
          <h2>Reset your password</h2>
          <p className="af-sub">Loading…</p>
        </div>
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="admin-login">
        <div className="af">
          <h2>This link isn&apos;t valid</h2>
          <p className="af-sub">
            This reset link has already been used or has expired. Request a
            new one from the login page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-login">
      <div className="af">
        <h2>Reset your password</h2>
        <p className="af-sub">Choose a new password for your teacher account.</p>

        <label className="af-field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <div style={{ height: 14 }} />

        <label className="af-field">
          <span>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        {error && <p className="af-submit-error">{error}</p>}

        <button className="af-submit" onClick={submit} disabled={busy}>
          {busy ? "Resetting…" : "Reset password & continue"}
        </button>
      </div>
    </main>
  );
}
