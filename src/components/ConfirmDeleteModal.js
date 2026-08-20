"use client";

import { useState } from "react";
import Modal from "./Modal";

/**
 * Shared permanent-delete confirmation, replacing native confirm() for
 * destructive actions. `requireTyped` gates high-risk deletes (Course,
 * Admin account, bulk delete, TeacherCourse) behind typing DELETE — cheap
 * single-item deletes (a promo code, a payment method) can skip it.
 */
export default function ConfirmDeleteModal({
  title = "Permanently delete?",
  itemLabel,
  consequences = [],
  requireTyped = false,
  onCancel,
  onConfirm,
}) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canConfirm = !requireTyped || typed.trim().toUpperCase() === "DELETE";

  async function handleConfirm() {
    if (!canConfirm || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || "Deletion failed. No partial deletion should remain.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-brand-red-light px-3 py-2.5 text-sm font-semibold text-brand-red">
          ⚠️ This action will permanently delete {itemLabel ? <>&ldquo;{itemLabel}&rdquo;</> : "this data"} and cannot be
          undone.
        </p>

        {consequences.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-text-muted)]">
            {consequences.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}

        {requireTyped && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Type <span className="font-mono font-bold text-brand-red">DELETE</span> to confirm
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="hm-input font-mono"
              autoFocus
              placeholder="DELETE"
            />
          </div>
        )}

        {error && <p className="text-xs font-medium text-brand-red">{error}</p>}

        <div className="mt-1 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={submitting} className="hm-btn-outline">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="rounded-xl bg-brand-red px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50"
          >
            {submitting ? "Deleting…" : "Permanently delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
