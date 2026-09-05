"use client";

import { useEffect, useRef, useState } from "react";

export default function RowActionsMenu({ items, trigger, triggerLabel = "More actions" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const visible = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={trigger ? undefined : triggerLabel}
        className={
          trigger
            ? "rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            : "rounded-lg px-2 py-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] focus:outline-none focus:ring-2 focus:ring-brand-blue"
        }
      >
        {trigger || "⋮"}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg"
        >
          {visible.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
                item.danger ? "text-brand-red" : "text-[var(--color-text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
