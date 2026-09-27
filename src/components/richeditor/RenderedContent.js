"use client";

import { useMemo } from "react";
import { renderStudentHtml } from "@/lib/studentHtml";

/**
 * READ-ONLY rendered view of a piece of question content — what a student
 * would see: rich HTML preserved, math delimiters ($…$, $$…$$, \(…\), \[…\])
 * typeset with KaTeX, plain quantities left as ordinary text (trivialMath).
 *
 * It never edits, converts or stores anything: it takes the same source
 * string the editor holds and renders it beside the editor. The source (and
 * the stored/imported content) is unchanged; nothing is turned into
 * `data-equation` nodes.
 */
export default function RenderedContent({ html, className = "", emptyLabel = "" }) {
  const rendered = useMemo(() => renderStudentHtml(html), [html]);
  if (!rendered) {
    return emptyLabel ? <p className="text-xs italic text-[var(--color-text-muted)]">{emptyLabel}</p> : null;
  }
  return (
    <div
      className={`hm-richtext-content ${className}`.trim()}
      data-rendered-preview="true"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
