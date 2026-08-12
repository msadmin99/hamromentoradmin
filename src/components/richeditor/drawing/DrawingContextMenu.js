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

export default function DrawingContextMenu({ x, y, onDuplicate, onDelete, onBringToFront, onSendToBack, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-[210]" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="fixed z-[220] w-40 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-2xl"
        style={{ left: x, top: y }}
      >
        <Item
          onClick={() => {
            onBringToFront();
            onClose();
          }}
        >
          Bring to Front
        </Item>
        <Item
          onClick={() => {
            onSendToBack();
            onClose();
          }}
        >
          Send to Back
        </Item>
        <Item
          onClick={() => {
            onDuplicate();
            onClose();
          }}
        >
          Duplicate
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
