import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface HomeworkResource {
  id: string;
  week: number;
  title: string;
  kind: string;
  file_url: string | null;
  description: string | null;
}

interface Submission {
  id: string;
  student_id: string;
  resource_id: string;
  submission_type: "file" | "link" | null;
  submitted_at: string | null;
  file_url: string | null;
  link_url: string | null;
  feedback: string | null;
  status: "turned_in" | "returned" | "not_submitted" | null;
}

export default async function HomeworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get student session from cookie
  const cookieStore = await import("next/headers").then((m) =>
    m.cookies()
  );
  const sessionCookie = cookieStore.get("kit_summer");

  if (!sessionCookie) {
    return notFound();
  }

  // Fetch homework resource
  const { data: resources, error: resourcesError } = await supabase.rpc(
    "get_summer_resources",
    {
      p_cohort_year: new Date().getFullYear(),
      p_summer_student_id: sessionCookie.value, // This will be validated by RPC
    }
  );

  if (resourcesError) {
    console.error("Error fetching resources:", resourcesError);
    return notFound();
  }

  // Find the homework item
  const item = (resources as HomeworkResource[] | null)?.find(
    (r: HomeworkResource) => r.id === id && r.kind === "homework"
  );

  if (!item) {
    return notFound();
  }

  // Fetch student's submission for this homework
  const { data: submission } = await supabase.rpc("get_my_submission", {
    p_resource_id: id,
  });

  return (
    <div className="page">
      <section className="homework-hero">
        <div className="wrap">
          <Link href="/smportal" className="back-link">
            ← Back to Portal
          </Link>

          <div className="homework-header">
            <div className="homework-meta">
              <span className="homework-week">Week {item.week}</span>
              <span className="homework-type">Assignment</span>
            </div>

            <h1 className="homework-title">{item.title}</h1>

            {item.description && (
              <p className="homework-description">{item.description}</p>
            )}
          </div>
        </div>
      </section>

      <section className="homework-content">
        <div className="wrap homework-wrap">
          <div className="homework-main">
            {/* Instructions/Content */}
            {item.file_url && (
              <div className="homework-instructions">
                <h2>Assignment Details</h2>
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="homework-file-link"
                >
                  📥 Download Assignment Files
                </a>
              </div>
            )}

            {/* Submission Status */}
            <div className="homework-status">
              <h2>Your Submission</h2>

              {submission ? (
                <div
                  className={`status-card status-${submission.status || "not_submitted"}`}
                >
                  <div className="status-header">
                    <span className="status-badge">
                      {submission.status === "turned_in"
                        ? "Turned In"
                        : submission.status === "returned"
                          ? "Returned with Feedback"
                          : "Not Submitted"}
                    </span>
                    {submission.submitted_at && (
                      <time className="submitted-time">
                        {new Date(submission.submitted_at).toLocaleDateString(
                          "en-NG"
                        )}
                      </time>
                    )}
                  </div>

                  {/* Show submission content */}
                  {submission.file_url && (
                    <div className="submission-file">
                      <a
                        href={submission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-download"
                      >
                        📄 View Your Submission
                      </a>
                    </div>
                  )}

                  {submission.link_url && (
                    <div className="submission-link">
                      <a
                        href={submission.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-open"
                      >
                        🔗 {submission.link_url}
                      </a>
                    </div>
                  )}

                  {/* Feedback from teacher */}
                  {submission.feedback && (
                    <div className="teacher-feedback">
                      <h3>Teacher Feedback</h3>
                      <div className="feedback-box">
                        <p>{submission.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="status-card status-not_submitted">
                  <p className="no-submission">
                    You haven't submitted this assignment yet.
                  </p>
                  <a href={`/smportal/homework/${id}/submit`} className="btn btn-primary">
                    Submit Assignment
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Due date, etc */}
          <aside className="homework-sidebar">
            <div className="sidebar-card">
              <h3>Assignment Info</h3>
              <div className="info-item">
                <label>Week</label>
                <span>{item.week}</span>
              </div>
              <div className="info-item">
                <label>Status</label>
                <span
                  className={`status-dot status-${submission?.status || "not_submitted"}`}
                >
                  {submission?.status === "turned_in"
                    ? "Submitted"
                    : submission?.status === "returned"
                      ? "Reviewed"
                      : "Not Started"}
                </span>
              </div>
            </div>

            {!submission && (
              <div className="sidebar-card highlight">
                <h3>Ready to Submit?</h3>
                <p>Upload your work or share a link to your project.</p>
                <a href={`/smportal/homework/${id}/submit`} className="btn btn-secondary">
                  Start Submission
                </a>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
