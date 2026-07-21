"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Item = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
};

type Group = { heading?: string; items: Item[] };

type IconName =
  | "dashboard"
  | "applications"
  | "students"
  | "summer"
  | "courses"
  | "batches"
  | "teachers"
  | "payments"
  | "classes"
  | "audit";

export default function AdminRail({
  name,
  email,
  pendingApplications,
}: {
  name: string;
  email: string;
  pendingApplications: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  /* Ten items, every one backed by a real table. The mockup's
     Messages / Emails / Integrations / Users & Roles are omitted
     deliberately — nothing exists behind them. */
  const groups: Group[] = [
    { items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }] },
    {
      heading: "Admissions",
      items: [
        {
          href: "/admin/applications",
          label: "Applications",
          icon: "applications",
          badge: pendingApplications || undefined,
        },
        { href: "/admin/students", label: "Students", icon: "students" },
      ],
    },
    {
      heading: "Programmes",
      items: [
        { href: "/admin/summer", label: "Summer", icon: "summer" },
        { href: "/admin/courses", label: "Courses", icon: "courses" },
        { href: "/admin/batches", label: "Batches", icon: "batches" },
        { href: "/admin/teachers", label: "Teachers", icon: "teachers" },
      ],
    },
    {
      heading: "Operations",
      items: [
        { href: "/admin/payments", label: "Payments", icon: "payments" },
        { href: "/admin/classes", label: "Classes", icon: "classes" },
      ],
    },
    {
      heading: "System",
      items: [{ href: "/admin/audit", label: "Audit log", icon: "audit" }],
    },
  ];

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      <button
        className="admin-rail-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <aside className={`admin-rail ${open ? "open" : ""}`}>
        <div className="admin-rail-brand">
          <span className="admin-rail-mark">KIT</span>
          <span className="admin-rail-sub">Admin</span>
        </div>

        <nav className="admin-rail-nav">
          {groups.map((g, i) => (
            <div className="admin-rail-group" key={g.heading ?? i}>
              {g.heading && <p className="admin-rail-heading">{g.heading}</p>}
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-rail-link ${isActive(item.href) ? "on" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <RailIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <em className="admin-rail-badge">{item.badge}</em>
                  ) : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-rail-foot">
          <div className="admin-rail-who">
            <span className="admin-rail-avatar">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="admin-rail-who-text">
              <strong>{name}</strong>
              <em>{email}</em>
            </div>
          </div>
          <button className="admin-rail-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      {open && <div className="admin-rail-scrim" onClick={() => setOpen(false)} />}
    </>
  );
}

function RailIcon({ name }: { name: IconName }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...c}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "applications":
      return (
        <svg {...c}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 3h6v3H9z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "students":
      return (
        <svg {...c}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
          <path d="M16 4.6a3.2 3.2 0 010 6M22 20c0-2.4-1.6-4.3-4-4.8" />
        </svg>
      );
    case "summer":
      return (
        <svg {...c}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
        </svg>
      );
    case "courses":
      return (
        <svg {...c}>
          <path d="M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5z" />
          <path d="M4 20.5A2.5 2.5 0 016.5 18H19v3H6.5" />
        </svg>
      );
    case "batches":
      return (
        <svg {...c}>
          <rect x="3" y="4" width="8" height="7" rx="1.5" />
          <rect x="13" y="4" width="8" height="7" rx="1.5" />
          <rect x="3" y="13" width="8" height="7" rx="1.5" />
          <rect x="13" y="13" width="8" height="7" rx="1.5" />
        </svg>
      );
    case "teachers":
      return (
        <svg {...c}>
          <circle cx="12" cy="7" r="3.4" />
          <path d="M5 21c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" />
        </svg>
      );
    case "payments":
      return (
        <svg {...c}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
          <path d="M2.5 10h19" />
          <path d="M6 14.5h3" />
        </svg>
      );
    case "classes":
      return (
        <svg {...c}>
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M4 9.5h16M8 3v4M16 3v4" />
        </svg>
      );
    case "audit":
      return (
        <svg {...c}>
          <path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      );
  }
}
