// Plain-text preview of rich HTML content — used anywhere HTML from the
// question/option/explanation editor needs to show as a single-line summary
// (list rows, pickers) instead of literal tags.
export function stripHtml(html) {
  if (!html) return "";
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, " ");
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}
