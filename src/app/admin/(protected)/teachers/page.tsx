import { createClient } from "@/lib/supabase/server";
import TeachersView from "./TeachersView";
import { getTeachers } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Real teacher management, replacing the deliberate stub described in
 * structure.txt ("teachers table is empty; summer instructor names
 * are free text"). Data fetch stays thin — getTeachers() already
 * bundles the batch-count join, same "one call, not N" discipline as
 * getBatchOverview in batch-actions.ts.
 */
export default async function TeachersPage() {
  const result = await getTeachers();

  if (!result.ok) {
    return (
      <>
        <header className="admin-head">
          <h1>Teachers</h1>
        </header>
        <p className="af-submit-error">Couldn't load teachers: {result.error}</p>
      </>
    );
  }

  return <TeachersView teachers={result.teachers} />;
}
