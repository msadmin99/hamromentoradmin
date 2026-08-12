"use client";

import { useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function SettingsContent() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(`${user?.first_name || ""} ${user?.last_name || ""}`.trim());
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function saveName() {
    setSavingName(true);
    setNameSaved(false);
    try {
      await api.patch("/auth/settings/", { name });
      await refresh();
      setNameSaved(true);
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    setChangingPassword(true);
    try {
      await api.post("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Settings</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage your admin account.</p>

      <div className="mt-5 hm-card p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">🛡 ACCOUNT</p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Signed in as <span className="font-semibold text-[var(--color-text)]">{user?.email}</span>
        </p>
        <label className="mb-1 mt-3 block text-xs font-semibold text-[var(--color-text-muted)]">Your name</label>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="hm-input" />
          <button onClick={saveName} disabled={savingName} className="hm-btn-outline flex-none">
            {savingName ? "Saving…" : "Save"}
          </button>
        </div>
        {nameSaved && <p className="mt-1 text-xs font-medium text-brand-green">Saved ✓</p>}
      </div>

      <div className="mt-5 hm-card p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">🔑 CHANGE PASSWORD</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Choose a strong password — this is the only account that can access the admin panel with these credentials.</p>
        <form onSubmit={changePassword} className="mt-3 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Current password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="hm-input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">New password</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="hm-input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Confirm new password</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="hm-input" />
          </div>
          {passwordError && <p className="text-xs font-medium text-brand-red">{passwordError}</p>}
          {passwordMessage && <p className="text-xs font-medium text-brand-green">{passwordMessage}</p>}
          <button type="submit" disabled={changingPassword} className="hm-btn-primary self-start">
            {changingPassword ? "Changing…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireStaff>
      <Shell>
        <SettingsContent />
      </Shell>
    </RequireStaff>
  );
}
