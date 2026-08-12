"use client";

import { useEffect, useRef, useState } from "react";

const INTERVAL_MS = 30000;

/** Autosaves `value` to localStorage every 30s while it's dirty, and offers to
 * restore a leftover draft on mount (e.g. after a crash or accidental navigation
 * away). Purely client-side — no backend involved. */
export function useAutosaveDraft(key, value, { enabled = true } = {}) {
  const [restoredDraft, setRestoredDraft] = useState(null);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setRestoredDraft(JSON.parse(raw));
    } catch {
      // corrupt/unavailable draft — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const serialized = JSON.stringify(value);
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;
      try {
        window.localStorage.setItem(key, serialized);
      } catch {
        // storage full/unavailable — best effort, no data-loss risk beyond today's baseline
      }
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [key, value, enabled]);

  function clearDraft() {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setRestoredDraft(null);
  }

  function dismissDraft() {
    setRestoredDraft(null);
  }

  return { restoredDraft, clearDraft, dismissDraft };
}
