"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const FEATURE_ROUTES = {
  dashboard: "/",
  question_bank: "/subjects",
  question_entry: "/questions",
  video_lectures: "/videos",
  test_series: "/exam-management",
  daily_live_exam: "/exam-management",
  mock_test: "/exam-management",
  daily_practice: "/exam-management",
  students: "/students",
  enrollment_requests: "/enrollment-requests",
  question_reports: "/question-reports",
  billing: "/promo-codes",
  courses: "/courses",
  website_settings: "/website",
  advanced: "/advanced",
};

function landingRouteFor(user) {
  const isTopTier = user.is_superuser || !user.admin_role || user.admin_role === "super_admin";
  if (isTopTier || user.permissions?.includes("dashboard")) return "/";
  for (const feature of user.permissions || []) {
    if (FEATURE_ROUTES[feature]) return FEATURE_ROUTES[feature];
  }
  return "/settings";
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      router.push(landingRouteFor(user));
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm hm-card p-8">
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo.png" alt="Dr. Gutka" width={48} height={48} className="rounded-full" />
          <h1 className="text-lg font-extrabold text-[var(--color-text)]">
            Dr. <span className="text-brand-red">Gutka</span> Admin
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Email</label>
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@hamromentor.com"
              className="hm-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="hm-input"
            />
          </div>

          {error && <p className="rounded-lg bg-brand-red-light px-3 py-2 text-xs font-medium text-brand-red">{error}</p>}

          <button type="submit" disabled={submitting} className="hm-btn-primary mt-2">
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-5 rounded-lg bg-[var(--color-surface-muted)] p-3 text-center text-[11px] text-[var(--color-text-muted)]">
          Demo admin: admin@hamromentor.com / Admin@12345
        </p>
      </div>
    </div>
  );
}
