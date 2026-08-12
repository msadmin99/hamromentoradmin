"use client";

import { useEffect, useState } from "react";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TABS = [
  { key: "unpaid", label: "Unpaid" },
  { key: "pending", label: "Pending" },
  { key: "resubmission_requested", label: "Resubmission Requested" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function promptForReason(question) {
  const admin_note = prompt(question);
  if (admin_note === null) return null;
  if (!admin_note.trim()) {
    alert("A reason is required.");
    return null;
  }
  return admin_note.trim();
}

function PaymentsContent() {
  const [tab, setTab] = useState("pending");
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    api
      .get(`/purchases/?status=${tab}`)
      .then(setPurchases)
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  async function approve(id) {
    setBusyId(id);
    try {
      await api.post(`/purchases/${id}/approve/`, {});
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    const admin_note = promptForReason("Reason for rejecting (required):");
    if (admin_note === null) return;
    setBusyId(id);
    try {
      await api.post(`/purchases/${id}/reject/`, { admin_note });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function requestResubmission(id) {
    const admin_note = promptForReason("What's wrong with the current proof? (shown to the student)");
    if (admin_note === null) return;
    setBusyId(id);
    try {
      await api.post(`/purchases/${id}/request-resubmission/`, { admin_note });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const showActions = tab === "pending" || tab === "resubmission_requested";

  return (
    <div className="p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">💰 Payments</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Verify a submitted payment screenshot against the amount and reference — Subscriptions activate on approval,
        and Grand Test buyers automatically receive their unique password by email.
      </p>

      <div className="mt-4 flex flex-wrap rounded-lg border border-[var(--color-border)] p-0.5" style={{ width: "fit-content" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold ${
              tab === t.key ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Proof</th>
              {tab === "resubmission_requested" && <th className="px-4 py-3">Note sent</th>}
              <th className="px-4 py-3">Date</th>
              {showActions && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--color-text)]">{p.user_name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{p.user_email}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  {p.kind === "grand_test" ? (
                    <span>🎯 {p.grand_test_title}</span>
                  ) : (
                    <span>📦 {p.plan_name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {p.discount_amount > 0 && (
                    <span className="mr-1 text-[var(--color-text-muted)] line-through">Rs. {p.original_amount}</span>
                  )}
                  <span className="font-semibold text-[var(--color-text)]">Rs. {p.final_amount}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{p.payment_method_detail?.name || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">{p.payment_reference || "—"}</td>
                <td className="px-4 py-3">
                  {p.payment_screenshot ? (
                    <a href={p.payment_screenshot} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.payment_screenshot}
                        alt="Payment proof"
                        className="h-10 w-10 rounded-md border border-[var(--color-border)] object-cover"
                      />
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">—</span>
                  )}
                </td>
                {tab === "resubmission_requested" && (
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{p.admin_note || "—"}</td>
                )}
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  {new Date(p.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                {showActions && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {tab === "pending" && (
                      <button
                        onClick={() => approve(p.id)}
                        disabled={busyId === p.id}
                        className="mr-3 text-xs font-semibold text-brand-green"
                      >
                        Approve
                      </button>
                    )}
                    {tab === "pending" && (
                      <button
                        onClick={() => requestResubmission(p.id)}
                        disabled={busyId === p.id}
                        className="mr-3 text-xs font-semibold text-amber-600"
                      >
                        Request New Proof
                      </button>
                    )}
                    <button onClick={() => reject(p.id)} disabled={busyId === p.id} className="text-xs font-semibold text-brand-red">
                      Reject
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!loading && purchases.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No {TABS.find((t) => t.key === tab)?.label.toLowerCase()} purchases.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <RequireStaff feature="billing">
      <Shell>
        <PaymentsContent />
      </Shell>
    </RequireStaff>
  );
}
