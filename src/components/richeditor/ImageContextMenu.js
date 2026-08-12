"use client";

function Item({ onClick, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
    >
      {children}
    </button>
  );
}

export default function ImageContextMenu({ x, y, onReplace, onDuplicate, onDelete, onDownload, onCopy, onResetAll, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="fixed z-50 w-40 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-2xl"
        style={{ left: x, top: y }}
        contentEditable={false}
      >
        <Item
          onClick={() => {
            onReplace();
            onClose();
          }}
        >
          Replace image
        </Item>
        <Item
          onClick={() => {
            onDuplicate();
            onClose();
          }}
        >
          Duplicate
        </Item>
        <Item
          onClick={() => {
            onDownload();
            onClose();
          }}
        >
          Download
        </Item>
        <Item
          onClick={() => {
            onCopy();
            onClose();
          }}
        >
          Copy image
        </Item>
        <Item
          onClick={() => {
            onResetAll();
            onClose();
          }}
        >
          Reset all changes
        </Item>
        <div className="my-1 border-t border-[var(--color-border)]" />
        <Item
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <span className="font-semibold text-brand-red">Delete</span>
        </Item>
      </div>
    </>
  );
}
