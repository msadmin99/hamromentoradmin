"use client";

import { useRef, useState } from "react";

const ASPECT_PRESETS = [
  { key: "free", label: "Free", ratio: null },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
  { key: "3:2", label: "3:2", ratio: 3 / 2 },
];

const MAX_PREVIEW_W = 480;
const MAX_PREVIEW_H = 360;
const MIN_RECT = 24;

export default function ImageCropOverlay({ src, naturalWidth, naturalHeight, initialCrop, onApply, onCancel }) {
  const natW = naturalWidth || 800;
  const natH = naturalHeight || 600;
  const scale = Math.min(MAX_PREVIEW_W / natW, MAX_PREVIEW_H / natH, 1);
  const previewW = Math.round(natW * scale);
  const previewH = Math.round(natH * scale);

  const [rect, setRect] = useState(() => {
    if (initialCrop) {
      return {
        x: (initialCrop.x / 100) * previewW,
        y: (initialCrop.y / 100) * previewH,
        w: (initialCrop.width / 100) * previewW,
        h: (initialCrop.height / 100) * previewH,
      };
    }
    return { x: 0, y: 0, w: previewW, h: previewH };
  });
  const [preset, setPreset] = useState("free");
  const dragRef = useRef(null);

  function clampRect(r) {
    let { x, y, w, h } = r;
    w = Math.min(Math.max(w, MIN_RECT), previewW);
    h = Math.min(Math.max(h, MIN_RECT), previewH);
    x = Math.min(Math.max(x, 0), previewW - w);
    y = Math.min(Math.max(y, 0), previewH - h);
    return { x, y, w, h };
  }

  function startDrag(mode) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startRect: { ...rect } };
      window.addEventListener("mousemove", onDrag);
      window.addEventListener("mouseup", stopDrag);
    };
  }

  function onDrag(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const ratio = ASPECT_PRESETS.find((p) => p.key === preset)?.ratio;
    let next = { ...d.startRect };

    if (d.mode === "move") {
      next.x = d.startRect.x + dx;
      next.y = d.startRect.y + dy;
    } else {
      const east = d.mode.includes("e");
      const south = d.mode.includes("s");
      if (east) next.w = d.startRect.w + dx;
      else {
        next.x = d.startRect.x + dx;
        next.w = d.startRect.w - dx;
      }
      if (south) next.h = d.startRect.h + dy;
      else {
        next.y = d.startRect.y + dy;
        next.h = d.startRect.h - dy;
      }
      if (ratio) {
        next.h = next.w / ratio;
        if (!south) next.y = d.startRect.y + d.startRect.h - next.h;
      }
    }
    setRect(clampRect(next));
  }

  function stopDrag() {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", stopDrag);
  }

  function applyPreset(p) {
    setPreset(p.key);
    if (!p.ratio) return;
    setRect((r) => clampRect({ ...r, h: r.w / p.ratio }));
  }

  function apply() {
    onApply({
      x: (rect.x / previewW) * 100,
      y: (rect.y / previewH) * 100,
      width: (rect.w / previewW) * 100,
      height: (rect.h / previewH) * 100,
    });
  }

  const handles = ["nw", "ne", "sw", "se"];

  return (
    <div className="hm-image-crop-editor" contentEditable={false}>
      <div className="hm-image-crop-toolbar">
        <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Crop:</span>
        {ASPECT_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p)}
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              preset === p.key ? "bg-brand-blue text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto flex gap-1.5">
          <button type="button" onClick={apply} className="hm-btn-primary px-2 py-1 text-[10px]">
            Apply
          </button>
          <button type="button" onClick={onCancel} className="hm-btn-outline px-2 py-1 text-[10px]">
            Cancel
          </button>
        </span>
      </div>
      <div className="hm-image-crop-stage" style={{ width: previewW, height: previewH }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} style={{ width: previewW, height: previewH }} />
        {/* the crop rect's own box-shadow (see globals.css) darkens everything outside it —
            simpler and more robust than a separate clip-path mask layer */}
        <div
          className="hm-image-crop-rect"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          onMouseDown={startDrag("move")}
        >
          {handles.map((h) => (
            <span
              key={h}
              className={`hm-image-crop-handle hm-image-crop-handle-${h}`}
              onMouseDown={startDrag(h)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
