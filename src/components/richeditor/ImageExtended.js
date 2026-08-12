"use client";

import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import ImageContextMenu from "./ImageContextMenu";
import ImageCropOverlay from "./ImageCropOverlay";
import { cropContainerStyle, cropImageStyle, figureWrapStyle, hasCrop, plainImageStyle } from "./imageStyle";
import ImageSettingsPanel from "./ImageSettingsPanel";
import ImageToolbar from "./ImageToolbar";
import { uploadRichMedia } from "./uploadMedia";

const MAX_INITIAL_WIDTH = 480;

function ImageView({ node, updateAttributes, selected, editor, getPos, deleteNode }) {
  const attrs = node.attrs;
  const [panel, setPanel] = useState(null); // null | 'settings' | 'crop'
  const [editingCaption, setEditingCaption] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // {x, y}
  const [lockAspect, setLockAspect] = useState(true);
  const wrapperRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragState = useRef(null);

  // Measure a freshly-inserted (or replaced) image's natural size once, and pick
  // a sensible initial display size from it — every other control builds on this.
  useEffect(() => {
    if (attrs.naturalWidth || !attrs.src) return;
    const img = new window.Image();
    img.onload = () => {
      // A brand-new insert has neither width nor height yet — pick both from
      // natural size (capped). Content saved by the previous version of this
      // editor may already have a `width` with no `height` — in that case derive
      // height from the *existing* width's implied scale, not a fresh one, so
      // the image doesn't suddenly stretch/squish on reload.
      let width = attrs.width;
      let height = attrs.height;
      if (!width) {
        const scale = img.naturalWidth > MAX_INITIAL_WIDTH ? MAX_INITIAL_WIDTH / img.naturalWidth : 1;
        width = Math.round(img.naturalWidth * scale);
      }
      if (!height) {
        height = Math.round((width / img.naturalWidth) * img.naturalHeight);
      }
      updateAttributes({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, width, height });
    };
    img.src = attrs.src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.src]);

  function update(patch) {
    updateAttributes(patch);
  }

  function getContainerWidth() {
    const el = wrapperRef.current?.closest(".hm-richtext-content");
    return el ? Math.max(el.clientWidth - 24, 120) : 480;
  }

  // --- resize (all 4 corners, optional aspect lock) ---
  function startResize(corner) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = {
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: attrs.width,
        startHeight: attrs.height,
        aspect: attrs.width / (attrs.height || attrs.width),
      };
      window.addEventListener("mousemove", onResize);
      window.addEventListener("mouseup", stopResize);
    };
  }
  function onResize(e) {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const signX = d.corner.includes("e") ? 1 : -1;
    const signY = d.corner.includes("s") ? 1 : -1;
    const newWidth = Math.max(40, Math.round(d.startWidth + signX * dx));
    const newHeight = lockAspect ? Math.round(newWidth / d.aspect) : Math.max(40, Math.round(d.startHeight + signY * dy));
    update({ width: newWidth, height: newHeight });
  }
  function stopResize() {
    dragState.current = null;
    window.removeEventListener("mousemove", onResize);
    window.removeEventListener("mouseup", stopResize);
  }

  // --- size presets ---
  function setSize(w, h) {
    if (w != null) {
      const newHeight = lockAspect ? Math.round(w / (attrs.width / (attrs.height || attrs.width))) : attrs.height;
      update({ width: w, height: newHeight });
    } else if (h != null) {
      const newWidth = lockAspect ? Math.round(h * (attrs.width / (attrs.height || attrs.width))) : attrs.width;
      update({ width: newWidth, height: h });
    }
  }
  function fit() {
    if (!attrs.naturalWidth) return;
    const containerW = getContainerWidth();
    if (attrs.naturalWidth > containerW) {
      const ratio = containerW / attrs.naturalWidth;
      update({ width: containerW, height: Math.round(attrs.naturalHeight * ratio) });
    } else {
      update({ width: attrs.naturalWidth, height: attrs.naturalHeight });
    }
  }
  function fill() {
    const containerW = getContainerWidth();
    const ratio = attrs.width ? attrs.height / attrs.width : 0.75;
    update({ width: containerW, height: Math.round(containerW * ratio) });
  }
  function resetSize() {
    if (attrs.naturalWidth) update({ width: attrs.naturalWidth, height: attrs.naturalHeight, crop: null });
  }

  // --- file management ---
  function triggerReplace() {
    fileInputRef.current?.click();
  }
  async function handleReplaceFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const data = await uploadRichMedia(file);
    update({ src: data.url, fileSize: data.size, naturalWidth: null, naturalHeight: null, crop: null });
  }
  function download() {
    const a = document.createElement("a");
    a.href = attrs.src;
    a.download = attrs.alt || "image";
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  async function copyImage() {
    try {
      const res = await fetch(attrs.src);
      const blob = await res.blob();
      await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })]);
      return true;
    } catch {
      return false;
    }
  }
  async function compress() {
    const res = await fetch(attrs.src);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const maxDim = 1920;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const compressedBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.75));
    if (!compressedBlob) return;
    const file = new File([compressedBlob], "compressed.jpg", { type: "image/jpeg" });
    const data = await uploadRichMedia(file);
    update({ src: data.url, fileSize: data.size });
  }

  // --- node commands ---
  function duplicate() {
    const pos = getPos();
    editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: node.type.name, attrs: { ...attrs } }).run();
  }
  function resetAll() {
    update({
      width: attrs.naturalWidth || attrs.width,
      height: attrs.naturalHeight || attrs.height,
      rotate: 0,
      flipX: false,
      flipY: false,
      align: "center",
      wrap: "none",
      crop: null,
      padding: 0,
      margin: 0,
    });
  }

  const containerStyle = hasCrop(attrs) ? cropContainerStyle(attrs) : null;
  const imgStyle = hasCrop(attrs) ? cropImageStyle(attrs) : plainImageStyle(attrs);

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className="hm-image-node"
      data-wrap={attrs.wrap}
      style={figureWrapStyle(attrs)}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div className="relative" style={{ width: attrs.width ? `${attrs.width}px` : "auto" }}>
        {panel === "crop" ? (
          <ImageCropOverlay
            src={attrs.src}
            naturalWidth={attrs.naturalWidth}
            naturalHeight={attrs.naturalHeight}
            initialCrop={attrs.crop}
            onApply={(crop) => {
              update({ crop });
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
        ) : containerStyle ? (
          <div style={containerStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attrs.src} alt={attrs.alt || ""} title={attrs.title || ""} style={imgStyle} />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attrs.src} alt={attrs.alt || ""} title={attrs.title || ""} style={imgStyle} className="rounded-lg" />
        )}

        {selected && !attrs.locked && panel !== "crop" && (
          <>
            {["nw", "ne", "sw", "se"].map((corner) => (
              <div
                key={corner}
                onMouseDown={startResize(corner)}
                className={`hm-image-resize-handle hm-image-resize-${corner}`}
                contentEditable={false}
              />
            ))}
          </>
        )}

        {selected && panel !== "crop" && (
          <div className="hm-image-toolbar-anchor">
            <ImageToolbar
              attrs={attrs}
              onUpdate={update}
              onEnterCrop={() => setPanel("crop")}
              onReplace={triggerReplace}
              onDuplicate={duplicate}
              onDelete={deleteNode}
              onOpenSettings={() => setPanel(panel === "settings" ? null : "settings")}
            />
          </div>
        )}

        {panel === "settings" && (
          <ImageSettingsPanel
            attrs={attrs}
            lockAspect={lockAspect}
            onToggleLockAspect={() => setLockAspect((v) => !v)}
            onSetSize={setSize}
            onFit={fit}
            onFill={fill}
            onResetSize={resetSize}
            onSetRotationDeg={(deg) => update({ rotate: ((deg % 360) + 360) % 360 })}
            onResetRotation={() => update({ rotate: 0, flipX: false, flipY: false })}
            onSetSpacing={(key, value) => update({ [key]: value })}
            onSetAlt={(v) => update({ alt: v })}
            onSetTitle={(v) => update({ title: v })}
            onDownload={download}
            onCopy={copyImage}
            onCompress={compress}
            onResetAll={resetAll}
            onClose={() => setPanel(null)}
          />
        )}

        {selected && !attrs.locked && (
          <button
            type="button"
            onClick={() => setEditingCaption((v) => !v)}
            className="hm-image-caption-toggle"
            contentEditable={false}
          >
            {attrs.caption ? "Edit caption" : "+ Caption"}
          </button>
        )}
        {(editingCaption || attrs.caption) && (
          <input
            value={attrs.caption || ""}
            onChange={(e) => update({ caption: e.target.value })}
            placeholder="Add a caption…"
            className="hm-image-caption-input"
            contentEditable={false}
          />
        )}

        {contextMenu && (
          <ImageContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onReplace={triggerReplace}
            onDuplicate={duplicate}
            onDelete={deleteNode}
            onDownload={download}
            onCopy={copyImage}
            onResetAll={resetAll}
            onClose={() => setContextMenu(null)}
          />
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceFile} />
      </div>
    </NodeViewWrapper>
  );
}

