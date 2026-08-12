import { API_URL, getAccessToken } from "@/lib/api";

// Reuses the existing generic rich-content upload endpoint — despite its name it
// already accepts and stores any file type unvalidated (Backend/core/views.py
// RichImageUploadView), so images/audio/video all go through the same call.
export async function uploadRichMedia(file) {
  const formData = new FormData();
  formData.append("file", file);
  const headers = {};
  const access = getAccessToken();
  if (access) headers.Authorization = `Bearer ${access}`;
  const res = await fetch(`${API_URL}/uploads/image/`, { method: "POST", headers, body: formData });
  if (!res.ok) throw new Error("Upload failed.");
  return res.json();
}

// YouTube/Vimeo URL -> embeddable iframe URL, or null for a direct/uploaded file.
export function videoEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
