"use client";

import { useCallback, useState } from "react";

let idSeq = 0;

/** Small local toast system for this module — no app-wide provider, since
 * nothing else in Admin currently uses toasts (every other page still uses
 * native alert() for these same error paths). */
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, tone = "success") => {
    const id = ++idSeq;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return { toasts, push };
}

export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`max-w-xs rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            t.tone === "error" ? "bg-brand-red" : t.tone === "info" ? "bg-brand-blue" : "bg-brand-green"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
