"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const QUICK_ACTIONS = [
  { href: "/enrollment-requests", label: "Enrollment Requests", icon: "👥" },
  { href: "/students", label: "Students", icon: "🧑‍🎓" },
  { href: "/questions", label: "Question Entry", icon: "📄" },
  { href: "/exam-management", label: "Exam Management", icon: "📝" },
  { href: "/videos", label: "QAD Videos", icon: "🎬" },
  { href: "/courses", label: "Courses", icon: "🎓" },
];

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const isTopTier = user && (user.is_superuser || !user.admin_role || user.admin_role === "super_admin");
  const canViewDashboard = !user || isTopTier || user.permissions?.includes("dashboard");

  useEffect(() => {
    if (user && !canViewDashboard) {
      router.replace("/questions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!canViewDashboard) return;
    api
      .get("/dashboard-stats/")
      .then(setStats)
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewDashboard]);

  if (user && !canViewDashboard) return null;

  const cards = [
    { label: "Students Registered", value: stats?.students_registered, icon: "🎓", tint: "bg-blue-50" },
    { label: "Total Courses", value: stats?.total_courses, icon: "🗂️", tint: "bg-purple-50" },
    { label: "Course Enrollments", value: stats?.course_enrollments, icon: "👥", tint: "bg-green-50" },
    { label: "Package Enrollments", value: stats?.package_enrollments, icon: "📦", tint: "bg-amber-50" },
    { label: "Live Daily Exams Now", value: stats?.live_daily_exams_now, icon: "🏆", tint: "bg-orange-50" },
    { label: "Active Mock Tests", value: stats?.active_mock_tests, icon: "🎁", tint: "bg-pink-50" },
    { label: "Total Questions", value: stats?.total_questions, icon: "📄", tint: "bg-red-50" },
  ];

  const maxCount = Math.max(1, ...(stats?.questions_by_course || []).map((q) => q.count));

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Overview of platform activity.</p>
      {error && <p className="mt-3 text-xs font-medium text-brand-red">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="hm-card p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${c.tint}`}>{c.icon}</span>
            <p className="mt-3 text-2xl font-extrabold text-[var(--color-text)]">{c.value ?? "…"}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="hm-card p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> LIVE RIGHT NOW
          </p>
          <div className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            {stats?.live_right_now?.length ? (
              <ul className="flex flex-col gap-2 text-left">
                {stats.live_right_now.map((l, i) => (
                  <li key={i}>
                    {l.course} — {l.label} ({l.exam_date})
                  </li>
                ))}
              </ul>
            ) : (
              "Nothing running right now."
            )}
          </div>
        </div>

        <div className="hm-card p-5">
          <p className="text-sm font-bold text-[var(--color-text)]">QUESTIONS BY COURSE</p>
          <div className="mt-3 flex flex-col gap-3">
            {(stats?.questions_by_course || []).map((q) => (
              <div key={q.course}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text)]">{q.course}</span>
                  <span className="font-semibold text-[var(--color-text)]">{q.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-full rounded-full bg-brand-blue"
                    style={{ width: `${(q.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">✨ QUICK ACTIONS</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className="hm-card flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-lg">
                {a.icon}
              </span>
              <span className="text-sm font-semibold text-[var(--color-text)]">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireStaff feature="dashboard">
      <Shell>
        <DashboardContent />
      </Shell>
    </RequireStaff>
  );
}
