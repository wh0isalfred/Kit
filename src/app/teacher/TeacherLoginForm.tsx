"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Mirrors AdminLoginForm.tsx exactly — same client-side signInWithPassword
 * call (not a Server Action; the session cookie needs to be set in the
 * browser directly), same deliberately-vague error (doesn't distinguish
 * "unknown email" from "wrong password" — that distinction tells an
 * attacker which teacher emails exist), same `denied=1` pattern for
 * "signed in but wrong role," picked up from the protected layout's
 * redirect rather than checked here.
 */
export default function TeacherLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied") === "1";
  const inactive = params.get("inactive") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      setError("Those details didn't work.");
      return;
    }

    router.push("/teacher");
    router.refresh();
  }

  return (
    <main className="admin-login">
      <div className="af">
        <h2>KIT Teacher</h2>
        <p className="af-sub">Sign in to see your batches.</p>

        {denied && (
          <div className="admin-warn">
            That account doesn&apos;t have teacher access.
          </div>
        )}
        {inactive && (
          <div className="admin-warn">
            Your teacher account is currently inactive. Contact an admin.
          </div>
        )}

        <label className="af-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <div style={{ height: 14 }} />

        <label className="af-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && signIn()}
          />
        </label>

        {error && <p className="af-submit-error">{error}</p>}

        <button className="af-submit" onClick={signIn} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </main>
  );
}
