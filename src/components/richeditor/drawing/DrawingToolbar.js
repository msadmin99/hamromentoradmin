"use client";

import { SHAPE_GROUPS } from "./shapeFactory";

const FILL_COLORS = ["#93c5fd", "#fca5a5", "#86efac", "#fde68a", "#d8b4fe", "#f9a8d4", "#e5e7eb", "transparent"];
const STROKE_COLORS = ["#1d4ed8", "#b91c1c", "#15803d", "#a16207", "#7e22ce", "#be185d", "#111827"];
const DASH_PRESETS = [
  { key: "solid", label: "Solid", value: null },
  { key: "dashed", label: "Dashed", value: [10, 6] },
  { key: "dotted", label: "Dotted", value: [2, 4] },
];
const FONT_FAMILIES = ["Inter", "Georgia", "Times New Roman", "Arial", "Courier New"];

function Section({ title, children }) {
  return (
    <div className="hm-drawing-panel-section">
      <p className="hm-drawing-panel-title">{title}</p>
      {children}
    </div>
  );
}

function SwatchRow({ colors, current, onPick }) {
  return (
    <div className="flex flex-wrap gap-1">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onPick(c)}
          className={`h-5 w-5 rounded border ${current === c ? "ring-2 ring-brand-blue" : "border-[var(--color-border)]"}`}
          style={{ background: c === "transparent" ? "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50%/8px 8px" : c }}
        />
      ))}
    </div>
  );
}

export default function DrawingToolbar({
  selected,
  drawMode,
  onAddShape,
  onUpdateSelected,
  onBringForward,
  onBringToFront,
  onSendBackward,
  onSendToBack,
  onToggleLock,
  onDuplicate,
  onDelete,
  onGroup,
  onUngroup,
  onToggleDrawMode,
}) {
  const isText = selected?.type === "textbox";
  const isMulti = selected?.type === "activeselection";
  const isGroup = selected?.type === "group";
  const locked = !!selected?.lockMovementX;

  return (
    <div className="hm-drawing-toolbar">
      <Section title="Insert shape">
        {SHAPE_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="mb-1 text-[10px] font-semibold text-[var(--color-text-muted)]">{group.label}</p>
            <div className="flex flex-wrap gap-1">
              {group.shapes.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  title={s.label}
                  onClick={() => onAddShape(s.key)}
                  className="rounded border border-[var(--color-border)] px-1.5 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onAddShape("textbox")} className="hm-btn-outline flex-1 px-2 py-1.5 text-[11px]">
            + Text Box
          </button>
          <button
            type="button"
            onClick={onToggleDrawMode}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
              drawMode ? "border-brand-blue bg-brand-blue text-white" : "border-[var(--color-border)] text-[var(--color-text-muted)]"
            }`}
          >
            ✏ Freehand
          </button>
        </div>
      </Section>

      {selected && (
        <>
          <Section title="Arrange">
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={onBringToFront} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                Bring to Front
              </button>
              <button type="button" onClick={onBringForward} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                Bring Forward
              </button>
              <button type="button" onClick={onSendBackward} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                Send Backward
              </button>
              <button type="button" onClick={onSendToBack} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                Send to Back
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <button type="button" onClick={onDuplicate} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                ⧉ Duplicate
              </button>
              <button type="button" onClick={onDelete} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                🗑 Delete
              </button>
              <button
                type="button"
                onClick={onToggleLock}
                className={`px-1.5 py-1 text-[10px] font-semibold rounded-lg border ${
                  locked ? "border-brand-blue bg-brand-blue text-white" : "hm-btn-outline"
                }`}
              >
                {locked ? "🔒 Locked" : "🔓 Lock"}
              </button>
              {isMulti ? (
                <button type="button" onClick={onGroup} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                  Group
                </button>
              ) : (
                isGroup && (
                  <button type="button" onClick={onUngroup} className="hm-btn-outline px-1.5 py-1 text-[10px]">
                    Ungroup
                  </button>
                )
              )}
            </div>
          </Section>

          {!locked && (
            <>
              <Section title="Fill color">
                <SwatchRow colors={FILL_COLORS} current={selected.fill} onPick={(c) => onUpdateSelected({ fill: c })} />
              </Section>
              <Section title="Border color">
                <SwatchRow colors={STROKE_COLORS} current={selected.stroke} onPick={(c) => onUpdateSelected({ stroke: c })} />
              </Section>
              <Section title="Border thickness">
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={selected.strokeWidth || 0}
                  onChange={(e) => onUpdateSelected({ strokeWidth: Number(e.target.value) })}
                  className="w-full"
                />
              </Section>
              <Section title="Dash style">
                <div className="flex gap-1">
                  {DASH_PRESETS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => onUpdateSelected({ strokeDashArray: d.value })}
                      className="hm-btn-outline flex-1 px-1.5 py-1 text-[10px]"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Transparency">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.opacity ?? 1}
                  onChange={(e) => onUpdateSelected({ opacity: Number(e.target.value) })}
                  className="w-full"
                />
              </Section>
              <Section title="Shadow">
                <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={!!selected.shadow}
                    onChange={(e) =>
                      onUpdateSelected({
                        shadow: e.target.checked ? { color: "rgba(0,0,0,0.35)", blur: 8, offsetX: 3, offsetY: 3 } : null,
                      })
                    }
                  />
                  Drop shadow
                </label>
              </Section>

              {isText && (
                <Section title="Text">
                  <select
                    value={selected.fontFamily || "Inter"}
                    onChange={(e) => onUpdateSelected({ fontFamily: e.target.value })}
                    className="hm-input mb-1.5 text-xs"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={8}
                    max={96}
                    value={selected.fontSize || 18}
                    onChange={(e) => onUpdateSelected({ fontSize: Number(e.target.value) })}
                    className="hm-input mb-1.5 text-xs"
                  />
                  <div className="mb-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSelected({ fontWeight: selected.fontWeight === "bold" ? "normal" : "bold" })}
                      className={`flex-1 rounded border px-1.5 py-1 text-[11px] font-bold ${selected.fontWeight === "bold" ? "bg-brand-blue text-white" : "hm-btn-outline"}`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSelected({ fontStyle: selected.fontStyle === "italic" ? "normal" : "italic" })}
                      className={`flex-1 rounded border px-1.5 py-1 text-[11px] italic ${selected.fontStyle === "italic" ? "bg-brand-blue text-white" : "hm-btn-outline"}`}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSelected({ underline: !selected.underline })}
                      className={`flex-1 rounded border px-1.5 py-1 text-[11px] underline ${selected.underline ? "bg-brand-blue text-white" : "hm-btn-outline"}`}
                    >
                      U
                    </button>
                  </div>
                  <div className="mb-1.5 flex gap-1">
                    {["left", "center", "right", "justify"].map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => onUpdateSelected({ textAlign: a })}
                        className={`flex-1 rounded border px-1 py-1 text-[10px] ${selected.textAlign === a ? "bg-brand-blue text-white" : "hm-btn-outline"}`}
                      >
                        {a[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="mb-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSelected({ direction: selected.direction === "rtl" ? "ltr" : "rtl" })}
                      className="hm-btn-outline flex-1 px-1.5 py-1 text-[10px]"
                    >
                      {selected.direction === "rtl" ? "RTL" : "LTR"}
                    </button>
                    <select
                      value={selected.originY || "top"}
                      onChange={(e) => onUpdateSelected({ originY: e.target.value })}
                      className="hm-input flex-1 text-[10px]"
                    >
                      <option value="top">Top</option>
                      <option value="center">Middle</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                </Section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
