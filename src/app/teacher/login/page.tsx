import { Suspense } from "react";
import TeacherLoginForm from "./TeacherLoginForm";

/**
 * Mirrors admin/login/page.tsx exactly — useSearchParams() in the form
 * forces a client-side bailout Next can't prerender without a Suspense
 * boundary. Same fallback shape as the real card so there's no layout
 * jump when the form mounts.
 */
export default function TeacherLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="admin-login">
          <div className="af">
            <h2>KIT Teacher</h2>
            <p className="af-sub">Loading…</p>
          </div>
        </main>
      }
    >
      <TeacherLoginForm />
    </Suspense>
  );
}
