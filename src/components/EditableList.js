"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Modal from "./Modal";

export default function EditableList({
  title,
  description,
  endpoint,
  fields,
  fixedValues = {},
  itemLabel = (item) => item.label || item.title || `#${item.id}`,
  itemMeta,
}) {
  const basePath = endpoint.split("?")[0];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function emptyForm() {
    const f = {};
    fields.forEach((field) => {
      f[field.name] = field.default ?? (field.type === "number" ? 0 : "");
    });
    return f;
  }

  function load() {
    setLoading(true);
    api
      .get(endpoint)
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(load, [endpoint]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    const f = {};
    fields.forEach((field) => {
      f[field.name] = item[field.name];
    });
    setError("");
    setForm(f);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form, ...fixedValues };
    fields.forEach((field) => {
      if (field.type === "number") payload[field.name] = Number(payload[field.name]);
    });
    try {
      if (editingId) {
        await api.patch(`${basePath}${editingId}/`, payload);
      } else {
        await api.post(basePath, payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    await api.del(`${basePath}${id}/`);
    load();
  }

  return (
    <div className="hm-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>}
        </div>
        <button onClick={openCreate} className="hm-btn-outline flex-none text-xs">
          + Add
        </button>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-[var(--color-border)]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">{itemLabel(item)}</p>
              {itemMeta && <p className="truncate text-xs text-[var(--color-text-muted)]">{itemMeta(item)}</p>}
            </div>
            <div className="flex flex-none gap-3">
              <button onClick={() => openEdit(item)} className="text-xs font-semibold text-brand-blue">
                Edit
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-xs font-semibold text-brand-red">
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="py-3 text-xs text-[var(--color-text-muted)]">Nothing here yet.</p>
        )}
      </div>

      {showForm && (
        <Modal title={editingId ? `Edit — ${title}` : `Add — ${title}`} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={form[field.name] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    className="hm-input"
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={form[field.name] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    className="hm-input"
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
