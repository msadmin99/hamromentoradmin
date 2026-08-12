// Shared CSS math for the image node — used by both the live React NodeView
// (ImageView) and ImageExtended's renderHTML() (plain DOM, produces the saved
// HTML that the student Frontend renders as-is), so the two never drift apart.

export function imgTransform(attrs) {
  const rotate = attrs.rotate || 0;
  const sx = attrs.flipX ? -1 : 1;
  const sy = attrs.flipY ? -1 : 1;
  return `rotate(${rotate}deg) scaleX(${sx}) scaleY(${sy})`;
}

/** True when a non-destructive crop is active (a crop rect narrower than the full image). */
export function hasCrop(attrs) {
  const c = attrs.crop;
  return !!(c && c.width < 100 - 0.01 || (c && c.height < 100 - 0.01) || (c && (c.x > 0.01 || c.y > 0.01)));
}

/** Outer clipping container size/position for a cropped image. Width is a
 * concrete px value (capped responsively by max-width:100% via CSS) but height
 * is derived from aspect-ratio rather than a fixed px value, and the inner
 * image below is positioned/sized in percentages — together that keeps the
 * crop window's proportions correct even when the container shrinks on a
 * narrow viewport, instead of only the width shrinking. */
export function cropContainerStyle(attrs) {
  return {
    width: `${attrs.width}px`,
    height: "auto",
    aspectRatio: `${attrs.width} / ${attrs.height}`,
    maxWidth: "100%",
    overflow: "hidden",
    position: "relative",
  };
}

/** The <img> itself, scaled + offset (in %, so it stays correct at any
 * container size) so only the cropped region shows inside the container. */
export function cropImageStyle(attrs) {
  const c = attrs.crop;
  const cw = Math.max(c.width, 1) / 100;
  const ch = Math.max(c.height, 1) / 100;
  const fullWidthPct = 100 / cw;
  const fullHeightPct = 100 / ch;
  const offsetLeftPct = -(c.x / 100) * fullWidthPct;
  const offsetTopPct = -(c.y / 100) * fullHeightPct;
  return {
    position: "absolute",
    left: `${offsetLeftPct}%`,
    top: `${offsetTopPct}%`,
    width: `${fullWidthPct}%`,
    height: `${fullHeightPct}%`,
    maxWidth: "none",
    transform: imgTransform(attrs),
  };
}

/** Plain (uncropped) <img> sizing. Uses aspect-ratio + height:auto (instead of
 * a fixed px height) so the CHOSEN width:height ratio — whether it matches the
 * image's natural ratio or was deliberately stretched via an unlocked aspect
 * ratio — still scales down correctly together once max-width:100% shrinks it
 * on a narrow viewport, instead of only the width shrinking and the image
 * looking squished. */
export function plainImageStyle(attrs) {
  return {
    width: `${attrs.width}px`,
    height: "auto",
    aspectRatio: attrs.height ? `${attrs.width} / ${attrs.height}` : undefined,
    maxWidth: "100%",
    transform: imgTransform(attrs),
  };
}

/** Wrap/align styling for the outer <figure> — CSS float for text-wrap, or block + margin for alignment. */
export function figureWrapStyle(attrs) {
  const style = { padding: attrs.padding ? `${attrs.padding}px` : undefined, margin: undefined };
  const m = attrs.margin || 0;
  if (attrs.wrap === "left") {
    style.float = "left";
    style.margin = `${m}px ${m}px ${m}px 0`;
  } else if (attrs.wrap === "right") {
    style.float = "right";
    style.margin = `${m}px 0 ${m}px ${m}px`;
  } else if (attrs.wrap === "inline") {
    style.display = "inline-block";
    style.verticalAlign = "middle";
    style.margin = `${m}px`;
  } else {
    style.display = "block";
    if (attrs.align === "left") style.margin = `${m}px auto ${m}px 0`;
    else if (attrs.align === "right") style.margin = `${m}px 0 ${m}px auto`;
    else style.margin = `${m}px auto`;
  }
  return style;
}

export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
