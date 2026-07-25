"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enterSummerId } from "./summer-session";

export default function SummerSignIn() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!id.trim()) return;
    setBusy(true);
    setError(null);

    const res = await enterSummerId(id);

    if (res.ok) {
      router.push("/smportal");
      router.refresh();
      return;
    }

    setBusy(false);
    if (res.reason === "rate_limited") {
      const mins = res.retryAfter ? Math.ceil(res.retryAfter / 60) : null;
      setError(
        mins
          ? `Too many tries. Wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`
          : "Too many tries. Wait a few minutes and try again."
      );
    } else {
      /* Deliberately one message for both "no such ID" and other
         failures — the gate itself gives no hint about why an ID is
         wrong, so neither does this. */
      setError("That ID didn't work. Check it and try again.");
    }
  }

  return (
    <div className="sm-signin">
      <h2>Already enrolled?</h2>
      <p>Enter the Summer ID we sent you to reach your classroom.</p>

      <label className="af-field">
        <span>Summer ID</span>
        <input
          value={id}
          onChange={(e) => setId(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="SM26123"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {error && <p className="af-submit-error">{error}</p>}

      <button className="af-submit" onClick={submit} disabled={busy}>
        {busy ? "Checking…" : "Enter classroom"}
      </button>

      <p className="sm-signin-help">
        Lost your ID? Ask a parent to check the enrolment message, or contact
        us at kitph@gmail.com.
      </p>
    </div>
  );
}
