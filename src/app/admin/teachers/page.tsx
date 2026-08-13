export const dynamic = "force-dynamic";

/**
 * /admin/teachers — stub.
 *
 * The `teachers` table exists but is empty, and summer instructor
 * names are free text on summer_batch_sessions rather than real
 * teacher records. Building a management UI for zero rows would be
 * scaffolding for a programme that hasn't started. This exists so the
 * nav link doesn't 404; replace it when there's a real teaching
 * structure to manage.
 */
export default function TeachersPage() {
  return (
    <>
      <header className="admin-head">
        <div>
          <h1>Teachers</h1>
          <p>Teacher accounts and batch assignments.</p>
        </div>
      </header>

      <div className="admin-empty admin-empty-hero">
        <h2>Not set up yet</h2>
        <p>
          Teacher records come with the 12-week programme. For summer, the
          instructor&apos;s name is set per batch on each batch&apos;s Class tab —
          no teacher account is needed.
        </p>
        <a className="af-submit admin-inline-btn" href="/admin/summer">
          Go to Summer admin
        </a>
      </div>
    </>
  );
}