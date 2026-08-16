"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { requestTeacherInviteResend, requestTeacherPasswordReset } from "./actions";

type Mode = "signin" | "request-invite" | "request-reset";

/**
 * Mirrors AdminLoginForm.tsx for the sign-in mode — same client-side
 * signInWithPassword call, same deliberately-vague error, same
 * `denied=1` pattern picked up from the protected layout's redirect.
 *
 * Two additional modes, each a small "enter your email, get a generic
 * confirmation" form (EmailRequestForm below) — kept as ONE shared
 * component with different copy/action passed in, rather than two
 * near-identical blocks, since a third such flow is plausible later
 * and copy-pasting a second time would be the point to stop and share
 * it anyway.
 *
 * "Set your password" (request-invite) is for a teacher who was
 * invited but never finished — can't link straight to
 * /teacher/set-password since that page needs the short-lived session
 * Supabase's OWN invite link creates, not a cold visit.
 *
 * "Forgot password" (request-reset) is for a teacher who already has
 * a password and can't remember it — same shape, opposite gate
 * server-side (requestTeacherPasswordReset only fires for an
 * ALREADY-accepted teacher; requestTeacherInviteResend only fires for
 * one who hasn't accepted yet). Lands on the separate
 * /teacher/reset-password page, not /teacher/set-password — see that
 * page's own comment for why they're kept apart rather than shared.
 */
export default function TeacherLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied") === "1";
  const inactive = params.get("inactive") === "1";

  const [mode, setMode] = useState<Mode>("signin");

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

  if (mode === "request-invite") {
    return (
      <EmailRequestForm
        title="Set up your account"
        subtitle="Enter the email your invite was sent to and we'll send a fresh link to set your password."
        buttonLabel="Send invite link"
        busyLabel="Sending…"
        action={requestTeacherInviteResend}
        onBack={() => setMode("signin")}
      />
    );
  }

  if (mode === "request-reset") {
    return (
      <EmailRequestForm
        title="Forgot your password?"
        subtitle="Enter your email and we'll send a link to reset your password."
        buttonLabel="Send reset link"
        busyLabel="Sending…"
        action={requestTeacherPasswordReset}
        onBack={() => setMode("signin")}
      />
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

        <p className="af-sub" style={{ marginTop: 18, marginBottom: 4, textAlign: "center" }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setMode("request-reset"); }}>
            Forgot password?
          </a>
        </p>
        <p className="af-sub" style={{ marginTop: 0, marginBottom: 0, textAlign: "center" }}>
          Don&apos;t have an account yet?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode("request-invite"); }}>
            Set your password
          </a>
        </p>
      </div>
    </main>
  );
}

/**
 * Shared shape for both "request a link" flows — one email field, one
 * button, one generic success message regardless of whether the email
 * actually matched anything (see requestTeacherInviteResend's own
 * comment for why the vagueness is deliberate, not a gap).
 */
function EmailRequestForm({
  title,
  subtitle,
  buttonLabel,
  busyLabel,
  action,
  onBack,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  busyLabel: string;
  action: (email: string) => Promise<{ ok: true; message: string }>;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!email) return;
    setBusy(true);
    setMessage(null);

    const res = await action(email);
    setMessage(res.message);
    setBusy(false);
  }

  return (
    <main className="admin-login">
      <div className="af">
        <h2>{title}</h2>
        <p className="af-sub">{subtitle}</p>

        <label className="af-field">
          <span>Work email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        {message && (
          <p
            className="af-submit-error"
            style={{ background: "rgba(37,178,144,0.1)", color: "#1c9f7f" }}
          >
            {message}
          </p>
        )}

        <button className="af-submit" onClick={submit} disabled={busy}>
          {busy ? busyLabel : buttonLabel}
        </button>

        <p className="af-sub" style={{ marginTop: 18, marginBottom: 0 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
            Back to sign in
          </a>
        </p>
      </div>
    </main>
  );
}
