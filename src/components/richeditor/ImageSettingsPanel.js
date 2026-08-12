"use client";

import { useState } from "react";
import { formatFileSize } from "./imageStyle";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{label}</label>
      {children}
    </div>
  );
}

export default function ImageSettingsPanel({
  attrs,
  lockAspect,
  onToggleLockAspect,
  onSetSize,
  onFit,
  onFill,
  onResetSize,
  onSetRotationDeg,
  onResetRotation,
  onSetSpacing,
  onSetAlt,
  onSetTitle,
  onDownload,
  onCopy,
  onCompress,
  onResetAll,
  onClose,
}) {
  const [compressing, setCompressing] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  async function handleCompress() {
    setCompressing(true);
    try {
      await onCompress();
    } finally {
      setCompressing(false);
    }
  }
  async function handleCopy() {
    const ok = await onCopy();
    setCopyStatus(ok ? "Copied!" : "Not supported in this browser");
    setTimeout(() => setCopyStatus(""), 2000);
  }

  return (
    <div className="hm-image-settings-anchor" contentEditable={false}>
      <div className="hm-image-settings-panel">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[var(--color-text)]">Image settings</p>
          <button type="button" onClick={onClose} className="text-xs font-semibold text-[var(--color-text-muted)]">
            ✕
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="Width (px)">
            <input
              type="number"
              value={Math.round(attrs.width || 0)}
              onChange={(e) => onSetSize(Number(e.target.value), null)}
              className="hm-input text-xs"
            />
          </Field>
          <Field label="Height (px)">
            <input
              type="number"
              value={Math.round(attrs.height || 0)}
              onChange={(e) => onSetSize(null, Number(e.target.value))}
              className="hm-input text-xs"
            />
          </Field>
        </div>
        <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
          <input type="checkbox" checked={lockAspect} onChange={onToggleLockAspect} />
          Lock aspect ratio
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button type="button" onClick={onFit} className="hm-btn-outline px-2 py-1 text-[10px]">
            Fit to container
          </button>
          <button type="button" onClick={onFill} className="hm-btn-outline px-2 py-1 text-[10px]">
            Fill container
          </button>
          <button type="button" onClick={onResetSize} className="hm-btn-outline px-2 py-1 text-[10px]">
            Reset to original
          </button>
        </div>

        <div className="mt-3 border-t border-[var(--color-border)] pt-2">
          <Field label="Rotation (0–360°)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={360}
                value={attrs.rotate || 0}
                onChange={(e) => onSetRotationDeg(Number(e.target.value))}
                className="hm-input flex-1 text-xs"
              />
              <button type="button" onClick={onResetRotation} className="hm-btn-outline flex-none px-2 py-1 text-[10px]">
                Reset
              </button>
            </div>
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-2">
          <Field label="Padding (px)">
            <input
              type="number"
              min={0}
              value={attrs.padding || 0}
              onChange={(e) => onSetSpacing("padding", Number(e.target.value))}
              className="hm-input text-xs"
            />
          </Field>
          <Field label="Margin (px)">
            <input
              type="number"
              min={0}
              value={attrs.margin || 0}
              onChange={(e) => onSetSpacing("margin", Number(e.target.value))}
              className="hm-input text-xs"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--color-border)] pt-2">
          <Field label="Alt text (accessibility)">
            <input
              value={attrs.alt || ""}
              onChange={(e) => onSetAlt(e.target.value)}
              placeholder="Describe this image for screen readers"
              className="hm-input text-xs"
            />
          </Field>
          <Field label="Title / tooltip">
            <input
              value={attrs.title || ""}
              onChange={(e) => onSetTitle(e.target.value)}
              placeholder="Shown on hover"
              className="hm-input text-xs"
            />
          </Field>
        </div>

        <div className="mt-3 border-t border-[var(--color-border)] pt-2 text-[11px] text-[var(--color-text-muted)]">
          <p>
            Current: {Math.round(attrs.width || 0)}×{Math.round(attrs.height || 0)}px
            {attrs.naturalWidth ? ` · Original: ${attrs.naturalWidth}×${attrs.naturalHeight}px` : ""}
          </p>
          {attrs.fileSize ? <p>File size: {formatFileSize(attrs.fileSize)}</p> : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onDownload} className="hm-btn-outline px-2 py-1 text-[10px]">
            ⬇ Download
          </button>
          <button type="button" onClick={handleCopy} className="hm-btn-outline px-2 py-1 text-[10px]">
            {copyStatus || "⧉ Copy image"}
          </button>
          <button type="button" onClick={handleCompress} disabled={compressing} className="hm-btn-outline px-2 py-1 text-[10px]">
            {compressing ? "Compressing…" : "🗜 Compress"}
          </button>
        </div>

        <button type="button" onClick={onResetAll} className="mt-3 w-full rounded-lg border border-brand-red px-2 py-1.5 text-[11px] font-semibold text-brand-red">
          Reset all changes
        </button>
      </div>
    </div>
  );
}
