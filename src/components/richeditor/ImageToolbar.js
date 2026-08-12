"use client";

import { useState } from "react";

function TBtn({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-1.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-brand-blue text-white" : "text-white/90 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

const WRAP_OPTIONS = [
  { key: "none", label: "No wrap" },
  { key: "left", label: "Wrap — image left" },
  { key: "right", label: "Wrap — image right" },
  { key: "inline", label: "Inline with text" },
];

export default function ImageToolbar({
  attrs,
  onUpdate,
  onEnterCrop,
  onReplace,
  onDuplicate,
  onDelete,
  onOpenSettings,
}) {
  const [showWrapMenu, setShowWrapMenu] = useState(false);
  const locked = !!attrs.locked;

  return (
    <div className="hm-image-toolbar" contentEditable={false}>
      <TBtn title="Align left" active={attrs.align === "left"} disabled={locked} onClick={() => onUpdate({ align: "left" })}>
        ⯇
      </TBtn>
      <TBtn title="Align center" active={attrs.align === "center"} disabled={locked} onClick={() => onUpdate({ align: "center" })}>
        ≡
      </TBtn>
      <TBtn title="Align right" active={attrs.align === "right"} disabled={locked} onClick={() => onUpdate({ align: "right" })}>
        ⯈
      </TBtn>
      <span className="hm-image-toolbar-divider" />
      <div className="relative">
        <TBtn title="Text wrap" disabled={locked} onClick={() => setShowWrapMenu((v) => !v)}>
          Wrap ▾
        </TBtn>
        {showWrapMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowWrapMenu(false)} />
            <div className="absolute left-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-2xl">
              {WRAP_OPTIONS.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onUpdate({ wrap: w.key });
                    setShowWrapMenu(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-xs ${
                    attrs.wrap === w.key ? "font-bold text-brand-blue" : "text-[var(--color-text)]"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <span className="hm-image-toolbar-divider" />
      <TBtn title="Rotate left 90°" disabled={locked} onClick={() => onUpdate({ rotate: ((attrs.rotate || 0) - 90 + 360) % 360 })}>
        ↺
      </TBtn>
      <TBtn title="Rotate right 90°" disabled={locked} onClick={() => onUpdate({ rotate: ((attrs.rotate || 0) + 90) % 360 })}>
        ↻
      </TBtn>
      <TBtn title="Flip horizontal" active={attrs.flipX} disabled={locked} onClick={() => onUpdate({ flipX: !attrs.flipX })}>
        ⇋
      </TBtn>
      <TBtn title="Flip vertical" active={attrs.flipY} disabled={locked} onClick={() => onUpdate({ flipY: !attrs.flipY })}>
        ⇵
      </TBtn>
      <TBtn title="Crop" disabled={locked} onClick={onEnterCrop}>
        ⛶ Crop
      </TBtn>
      <span className="hm-image-toolbar-divider" />
      <TBtn title="Replace image" disabled={locked} onClick={onReplace}>
        Replace
      </TBtn>
      <TBtn title="Duplicate" onClick={onDuplicate}>
        ⧉
      </TBtn>
      <TBtn title="Delete" disabled={locked} onClick={onDelete}>
        🗑
      </TBtn>
      <TBtn title={locked ? "Unlock position" : "Lock position"} active={locked} onClick={() => onUpdate({ locked: !locked })}>
        {locked ? "🔒" : "🔓"}
      </TBtn>
      <TBtn title="More options" onClick={onOpenSettings}>
        ⋯
      </TBtn>
    </div>
  );
}
