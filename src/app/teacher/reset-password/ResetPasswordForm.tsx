"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Deliberately a SEPARATE page from /teacher/set-password (Alfred's
 * call) — different moment, different copy, mechanically near-
 * identical otherwise.
 *
 * IMPORTANT — real bug found and fixed here: the client MUST be
 * created ONCE on mount, not lazily inside submit() at click-time.
 * Supabase's recovery/invite links deliver the session as a URL
 * FRAGMENT (#access_token=...&type=recovery), which only exists in
 * the browser and is only parsed into a real session when a Supabase
 * client with detectSessionInUrl initializes WHILE that fragment is
 * present. Creating the client inside the button handler meant this
 * page never actually established a session — updateUser() was
 * silently running against an anonymous client the whole time. That's
 * why the earlier version showed a generic error with NOTHING in the
 * console: there was no exception, just an auth call with no session
 * behind it. Confirmed directly — localStorage had no sb- key present
 * on this page, meaning the fragment was never consumed at all.
 */
export default function ResetPasswordForm() {
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
    // TEMPORARY diagnostic — remove once this is confirmed working.
    // Logs exactly what's present at mount time, since everything
    // upstream (link, redirect, fragment, env vars) has already been
    // individually confirmed correct and the failure is narrowed down
    // to this client-side step specifically.
    console.log("reset-password mount: location.hash present?", !!window.location.hash);
    console.log("reset-password mount: hash length", window.location.hash.length);

    // Belt-and-suspenders: onAuthStateChange fires when the client's
    // internal fragment processing completes, INCLUDING a possible
    // PASSWORD_RECOVERY event specifically for recovery links — this
    // does not race the same way a bare getSession() call immediately
    // after construction theoretically could, since it's a subscription
    // that fires whenever the session state actually changes, not a
    // one-shot read of whatever's in memory right now.
    let sessionFoundViaListener = false;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("reset-password onAuthStateChange:", event, "session present?", !!session);
      if (session) {
        sessionFoundViaListener = true;
        setReady(true);
        setSessionError(false);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      console.log("reset-password getSession result:", { hasSession: !!data.session, error: error?.message });
      // Don't let a failed getSession() overwrite a session the
      // listener above already found — getSession() is a one-shot
      // read that could run before internal fragment processing
      // finishes, while onAuthStateChange fires exactly when it does.
      if (sessionFoundViaListener) return;

      if (error || !data.session) {
        console.error("reset-password: no session from recovery link", error);
        setSessionError(true);
      }
      setReady(true);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
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
      // Don't discard this — logging the real cause is what let us
      // actually find this bug instead of guessing at "expired" a
      // third time. Keep this console.error even after the fragment
      // fix, for the next thing that goes wrong here.
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
