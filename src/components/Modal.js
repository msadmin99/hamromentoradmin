"use client";

export default function Modal({ title, onClose, children, wide = false, fullscreen = false }) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-[var(--color-surface-muted)]">
        <div className="flex flex-none items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-4">
          <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)]">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`hm-card max-h-[90vh] w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)]">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
