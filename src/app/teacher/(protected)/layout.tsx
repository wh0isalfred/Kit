import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherRail from "./TeacherRail";

/**
 * Same posture as every actions.ts's assertAdmin() comment: this
 * layout gate is a UX convenience, not the real security boundary.
 * RLS (0038/0039) is what actually stops a non-teacher or an inactive
 * teacher from reading anything — is_teacher_for_batch() checks
 * teachers.active itself, so even if this layout were bypassed
 * entirely, a deactivated teacher's queries return zero rows, not
 * real data. This exists so the failure is a clear redirect with a
 * specific reason, not a page that quietly renders empty.
 *
 * Three distinct outcomes, three distinct redirects — deliberately
 * not collapsed into one generic "access denied", because "you're not
 * a teacher" and "you WERE a teacher but got deactivated" are
 * different situations a person should be told apart (see the
 * inactive=1 case in TeacherLoginForm.tsx).
 */
export default async function TeacherProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/teacher/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "teacher") {
    redirect("/teacher/login?denied=1");
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, name, role_title, active")
    .eq("user_id", user.id)
    .single();

  if (!teacher || !teacher.active) {
    redirect("/teacher/login?inactive=1");
  }

  return (
    <div className="teacher-shell">
      <TeacherRail name={teacher.name} roleTitle={teacher.role_title} />
      <main className="teacher-main">{children}</main>
    </div>
  );
}
