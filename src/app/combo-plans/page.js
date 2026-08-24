"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const PRODUCT_TYPE_LABELS = {
  qbank: "Question Bank",
  daily_test: "Daily Test",
  mock_test: "Mock Test",
  video: "Video Lectures",
  pyq: "Past Year Questions",
};
const PRODUCT_TYPE_ORDER = ["qbank", "mock_test", "daily_test", "pyq", "video"];
const MAX_DISCOUNT_PERCENT = 35;

function emptyForm(courseId) {
  return {
    name: "", course: courseId || "", discount_percent: 15, is_popular: false, is_best_value: true,
    is_active: true, order: 0,
    // One plan id per product type — a combo can only include one plan per
    // type (server-enforced by ComboPlanSerializer.validate_plans).
    selectedPlanByType: {},
  };
}

function planLabel(p) {
  const detail = p.mock_test_quota != null ? `${p.mock_test_quota} tests` : `${p.duration_value} ${p.duration_unit}(s)`;
  return `${p.name} — Rs. ${p.price} (${detail})`;
}

function ComboPlansContent() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [plans, setPlans] = useState([]);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
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
    setLoading(true);
    Promise.all([
      api.get(`/combo-plans/?course=${courseId}`),
      api.get(`/subscription-plans/?course=${courseId}`),
    ])
      .then(([comboData, planData]) => {
        setCombos(comboData);
        setPlans(planData);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [courseId]);

  const plansByType = useMemo(() => {
    const acc = {};
    plans.forEach((p) => {
      (acc[p.product_type] = acc[p.product_type] || []).push(p);
    });
    return acc;
  }, [plans]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(courseId));
    setError("");
    setShowForm(true);
  }

  function openEdit(combo) {
    setEditingId(combo.id);
    const selectedPlanByType = {};
    (combo.plan_details || []).forEach((p) => {
      selectedPlanByType[p.product_type] = String(p.id);
    });
    setForm({
      name: combo.name, course: String(combo.course), discount_percent: combo.discount_percent,
      is_popular: combo.is_popular, is_best_value: combo.is_best_value, is_active: combo.is_active,
      order: combo.order, selectedPlanByType,
    });
    setError("");
    setShowForm(true);
  }

  function selectPlanForType(productType, planId) {
    setForm((f) => ({
      ...f,
      selectedPlanByType: { ...f.selectedPlanByType, [productType]: planId || undefined },
    }));
  }

  const selectedPlanIds = Object.values(form.selectedPlanByType).filter(Boolean);
  const selectedPlans = plans.filter((p) => selectedPlanIds.includes(String(p.id)));
  const individualValue = selectedPlans.reduce((sum, p) => sum + Number(p.price), 0);
  const previewSave = individualValue * (Number(form.discount_percent) || 0) / 100;
  const previewFinal = individualValue - previewSave;

  async function save(e) {
    e.preventDefault();
    setError("");
    if (selectedPlanIds.length < 2) {
      setError("Select at least 2 plans (across different product types) for this combo.");
      return;
    }
    if (Number(form.discount_percent) > MAX_DISCOUNT_PERCENT) {
      setError(`Discount cannot exceed ${MAX_DISCOUNT_PERCENT}%.`);
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name, course: Number(form.course), plans: selectedPlanIds.map(Number),
      discount_percent: Number(form.discount_percent), is_popular: form.is_popular,
      is_best_value: form.is_best_value, is_active: form.is_active, order: Number(form.order),
    };
    try {
      if (editingId) {
        await api.patch(`/combo-plans/${editingId}/`, payload);
      } else {
        await api.post("/combo-plans/", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCombo(id) {
    if (!confirm("Delete this combo plan?")) return;
    await api.del(`/combo-plans/${id}/`);
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">🎁 Combo Plans</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Bundle several product plans into one discounted package — e.g. QBank + Mock Tests + PYQ at up to {MAX_DISCOUNT_PERCENT}% off.
          </p>
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Create Combo
        </button>
      </div>

      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="hm-input mt-4 w-64">
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <div className="mt-4 flex flex-col gap-2">
        {combos.map((c) => {
          const value = (c.plan_details || []).reduce((sum, p) => sum + Number(p.price), 0);
          return (
            <div key={c.id} className="hm-card flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-[var(--color-text)]">
                  {c.name}
                  {!c.is_active && (
                    <span className="ml-2 rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
                      INACTIVE
                    </span>
                  )}
                  {c.is_popular && (
                    <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">POPULAR</span>
                  )}
                  {c.is_best_value && (
                    <span className="ml-2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-blue">BEST VALUE</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {(c.plan_details || []).map((p) => PRODUCT_TYPE_LABELS[p.product_type] || p.product_type).join(" + ")}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  <span className="line-through">Rs. {value}</span> → <strong className="text-[var(--color-text)]">Rs. {c.final_price}</strong>{" "}
                  <span className="font-semibold text-brand-green">({c.discount_percent}% off)</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(c)} className="text-xs font-semibold text-brand-blue">
                  Edit
                </button>
                <button onClick={() => removeCombo(c.id)} className="text-brand-red">
                  🗑
                </button>
              </div>
            </div>
          );
        })}
        {!loading && combos.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            No combo plans yet for this course.
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingId ? "Edit combo" : "Create combo"} onClose={() => setShowForm(false)} wide>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="hm-input"
                placeholder="e.g. Ultimate Medical Prep"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Included plans (one per product type)
              </label>
              <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-3">
                {PRODUCT_TYPE_ORDER.filter((t) => plansByType[t]?.length).map((type) => (
                  <div key={type}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      {PRODUCT_TYPE_LABELS[type]}
                    </p>
                    <select
                      value={form.selectedPlanByType[type] || ""}
                      onChange={(e) => selectPlanForType(type, e.target.value)}
                      className="hm-input"
                    >
                      <option value="">Not included</option>
                      {plansByType[type].map((p) => (
                        <option key={p.id} value={p.id}>{planLabel(p)}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {PRODUCT_TYPE_ORDER.filter((t) => plansByType[t]?.length).length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    This course has no subscription plans yet — create some under Subscription Plans first.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={MAX_DISCOUNT_PERCENT}
                  required
                  value={form.discount_percent}
                  onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
                  className="hm-input"
                />
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Capped at {MAX_DISCOUNT_PERCENT}%.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Display order</label>
                <input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  className="hm-input"
                />
              </div>
            </div>

            {selectedPlans.length > 0 && (
              <div className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center justify-between">
                  <span>Individual value</span>
                  <span className="line-through">Rs. {individualValue}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>You save ({form.discount_percent || 0}%)</span>
                  <span className="font-semibold text-brand-green">− Rs. {previewSave.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-bold text-[var(--color-text)]">
                  <span>Final price</span>
                  <span>Rs. {previewFinal.toFixed(2)}</span>
                </div>
              </div>
            )}

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
              <span>
                <span className="font-semibold text-[var(--color-text)]">Show &quot;Best Value&quot; badge</span>
                <span className="block text-xs text-[var(--color-text-muted)]">Renders as the flagship, highlighted combo card.</span>
              </span>
              <input
                type="checkbox"
                checked={form.is_best_value}
                onChange={(e) => setForm((f) => ({ ...f, is_best_value: e.target.checked }))}
              />
            </label>

            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create combo"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function ComboPlansPage() {
  return (
    <RequireStaff feature="billing">
      <Shell>
        <ComboPlansContent />
      </Shell>
    </RequireStaff>
  );
}
