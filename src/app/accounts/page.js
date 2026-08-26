"use client";

import { useEffect, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const FEATURE_LABELS = {
  dashboard: "Dashboard",
  courses: "Courses",
  question_bank: "Question Bank",
  video_lectures: "Video Lectures",
  daily_practice: "Daily Practice",
  students: "Students",
  test_series: "Test Series",
  self_mock_test: "Self Mock Test",
  enrollment_requests: "Enrollment Requests",
  question_reports: "Question Reports",
  daily_live_exam: "Daily Live Exam",
  mock_test: "Mock Test",
  website_settings: "Website Settings",
  advanced: "Advanced",
  teacher_applications: "Teacher Applications",
  marketplace_courses: "Marketplace Courses",
};

const ADMIN_FEATURES = Object.keys(FEATURE_LABELS);
const EDITOR_FEATURES = [
  "question_bank", "video_lectures", "test_series", "daily_live_exam", "self_mock_test", "mock_test", "question_reports",
];

function emptyForm() {
  return { name: "", email: "", password: "", admin_role: "editor" };
}

function RolePermissionCard({ role, title, description, availableFeatures, permissions, onSave }) {
  const record = permissions.find((p) => p.role === role);
  const [features, setFeatures] = useState(record?.features || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFeatures(record?.features || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  function toggle(key) {
    setFeatures((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]));
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(role, record, features);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hm-card p-5">
      <p className="font-bold text-[var(--color-text)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {availableFeatures.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={features.includes(key)} onChange={() => toggle(key)} />
            {FEATURE_LABELS[key]}
          </label>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="hm-btn-primary mt-4">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function AccountsContent() {
  const { user: currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    api.get("/auth/admin-accounts/").then(setAccounts);
    api.get("/auth/role-permissions/").then(setPermissions);
  }

  useEffect(load, []);

  async function createAccount(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/auth/admin-accounts/", form);
      setShowForm(false);
      setForm(emptyForm());
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(account, role) {
    await api.patch(`/auth/admin-accounts/${account.id}/`, { admin_role: role });
    load();
  }

  async function toggleActive(account) {
    await api.patch(`/auth/admin-accounts/${account.id}/`, { is_active: !account.is_active });
    load();
  }

  async function toggleContentScope(account) {
    await api.patch(`/auth/admin-accounts/${account.id}/`, { can_manage_all_content: !account.can_manage_all_content });
    load();
  }

  function deleteAccount(account) {
    setDeleteTarget(account);
  }

  async function runDeleteAccount(id) {
    await api.del(`/auth/admin-accounts/${id}/`);
    load();
  }

  async function savePermissions(role, record, features) {
    if (record) {
      await api.patch(`/auth/role-permissions/${record.id}/`, { features });
    } else {
      await api.post("/auth/role-permissions/", { role, features });
    }
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">🛡 Accounts</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage admin panel accounts and roles.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="hm-btn-primary">
          + New Account
        </button>
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Content Scope</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                  {a.name} {a.email === currentUser?.email && <span className="ml-1 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">You</span>}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{a.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={a.admin_role || "editor"}
                    disabled={a.admin_role === "super_admin"}
                    onChange={(e) => changeRole(a, e.target.value)}
                    className="hm-input w-36"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {a.admin_role === "teacher" ? (
                    <button
                      onClick={() => toggleContentScope(a)}
                      className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--color-text)]"
                      title="Toggle whether this teacher sees every exam/question, or only their own"
                    >
                      {a.can_manage_all_content ? "All content" : "Own content only"}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(a)}
                    className={`relative h-5 w-9 rounded-full transition ${a.is_active ? "bg-brand-blue" : "bg-[var(--color-border)]"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${a.is_active ? "left-4.5" : "left-0.5"}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{new Date(a.date_joined).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteAccount(a)} className="text-brand-red">
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        Which permissions go to which role
      </p>
      <div className="flex flex-col gap-4">
        <RolePermissionCard
          role="admin"
          title="Admin role access"
          description="Feature areas Admin accounts can access, including student enrollment approvals, promo code management, Website Settings, and the Advanced page. Package creation/editing, promo code creation, and other admin Accounts stay Super-Admin-only."
          availableFeatures={ADMIN_FEATURES}
          permissions={permissions}
          onSave={savePermissions}
        />
        <RolePermissionCard
          role="editor"
          title="Editor role access"
          description="Editor accounts are limited to content/exam areas — this list can't include Dashboard, Courses, Daily Practice, Students, Enrollment Requests, Promo Codes, Website Settings, or Advanced."
          availableFeatures={EDITOR_FEATURES}
          permissions={permissions}
          onSave={savePermissions}
        />
      </div>

      {showForm && (
        <Modal title="New admin account" onClose={() => setShowForm(false)}>
          <form onSubmit={createAccount} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="hm-input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Password</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Role</label>
              <select value={form.admin_role} onChange={(e) => setForm((f) => ({ ...f, admin_role: e.target.value }))} className="hm-input">
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Creating…" : "Create account"}
            </button>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemLabel={`${deleteTarget.name} (${deleteTarget.email})`}
          requireTyped
          consequences={[
            "Removes this admin panel account and its login access.",
            "Blocked automatically if this teacher has taught courses or purchases on record.",
          ]}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await runDeleteAccount(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <RequireStaff superAdminOnly>
      <Shell>
        <AccountsContent />
      </Shell>
    </RequireStaff>
  );
}
