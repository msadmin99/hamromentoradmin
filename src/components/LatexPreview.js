"use client";

import { useMemo } from "react";
import katex from "katex";

export default function LatexPreview({ value }) {
  const html = useMemo(() => {
    if (!value?.trim()) return "";
    try {
      return katex.renderToString(value, { throwOnError: false, displayMode: false });
    } catch {
      return "";
    }
  }, [value]);

  if (!html) return null;

  return (
    <div
      className="mt-1.5 overflow-x-auto rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
