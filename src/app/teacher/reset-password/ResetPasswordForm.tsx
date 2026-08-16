"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Deliberately a SEPARATE page from /teacher/set-password, not a
 * shared "set a password" form used by both flows — Alfred's call.
 * The two are different moments (first-time onboarding vs. recovering
 * an existing account) and the copy doesn't fit both ("Welcome to
 * KIT" is wrong for a reset; "Reset your password" is wrong for a
 * first invite). Mechanically near-identical to SetPasswordForm.tsx
 * (same updateUser({ password }) call against the short-lived session
 * Supabase's recovery link creates) — the duplication is the two
 * headlines and subtitles, not meaningful logic.
 */
export default function ResetPasswordForm() {
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
      setError("Couldn't reset your password. The link may have expired — request a new one from the login page.");
      return;
    }

    router.push("/teacher");
    router.refresh();
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
