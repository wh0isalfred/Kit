import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminRail from "./AdminRail";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // NOTE: profiles PK is user_id, not id.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/admin/login?denied=1");

  /* Counts for the rail badges. Cheap head-only queries — we want the
     number, not the rows. A null count renders as no badge rather
     than a zero, since "0 pending" is noise on a nav item. */
  const { count: pendingCount } = await supabase
    .from("admin_application_queue")
    .select("id", { count: "exact", head: true });

  return (
    <div className="admin-shell">
      <AdminRail
        name={profile.full_name ?? "Admin"}
        email={user.email ?? ""}
        pendingApplications={pendingCount ?? 0}
      />
      <main className="admin-main">{children}</main>
    </div>
  );
}
