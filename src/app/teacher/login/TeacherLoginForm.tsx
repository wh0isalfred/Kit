"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { requestTeacherInviteResend } from "./actions";

/**
 * Mirrors AdminLoginForm.tsx exactly for the sign-in half — same
 * client-side signInWithPassword call (not a Server Action; the
 * session cookie needs to be set in the browser directly), same
 * deliberately-vague error, same `denied=1` pattern for "signed in
 * but wrong role," picked up from the protected layout's redirect
 * rather than checked here.
 *
 * Added: a "don't have an account yet?" toggle to a second small
 * form, for a teacher who was invited but never finished setting a
 * password (lost the email, session expired, whatever). This can't
 * link straight to /teacher/set-password — that page only works with
 * the short-lived session Supabase's OWN invite link creates; landing
 * there cold has no session for updateUser() to act on. So instead
 * this requests a FRESH invite email via requestTeacherInviteResend,
 * which is deliberately unauthenticated and deliberately vague in its
 * response (see that action's own comment) for the same reason the
 * sign-in error above is vague.
 */
export default function TeacherLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied") === "1";
  const inactive = params.get("inactive") === "1";

  const [mode, setMode] = useState<"signin" | "request">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [requestEmail, setRequestEmail] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

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

  async function requestInvite() {
    if (!requestEmail) return;
    setRequestBusy(true);
    setRequestMessage(null);

    const res = await requestTeacherInviteResend(requestEmail);
    setRequestMessage(res.message);
    setRequestBusy(false);
  }

  if (mode === "request") {
    return (
      <main className="admin-login">
        <div className="af">
          <h2>Set up your account</h2>
          <p className="af-sub">
            Enter the email your invite was sent to and we&apos;ll send a
            fresh link to set your password.
          </p>

          <label className="af-field">
            <span>Work email</span>
            <input
              type="email"
              autoComplete="username"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && requestInvite()}
            />
          </label>

          {requestMessage && <p className="af-submit-error" style={{ background: "rgba(37,178,144,0.1)", color: "#1c9f7f" }}>{requestMessage}</p>}

          <button className="af-submit" onClick={requestInvite} disabled={requestBusy}>
            {requestBusy ? "Sending…" : "Send invite link"}
          </button>

          <p className="af-sub" style={{ marginTop: 18, marginBottom: 0 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); setRequestMessage(null); }}>
              Back to sign in
            </a>
          </p>
        </div>
      </main>
    );
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

        <p className="af-sub" style={{ marginTop: 18, marginBottom: 0, textAlign: "center" }}>
          Don&apos;t have an account yet?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode("request"); }}>
            Set your password
          </a>
        </p>
      </div>
    </main>
  );
}
