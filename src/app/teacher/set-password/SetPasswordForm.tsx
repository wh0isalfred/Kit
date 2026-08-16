"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Where the invite link's redirectTo actually points, instead of
 * Supabase's own default UI.
 *
 * ROOT CAUSE (found via ResetPasswordForm.tsx hitting the identical
 * bug first — see that file's own comment for the full trace):
 * @supabase/ssr's createBrowserClient hardcodes `flowType: "pkce"`,
 * not overridable through options. But generateLink() (used
 * server-side for both invite and recovery emails) produces classic
 * IMPLICIT-flow links — a `#access_token=...` fragment, no `code`
 * param. PKCE-configured detectSessionInUrl was never going to
 * recognize that shape of response; it wasn't a race, an expired
 * token, or a dropped fragment — it was looking for something that
 * link format doesn't produce. Fixed by parsing the fragment
 * ourselves and calling setSession() directly, which accepts a token
 * pair regardless of the client's configured flowType.
 */
export default function SetPasswordForm() {
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

    if (!accessToken || !refreshToken || type !== "invite") {
      console.error("set-password: fragment missing expected invite tokens", {
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
          console.error("set-password: setSession failed", error);
          setSessionError(true);
        } else {
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
      console.error("setPassword updateUser:", error.message, error);
      setError("Couldn't set your password. Ask an admin to resend your invite, or try requesting a fresh link from the login page.");
      return;
    }

    router.push("/teacher");
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="admin-login">
        <div className="af">
          <h2>Welcome to KIT</h2>
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
            This invite link has already been used or has expired. Ask an
            admin to resend it, or request a fresh one from the login page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-login">
      <div className="af">
        <h2>Welcome to KIT</h2>
        <p className="af-sub">Set a password to get into your teacher account.</p>

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
          {busy ? "Setting password…" : "Set password & continue"}
        </button>
      </div>
    </main>
  );
}
