"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied") === "1";

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
      /* Deliberately vague — the same message whether the email is
         unknown or the password is wrong. Distinguishing them tells
         an attacker which admin emails exist. */
      setError("Those details didn't work.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="admin-login">
      <div className="af">
        <h2>KIT Admin</h2>
        <p className="af-sub">Sign in to manage applications and programmes.</p>

        {denied && (
          <div className="admin-warn">
            That account doesn&apos;t have admin access.
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
