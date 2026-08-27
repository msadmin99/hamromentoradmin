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
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

const PROVIDERS = [
  { key: "", label: "All providers" },
  { key: "fonepay", label: "Fonepay" },
  { key: "khalti", label: "Khalti" },
  { key: "esewa", label: "eSewa" },
  { key: "connectips", label: "connectIPS" },
  { key: "bank_qr", label: "Bank QR" },
  { key: "other", label: "Other" },
];

function itemLabel(p) {
  if (p.kind === "grand_test") return p.grand_test_title;
  if (p.kind === "teacher_course") return p.teacher_course_title;
  return p.plan_name;
}

function promptForReason(question) {
  const admin_note = prompt(question);
  if (admin_note === null) return null;
  if (!admin_note.trim()) {
    alert("A reason is required.");
    return null;
  }
  return admin_note.trim();
}

function downloadCsv(rows) {
  const header = ["Order ID", "Student", "Email", "Item", "Amount", "Provider", "Reference", "Status", "Submitted"];
  const lines = rows.map((p) =>
    [
      p.order_id, p.user_name, p.user_email, itemLabel(p), p.final_amount,
      p.payment_method_detail?.name || "", p.payment_reference || "", p.status, p.created_at,
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ScreenshotThumb({ purchaseId, hasScreenshot }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function reveal() {
    if (url || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/purchases/${purchaseId}/screenshot/`);
      setUrl(data.url);
    } catch (err) {
      setError(err.message || "Couldn't load the screenshot.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasScreenshot) return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  if (!url) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <button onClick={reveal} disabled={loading} className="text-xs font-semibold text-brand-blue">
          {loading ? "Loading…" : "View"}
        </button>
        {error && <span className="text-[10px] text-brand-red">{error}</span>}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Payment proof" className="h-10 w-10 rounded-md border border-[var(--color-border)] object-cover" />
    </a>
  );
}

function AuditTrail({ purchaseId }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    api.get(`/purchases/${purchaseId}/audit-log/`).then(setEntries);
  }, [purchaseId]);

  if (entries === null) return <p className="text-xs text-[var(--color-text-muted)]">Loading audit trail…</p>;
  if (entries.length === 0) return <p className="text-xs text-[var(--color-text-muted)]">No audit entries yet.</p>;

  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((e) => (
        <li key={e.id} className="text-xs text-[var(--color-text-muted)]">
          <span className="font-mono text-[var(--color-text)]">
            {e.previous_status || "—"} → {e.new_status}
          </span>{" "}
          · {e.actor_name} · {new Date(e.created_at).toLocaleString()}
          {e.reason && <span className="italic"> — &ldquo;{e.reason}&rdquo;</span>}
        </li>
      ))}
    </ul>
  );
}

function PaymentDetail({ purchase, busy, onApprove, onReject, onRequestResubmission }) {
  return (
    <div className="mt-2 rounded-lg bg-[var(--color-surface-muted)] p-3">
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <p className="font-semibold text-[var(--color-text-muted)]">Expected Amount</p>
          <p className="mt-0.5 font-bold text-[var(--color-text)]">Rs. {purchase.final_amount}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--color-text-muted)]">Transaction Reference</p>
          <p className="mt-0.5 font-mono text-[var(--color-text)]">{purchase.payment_reference || "—"}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--color-text-muted)]">Student</p>
          <p className="mt-0.5 text-[var(--color-text)]">{purchase.user_name}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--color-text-muted)]">Order</p>
          <p className="mt-0.5 font-mono text-[var(--color-text)]">{purchase.order_id}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold text-[var(--color-text-muted)]">Screenshot</p>
        <ScreenshotThumb purchaseId={purchase.id} hasScreenshot={purchase.has_screenshot} />
      </div>

      {(purchase.status === "pending" || purchase.status === "resubmission_requested") && (
        <div className="mt-3 flex gap-3">
          {purchase.status === "pending" && (
            <button onClick={() => onApprove(purchase.id)} disabled={busy} className="hm-btn-primary px-3 py-1.5 text-xs">
              Approve Payment
            </button>
          )}
          {purchase.status === "pending" && (
            <button
              onClick={() => onRequestResubmission(purchase.id)}
              disabled={busy}
              className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-700"
            >
              Request New Proof
            </button>
          )}
          <button
            onClick={() => onReject(purchase.id)}
            disabled={busy}
            className="rounded-lg border border-brand-red px-3 py-1.5 text-xs font-semibold text-brand-red"
          >
            Reject Payment
          </button>
        </div>
      )}

      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">Audit Trail</p>
        <AuditTrail purchaseId={purchase.id} />
      </div>
    </div>
  );
}

function PaymentsContent() {
  const [tab, setTab] = useState("pending");
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ status: tab });
    if (search.trim()) params.set("search", search.trim());
    if (provider) params.set("provider", provider);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    api
      .get(`/purchases/?${params.toString()}`)
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">💰 Payment Verification</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Verify a submitted payment screenshot against the amount and reference. Click a row to see full details, the
            audit trail, and actions.
          </p>
        </div>
        <button onClick={() => downloadCsv(purchases)} className="hm-btn-outline">
          ⬇ Export CSV
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap rounded-lg border border-[var(--color-border)] p-0.5">
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
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search reference or Order ID (HM-000123)"
          className="hm-input w-64 text-sm"
        />
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="hm-input w-auto text-sm">
          {PROVIDERS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="hm-input w-auto text-sm" />
        <span className="text-xs text-[var(--color-text-muted)]">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="hm-input w-auto text-sm" />
        <button onClick={load} className="hm-btn-outline text-sm">
          Filter
        </button>
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        {loading && <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>}
        {!loading &&
          purchases.map((p) => (
            <div key={p.id} className="border-b border-[var(--color-border)] p-3 last:border-0">
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="flex w-full flex-wrap items-center gap-3 text-left text-xs"
              >
                <span className="flex-none font-mono text-[var(--color-text-muted)]">{p.order_id}</span>
                <span className="min-w-[140px] flex-1 font-medium text-[var(--color-text)]">{p.user_name}</span>
                <span className="min-w-[140px] flex-1 text-[var(--color-text-muted)]">{itemLabel(p)}</span>
                <span className="flex-none font-semibold text-[var(--color-text)]">Rs. {p.final_amount}</span>
                <span className="flex-none text-[var(--color-text-muted)]">{p.payment_method_detail?.name || "—"}</span>
                <span className="flex-none font-mono text-[var(--color-text-muted)]">{p.payment_reference || "—"}</span>
                <span className="flex-none text-[var(--color-text-muted)]">
                  {new Date(p.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="flex-none text-[var(--color-text-muted)]">{expandedId === p.id ? "▲" : "▼"}</span>
              </button>
              {expandedId === p.id && (
                <PaymentDetail
                  purchase={p}
                  busy={busyId === p.id}
                  onApprove={approve}
                  onReject={reject}
                  onRequestResubmission={requestResubmission}
                />
              )}
            </div>
          ))}
        {!loading && purchases.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
            No {TABS.find((t) => t.key === tab)?.label.toLowerCase()} purchases.
          </p>
        )}
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
