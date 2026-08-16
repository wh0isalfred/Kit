"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Where the invite link's redirectTo actually points, instead of
 * Supabase's own default UI.
 *
 * CORRECTION: an earlier version of this comment claimed "no token
 * handling needed... Supabase's own client picks up the session from
 * the URL fragment automatically." That was wrong. detectSessionInUrl
 * has to be explicitly enabled, AND the client has to be created on
 * MOUNT — not lazily inside submit() at click-time, which is what
 * this file originally did. Found via the reset-password page hitting
 * the identical bug: no session ever got established, updateUser()
 * silently ran against an anonymous client, and the failure showed no
 * console error at all because there was no exception — just an auth
 * call with nothing behind it. Confirmed by checking localStorage for
 * a missing sb- key on page load. Applying the same fix here.
 */
export default function SetPasswordForm() {
  const router = useRouter();

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
        },
      }
    )
  );

  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        console.error("set-password: no session from invite link", error);
        setSessionError(true);
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
