"use client";

import { useEffect, useRef } from "react";
import { API_URL, getAccessToken } from "@/lib/api";

function ToolbarButton({ onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
    >
      {children}
    </button>
  );
}

async function uploadRichImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const headers = {};
  const access = getAccessToken();
  if (access) headers.Authorization = `Bearer ${access}`;
  const res = await fetch(`${API_URL}/uploads/image/`, { method: "POST", headers, body: formData });
  if (!res.ok) throw new Error("Image upload failed.");
  return res.json();
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 90 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange() {
    onChange(ref.current?.innerHTML || "");
  }

  function exec(command, arg) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function insertLink() {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url);
  }

  async function insertImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await uploadRichImage(file);
      exec("insertImage", data.url);
    } catch {
      // best-effort — leave the editor content as-is if the upload fails
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] px-1.5 py-1">
        <ToolbarButton title="Bold" onClick={() => exec("bold")}>
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          • List
        </ToolbarButton>
        <ToolbarButton title="Align left" onClick={() => exec("justifyLeft")}>
          ⯇
        </ToolbarButton>
        <ToolbarButton title="Align center" onClick={() => exec("justifyCenter")}>
          ≡
        </ToolbarButton>
        <ToolbarButton title="Align right" onClick={() => exec("justifyRight")}>
          ⯈
        </ToolbarButton>
        <ToolbarButton title="Indent" onClick={() => exec("indent")}>
          →|
        </ToolbarButton>
        <ToolbarButton title="Outdent" onClick={() => exec("outdent")}>
          |←
        </ToolbarButton>
        <ToolbarButton title="Insert link" onClick={insertLink}>
          🔗
        </ToolbarButton>
        <label className="cursor-pointer rounded px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
          🖼
          <input type="file" accept="image/*" className="hidden" onChange={insertImage} />
        </label>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={() => setTimeout(emitChange, 0)}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="hm-richtext-content px-3 py-2 text-sm text-[var(--color-text)] outline-none"
      />
    </div>
  );
}
