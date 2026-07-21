import { Suspense } from "react";
import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  /* useSearchParams() in the form triggers a client-side bailout,
     which Next cannot prerender without a Suspense boundary. The
     fallback is the same card shell so there's no layout jump. */
  return (
    <Suspense
      fallback={
        <main className="admin-login">
          <div className="af">
            <h2>KIT Admin</h2>
            <p className="af-sub">Loading…</p>
          </div>
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}