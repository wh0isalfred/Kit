"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Where the invite link's redirectTo actually points, instead of
 * Supabase's own default reset-password UI — unstyled, generic, not
 * from kitacademy.net, the exact "off-brand" problem the invite EMAIL
 * was already fixed for (see actions.ts's sendTeacherInviteEmail).
 * This page is the other half of that same fix.
 *
 * Supabase's invite link signs the browser in via a short-lived
 * session before landing here (that's how generateLink's action_link
 * works) — updateUser({ password }) on that already-authenticated
 * session is what actually sets the real password. No token handling
 * needed in this component; Supabase's own client picks up the
 * session from the URL fragment automatically.
 */
export default function SetPasswordForm() {
  const router = useRouter();

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

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setError("Couldn't set your password. The link may have expired — ask an admin to resend your invite.");
      return;
    }

    router.push("/teacher");
    router.refresh();
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