export const ImageExtended = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      naturalWidth: { default: null },
      naturalHeight: { default: null },
      fileSize: { default: null },
      rotate: { default: 0 },
      flipX: { default: false },
      flipY: { default: false },
      align: { default: "center" },
      wrap: { default: "none" },
      crop: { default: null },
      padding: { default: 0 },
      margin: { default: 0 },
      locked: { default: false },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.hm-image-figure",
        getAttrs: (element) => {
          const img = element.querySelector("img");
          if (!img) return false;
          const figcaption = element.querySelector("figcaption");
          const num = (v) => (v != null && v !== "" ? Number(v) : null);
          let crop = null;
          try {
            crop = element.dataset.crop ? JSON.parse(element.dataset.crop) : null;
          } catch {
            crop = null;
          }
          // Fall back to the previous (pre-image-editor-upgrade) storage format —
          // width on the figure's own style, rotation on the img's transform —
          // so images authored with that earlier version don't lose data.
          const legacyRotateMatch = img.style.transform?.match(/rotate\(([-\d.]+)deg\)/);
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: num(element.dataset.width) ?? (element.style.width ? parseInt(element.style.width, 10) : null),
            height: num(element.dataset.height),
            naturalWidth: num(element.dataset.naturalWidth),
            naturalHeight: num(element.dataset.naturalHeight),
            fileSize: num(element.dataset.fileSize),
            rotate: num(element.dataset.rotate) ?? (legacyRotateMatch ? Number(legacyRotateMatch[1]) : 0),
            flipX: element.dataset.flipX === "true",
            flipY: element.dataset.flipY === "true",
            align: element.dataset.align || "center",
            wrap: element.dataset.wrap || "none",
            crop,
            padding: num(element.dataset.padding) || 0,
            margin: num(element.dataset.margin) || 0,
            locked: element.dataset.locked === "true",
            caption: figcaption ? figcaption.textContent : "",
          };
        },
      },
      // Fallback for a bare <img> (content authored before this extension existed).
      { tag: "img[src]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs;
    const { width, height, rotate, flipX, flipY, align, wrap, crop, padding, margin, locked, caption, naturalWidth, naturalHeight, fileSize, ...rest } =
      HTMLAttributes;

    const figure = document.createElement("figure");
    figure.className = "hm-image-figure";
    figure.dataset.width = a.width ?? "";
    figure.dataset.height = a.height ?? "";
    figure.dataset.naturalWidth = a.naturalWidth ?? "";
    figure.dataset.naturalHeight = a.naturalHeight ?? "";
    figure.dataset.fileSize = a.fileSize ?? "";
    figure.dataset.rotate = a.rotate ?? 0;
    figure.dataset.flipX = a.flipX ? "true" : "false";
    figure.dataset.flipY = a.flipY ? "true" : "false";
    figure.dataset.align = a.align || "center";
    figure.dataset.wrap = a.wrap || "none";
    figure.dataset.padding = a.padding ?? 0;
    figure.dataset.margin = a.margin ?? 0;
    figure.dataset.locked = a.locked ? "true" : "false";
    if (a.crop) figure.dataset.crop = JSON.stringify(a.crop);

    Object.entries(figureWrapStyle(a)).forEach(([key, value]) => {
      if (value !== undefined) figure.style[key] = value;
    });

    const cropped = hasCrop(a);
    let imgHost = figure;
    if (cropped) {
      const container = document.createElement("div");
      container.className = "hm-image-crop-container";
      Object.entries(cropContainerStyle(a)).forEach(([key, value]) => {
        if (value !== undefined) container.style[key] = value;
      });
      figure.appendChild(container);
      imgHost = container;
    }

    const img = document.createElement("img");
    Object.entries(mergeAttributes(rest)).forEach(([key, value]) => img.setAttribute(key, value));
    const style = cropped ? cropImageStyle(a) : plainImageStyle(a);
    Object.entries(style).forEach(([key, value]) => {
      if (value !== undefined) img.style[key] = value;
    });
    imgHost.appendChild(img);

    if (a.caption) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = a.caption;
      figure.appendChild(figcaption);
    }
    return figure;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
