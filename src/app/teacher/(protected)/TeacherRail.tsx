"use client";

import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Sign-out is a client-side supabase.auth.signOut() call — same
 * mechanism as admin's rail, since it's the same Supabase Auth
 * session either way, just a different post-logout redirect target
 * (/teacher/login instead of /admin/login).
 */
export default function TeacherRail({
  name,
  roleTitle,
}: {
  name: string;
  roleTitle: string | null;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    await supabase.auth.signOut();
    router.push("/teacher/login");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="teacher-rail">
      <div className="admin-rail-brand">
        <span className="admin-rail-mark">KIT</span>
        <span className="admin-rail-sub">Teacher</span>
      </div>

      <div className="admin-rail-nav">
        <div className="admin-rail-group">
          <a className="admin-rail-link on" href="/teacher">
            <span>My batches</span>
          </a>
        </div>
      </div>

      <div className="admin-rail-foot">
        <div className="admin-rail-who">
          <div className="admin-rail-avatar">{initials || "T"}</div>
          <div className="admin-rail-who-text">
            <strong>{name}</strong>
            {roleTitle && <em>{roleTitle}</em>}
          </div>
        </div>
        <button className="admin-rail-signout" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
