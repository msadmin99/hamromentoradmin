"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const PRODUCT_TABS = [
  { key: "qbank", label: "Question Bank" },
  { key: "daily_test", label: "Daily Test" },
  { key: "mock_test", label: "Mock Test" },
  { key: "video", label: "Video Lectures" },
  { key: "pyq", label: "Past Year Questions" },
];

const DURATION_UNITS = [
  { key: "day", label: "Day(s)" },
  { key: "week", label: "Week(s)" },
  { key: "month", label: "Month(s)" },
  { key: "year", label: "Year(s)" },
];

function emptyForm(productType) {
  return {
    name: "", product_type: productType, duration_value: 1, duration_unit: "month", mock_test_quota: "",
    price: "", is_active: true, is_popular: false, is_best_value: false, order: 0,
  };
}

function PlansContent() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [tab, setTab] = useState("qbank");
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm("qbank"));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/courses/").then((data) => {
      setCourses(data);
      if (data.length) setCourseId(String(data[0].id));
    });
  }, []);

  function load() {
    if (!courseId) return;
    api.get(`/subscription-plans/?course=${courseId}&product_type=${tab}`).then(setPlans);
  }

  useEffect(load, [courseId, tab]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(tab));
    setError("");
    setShowForm(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      product_type: p.product_type,
      duration_value: p.duration_value,
      duration_unit: p.duration_unit,
      mock_test_quota: p.mock_test_quota ?? "",
      price: p.price,
      is_active: p.is_active,
      is_popular: p.is_popular,
      is_best_value: p.is_best_value,
      order: p.order,
    });
    setError("");
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      ...form,
      course: Number(courseId),
      duration_value: Number(form.duration_value),
      mock_test_quota: form.mock_test_quota === "" ? null : Number(form.mock_test_quota),
      price: Number(form.price),
      order: Number(form.order),
    };
    try {
      if (editingId) {
        await api.patch(`/subscription-plans/${editingId}/`, payload);
      } else {
        await api.post("/subscription-plans/", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removePlan(id) {
    if (!confirm("Delete this plan? Existing subscriptions already granted are unaffected.")) return;
    await api.del(`/subscription-plans/${id}/`);
    load();
  }

  return (
    <div className="p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">💳 Subscription Plans</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Pro Plan pricing tiers students can subscribe to — Question Bank, Daily Test, Mock Test, and Video Lecture packages, per course.
      </p>

      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="hm-input mt-4 w-64">
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
          {PRODUCT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === t.key ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Add plan
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {plans.map((p) => (
          <div key={p.id} className="hm-card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-[var(--color-text)]">
                {p.name}
                {!p.is_active && (
                  <span className="ml-2 rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
                    INACTIVE
                  </span>
                )}
                {p.is_popular && (
                  <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">POPULAR</span>
                )}
                {p.is_best_value && (
                  <span className="ml-2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-blue">BEST VALUE</span>
                )}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Rs. {p.price} · {p.duration_value} {p.duration_unit}(s)
                {p.mock_test_quota != null && ` · ${p.mock_test_quota} mock tests`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => openEdit(p)} className="text-xs font-semibold text-brand-blue">
                Edit
              </button>
              <button onClick={() => removePlan(p.id)} className="text-brand-red">
                🗑
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            No {PRODUCT_TABS.find((t) => t.key === tab)?.label} plans yet for this course.
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingId ? "Edit plan" : "Add plan"} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="hm-input"
                placeholder="e.g. 3 Month QBank Access"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Duration</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.duration_value}
                  onChange={(e) => setForm((f) => ({ ...f, duration_value: e.target.value }))}
                  className="hm-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Unit</label>
                <select
                  value={form.duration_unit}
                  onChange={(e) => setForm((f) => ({ ...f, duration_unit: e.target.value }))}
                  className="hm-input"
                >
                  {DURATION_UNITS.map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {form.product_type === "mock_test" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                  Mock tests included (blank = unlimited)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.mock_test_quota}
                  onChange={(e) => setForm((f) => ({ ...f, mock_test_quota: e.target.value }))}
                  className="hm-input"
                  placeholder="e.g. 30"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Price (Rs.)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
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
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Show &quot;Popular&quot; badge</span>
              <input
                type="checkbox"
                checked={form.is_popular}
                onChange={(e) => setForm((f) => ({ ...f, is_popular: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Show &quot;Best Value&quot; badge</span>
              <input
                type="checkbox"
                checked={form.is_best_value}
                onChange={(e) => setForm((f) => ({ ...f, is_best_value: e.target.checked }))}
              />
            </label>
            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create plan"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function PlansPage() {
  return (
    <RequireStaff feature="billing">
      <Shell>
        <PlansContent />
      </Shell>
    </RequireStaff>
  );
}
