"use client";

import { useRef, useState } from "react";
import { uploadRichMedia } from "./uploadMedia";

function MenuItem({ children, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
    >
      {children}
    </button>
  );
}

export default function InsertMenu({ editor }) {
  const [open, setOpen] = useState(false);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  function close() {
    setOpen(false);
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    close();
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    close();
    if (!file) return;
    try {
      const data = await uploadRichMedia(file);
      editor.chain().focus().setImage({ src: data.url, fileSize: data.size }).run();
    } catch {
      // best-effort — leave the editor content as-is if the upload fails
    }
  }

  function insertImageFromPrompt() {
    const url = window.prompt("Image URL");
    close();
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  async function handleAudioFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    close();
    if (!file) return;
    try {
      const data = await uploadRichMedia(file);
      editor.chain().focus().insertContent({ type: "audioEmbed", attrs: { src: data.url } }).run();
    } catch {
      // best-effort
    }
  }

  function insertAudioFromUrl() {
    const url = window.prompt("Audio URL (MP3 or other direct link)");
    close();
    if (url) editor.chain().focus().insertContent({ type: "audioEmbed", attrs: { src: url } }).run();
  }

  async function handleVideoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    close();
    if (!file) return;
    try {
      const data = await uploadRichMedia(file);
      editor.chain().focus().insertContent({ type: "videoEmbed", attrs: { src: data.url } }).run();
    } catch {
      // best-effort
    }
  }

  function insertVideoFromUrl() {
    const url = window.prompt("Video URL (YouTube, Vimeo, or a direct link)");
    close();
    if (url) editor.chain().focus().insertContent({ type: "videoEmbed", attrs: { src: url } }).run();
  }

  function insertLink() {
    const url = window.prompt("Link URL");
    close();
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }

  function insertHorizontalRule() {
    editor.chain().focus().setHorizontalRule().run();
    close();
  }

  function insertDrawing() {
    editor.chain().focus().insertContent({ type: "drawing", attrs: { svg: "", shapes: null } }).run();
    close();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="hm-toolbar-btn text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
      >
        + Insert ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-2xl">
            <MenuItem onClick={insertTable}>▦ Table</MenuItem>
            <MenuItem onClick={insertDrawing}>🖊 Drawing</MenuItem>
            <MenuItem onClick={() => imageInputRef.current?.click()}>🖼 Image — Upload</MenuItem>
            <MenuItem onClick={insertImageFromPrompt}>🖼 Image — URL</MenuItem>
            <MenuItem onClick={() => audioInputRef.current?.click()}>🔊 Audio — Upload MP3</MenuItem>
            <MenuItem onClick={insertAudioFromUrl}>🔊 Audio — External link</MenuItem>
            <MenuItem onClick={() => videoInputRef.current?.click()}>🎬 Video — Upload</MenuItem>
            <MenuItem onClick={insertVideoFromUrl}>🎬 Video — YouTube / Vimeo / URL</MenuItem>
            <MenuItem onClick={insertLink}>🔗 Hyperlink</MenuItem>
            <MenuItem onClick={insertHorizontalRule}>― Horizontal Line</MenuItem>
          </div>
        </>
      )}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFile} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
    </div>
  );
}
