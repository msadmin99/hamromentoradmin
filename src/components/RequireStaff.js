"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

function isTopTier(user) {
  return user.is_superuser || !user.admin_role || user.admin_role === "super_admin";
}

export default function RequireStaff({ children, feature, superAdminOnly = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-text-muted)]">Loading admin panel...</div>;
  }

  if (!user) return null;

  if (!user.is_staff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-bold text-[var(--color-text)]">Access denied</p>
        <p className="text-sm text-[var(--color-text-muted)]">This account doesn&apos;t have admin panel access.</p>
      </div>
    );
  }

  const topTier = isTopTier(user);
  const allowed = topTier || (superAdminOnly ? false : !feature || (user.permissions || []).includes(feature));

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-bold text-[var(--color-text)]">Access denied</p>
        <p className="text-sm text-[var(--color-text-muted)]">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
