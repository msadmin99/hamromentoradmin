"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/", label: "Dashboard", icon: "📊", feature: "dashboard" }],
  },
  {
    label: "Academic Content",
    items: [
      { href: "/courses", label: "Courses", icon: "🎓", feature: "courses" },
      { href: "/subjects", label: "Subjects", icon: "📘", feature: "question_bank" },
      { href: "/questions", label: "Question Entry", icon: "📄", feature: "question_entry" },
      { href: "/question-bank-summary", label: "Question Bank Summary", icon: "🗂️", feature: "question_bank" },
      { href: "/videos", label: "Video Lectures", icon: "🎥", feature: "video_lectures" },
    ],
  },
  {
    label: "Student Management",
    items: [
      { href: "/students", label: "Students", icon: "🧑‍🎓", feature: "students" },
      { href: "/enrollment-requests", label: "Enrollment Requests", icon: "👥", feature: "enrollment_requests" },
      { href: "/scholarships", label: "Scholarships", icon: "🎓", feature: "students" },
    ],
  },
  {
    label: "Exams",
    items: [{ href: "/exam-management", label: "Exam Management", icon: "📝", feature: "test_series" }],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/teacher-applications", label: "Teacher Applications", icon: "🧑‍🏫", feature: "teacher_applications" },
      { href: "/marketplace-courses", label: "Marketplace Courses", icon: "🛍️", feature: "marketplace_courses" },
    ],
  },
  {
    label: "Monetization",
    items: [
      { href: "/plans", label: "Subscription Plans", icon: "💳", feature: "billing" },
      { href: "/payment-methods", label: "Payment Methods", icon: "🏦", feature: "billing" },
      { href: "/promo-codes", label: "Promo Codes", icon: "🏷️", feature: "billing" },
      { href: "/payments", label: "Payments", icon: "💰", feature: "billing" },
      { href: "/analytics", label: "Analytics", icon: "📈", feature: "billing" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/accounts", label: "Accounts", icon: "🛡️", feature: null, superAdminOnly: true },
      { href: "/settings", label: "Settings", icon: "⚙️", feature: null, alwaysVisible: true },
      { href: "/website", label: "Website Settings", icon: "🌐", feature: "website_settings" },
      { href: "/advanced", label: "Advanced", icon: "🔌", feature: "advanced" },
    ],
  },
];

const ROLE_LABELS = { super_admin: "Super Admin", admin: "Admin", editor: "Editor", teacher: "Teacher" };

function isVisible(item, user) {
  if (!user) return false;
  const isTopTier = user.is_superuser || !user.admin_role || user.admin_role === "super_admin";
  if (isTopTier) return true;
  if (item.superAdminOnly) return false;
  if (item.alwaysVisible) return true;
  return (user.permissions || []).includes(item.feature);
}

export default function Shell({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const roleLabel = ROLE_LABELS[user?.admin_role] || (user?.is_superuser ? "Super Admin" : "Admin");
  const displayName = user?.first_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-none flex-col overflow-y-auto border-r border-[var(--color-border)] bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <Image src="/logo.png" alt="Dr. Gutka" width={28} height={28} className="rounded-full" />
          <span className="text-sm font-extrabold text-[var(--color-text)]">
            Dr. <span className="text-brand-red">Gutka</span>
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-4 px-3 pb-4">
          {NAV_GROUPS.map((group, gi) => {
            const visibleItems = group.items.filter((item) => isVisible(item, user));
            if (visibleItems.length === 0) return null;
            return (
              <div key={gi}>
                {group.label && (
                  <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {group.label}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-brand-blue/10 text-brand-blue"
                            : "text-[var(--color-text)]/80 hover:bg-[var(--color-surface-muted)]"
                        }`}
                      >
                        <span className="text-base leading-none">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex items-center gap-2 text-xs font-semibold text-brand-red"
          >
            ⏻ Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-3">
          <p className="text-sm text-[var(--color-text-muted)]">{today}</p>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                {displayName}
                <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
                  {roleLabel}
                </span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{user?.email}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[var(--color-surface-muted)]">{children}</main>
      </div>
    </div>
  );
}
