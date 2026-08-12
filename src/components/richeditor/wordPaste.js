"use client";

/** Word's HTML clipboard payload carries a lot of Office-specific cruft
 * (mso-* inline styles, conditional comments, <o:p> paragraph markers, an
 * <xml> metadata block) that doesn't map onto anything TipTap's schema
 * understands — stripped here before ProseMirror parses the pasted HTML, so
 * paragraphs/tables/lists come through cleaner. Skipped entirely for
 * non-Word paste (cheap sniff first) so normal paste is untouched. */
export function cleanWordHTML(html) {
  if (!html) return html;
  const looksLikeWord = /mso-|<o:p|xmlns:o=|<!\[if/i.test(html);
  if (!looksLikeWord) return html;
  return html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<xml>[\s\S]*?<\/xml>/gi, "")
    .replace(/<\/?o:p>/gi, "")
    .replace(/style="([^"]*)"/gi, (match, styleValue) => {
      // Parsed per-declaration rather than boundary-matched — an mso-*
      // property at the very start or end of the attribute (no leading
      // whitespace/semicolon to anchor on) would otherwise survive a naive
      // regex strip.
      const kept = styleValue
        .split(";")
        .map((decl) => decl.trim())
        .filter((decl) => decl && !/^mso-/i.test(decl));
      return kept.length ? `style="${kept.join("; ")}"` : "";
    })
    .replace(/\sclass="Mso[a-zA-Z0-9]*"/gi, "");
}

function dataUrlToFile(dataUrl, filename) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/** Pasted <img src="data:..."> tags (Word's clipboard image format) bypass
 * the app's normal upload pipeline entirely, leaving a bloated inline base64
 * blob in the saved HTML. This walks the document AFTER paste completes
 * (base64→upload is inherently async, which a synchronous paste transform
 * can't do) and swaps each one for a properly-uploaded, storage-backed URL.
 *
 * Important, honest limitation: this cannot increase image resolution
 * beyond what Word's OS clipboard supplied in the first place — Word's
 * clipboard HTML only ever contains a low-resolution preview of the
 * original picture, not the source file. No code running in a browser tab
 * can retrieve higher-resolution bytes than what's already on the
 * clipboard. This step only stops the low-res copy from being inlined as a
 * permanent base64 blob — for guaranteed full quality, drag the original
 * image file into the editor instead (that path already preserves it
 * exactly, with zero recompression). */
export async function uploadPastedBase64Images(editor, uploadRichMedia, onUploaded) {
  const targets = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && typeof node.attrs.src === "string" && node.attrs.src.startsWith("data:image/")) {
      targets.push({ pos, src: node.attrs.src });
    }
  });
  if (targets.length === 0) return;

  let uploadedCount = 0;
  for (const { pos, src } of targets) {
    const file = dataUrlToFile(src, `pasted-image-${Date.now()}-${pos}.png`);
    if (!file) continue;
    try {
      const data = await uploadRichMedia(file);
      const current = editor.state.doc.nodeAt(pos);
      if (current && current.attrs.src === src) {
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, src: data.url, fileSize: data.size }));
        uploadedCount += 1;
      }
    } catch {
      // best-effort — leave the base64 image in place if the upload fails
    }
  }
  if (uploadedCount > 0) onUploaded?.(uploadedCount);
}
