"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { ImagePicker } from "@/components/QuestionCard";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api, uploadFields } from "@/lib/api";

function emptyForm() {
  return { name: "", instructions: "", qr_code_image: null, is_active: true, order: 0 };
}

function PaymentMethodsContent() {
  const [methods, setMethods] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.get("/payment-methods/").then(setMethods);
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setShowForm(true);
  }

  function openEdit(m) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      instructions: m.instructions,
      qr_code_image: m.qr_code_image,
      is_active: m.is_active,
      order: m.order,
    });
    setError("");
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const fields = {
      name: form.name,
      instructions: form.instructions,
      is_active: form.is_active,
      order: form.order,
    };
    if (form.qr_code_image instanceof File) fields.qr_code_image = form.qr_code_image;
    try {
      if (editingId) {
        await uploadFields(`/payment-methods/${editingId}/`, "PATCH", fields);
      } else {
        await uploadFields("/payment-methods/", "POST", fields);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeMethod(id) {
    if (!confirm("Delete this payment method? Past purchases that used it keep their record.")) return;
    await api.del(`/payment-methods/${id}/`);
    load();
  }

  return (
    <div className="p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">🏦 Payment Methods</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Channels shown to students on the QR Payment Page — each needs a QR code and &quot;How to Pay&quot; instructions.
      </p>

      <div className="mt-4 flex items-center justify-end">
        <button onClick={openCreate} className="hm-btn-primary">
          + Add payment method
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {methods.map((m) => (
          <div key={m.id} className="hm-card flex items-center gap-4 p-4">
            {m.qr_code_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.qr_code_image} alt="" className="h-14 w-14 flex-none rounded-md border border-[var(--color-border)] object-cover" />
            ) : (
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-md bg-[var(--color-surface-muted)] text-xl">🏦</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--color-text)]">
                {m.name}
                {!m.is_active && (
                  <span className="ml-2 rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
                    INACTIVE
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{m.instructions || "No instructions set."}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => openEdit(m)} className="text-xs font-semibold text-brand-blue">
                Edit
              </button>
              <button onClick={() => removeMethod(m.id)} className="text-brand-red">
                🗑
              </button>
            </div>
          </div>
        ))}
        {methods.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            No payment methods yet — students can&apos;t check out until at least one is added.
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingId ? "Edit payment method" : "Add payment method"} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="hm-input"
                placeholder="e.g. Fonepay"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">QR code</label>
              <ImagePicker
                label="Choose QR image"
                value={form.qr_code_image}
                onChange={(v) => setForm((f) => ({ ...f, qr_code_image: v }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">How to Pay instructions</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                className="hm-input min-h-24"
                placeholder="1. Open your banking app&#10;2. Scan the QR code&#10;3. Pay the exact amount shown&#10;4. Save the transaction ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                className="hm-input"
              />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Active</span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            </label>
            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create payment method"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function PaymentMethodsPage() {
  return (
    <RequireStaff feature="billing">
      <Shell>
        <PaymentMethodsContent />
      </Shell>
    </RequireStaff>
  );
}
