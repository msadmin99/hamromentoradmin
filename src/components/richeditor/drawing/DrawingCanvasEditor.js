"use client";

import { useEffect, useRef, useState } from "react";
import { createShape } from "./shapeFactory";
import DrawingToolbar from "./DrawingToolbar";
import DrawingContextMenu from "./DrawingContextMenu";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const HISTORY_LIMIT = 50;

export default function DrawingCanvasEditor({ initialShapes, onSave, onCancel }) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null); // the dynamically-imported `fabric` module
  const canvasRef = useRef(null); // the fabric.Canvas instance
  const clipboardRef = useRef(null);
  const historyRef = useRef({ stack: [], index: -1, suspended: false });

  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectionTick, setSelectionTick] = useState(0); // bump to force the toolbar to re-read live object props
  const [drawMode, setDrawMode] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    let disposed = false;
    import("fabric").then((fabric) => {
      if (disposed) return;
      fabricRef.current = fabric;
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      });
      canvasRef.current = canvas;

      const refreshSelection = () => {
        setSelected(canvas.getActiveObject() || null);
        setSelectionTick((t) => t + 1);
      };
      canvas.on("selection:created", refreshSelection);
      canvas.on("selection:updated", refreshSelection);
      canvas.on("selection:cleared", () => setSelected(null));
      canvas.on("object:modified", () => {
        refreshSelection();
        pushHistory();
      });
      canvas.on("object:added", () => pushHistory());
      canvas.on("object:removed", () => pushHistory());
      canvas.on("mouse:down", (opt) => {
        if (opt.e.button !== 2) setContextMenu(null);
      });
      // preventDefault on 'mousedown' does not stop the browser's own context
      // menu — that needs its own 'contextmenu' listener on the canvas element.
      canvasElRef.current.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const target = canvas.findTarget ? canvas.findTarget(e) : canvas.getActiveObject();
        if (target) canvas.setActiveObject(target);
        if (canvas.getActiveObject()) setContextMenu({ x: e.clientX, y: e.clientY });
      });

      function pushHistory() {
        if (historyRef.current.suspended) return;
        const snapshot = canvas.toJSON();
        const h = historyRef.current;
        const next = h.stack.slice(0, h.index + 1);
        next.push(snapshot);
        if (next.length > HISTORY_LIMIT) next.shift();
        historyRef.current = { ...h, stack: next, index: next.length - 1 };
      }

      const loadInitial = async () => {
        if (initialShapes) {
          historyRef.current.suspended = true;
          await canvas.loadFromJSON(initialShapes);
          canvas.renderAll();
          historyRef.current.suspended = false;
        }
        pushHistory();
        setReady(true);
      };
      loadInitial();
    });

    return () => {
      disposed = true;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function withCanvas(fn) {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (canvas && fabric) fn(canvas, fabric);
  }

  function addShape(type) {
    withCanvas((canvas, fabric) => {
      const obj = createShape(fabric, type);
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    });
  }

  function updateSelected(props) {
    withCanvas((canvas) => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      obj.set(props);
      obj.setCoords();
      canvas.requestRenderAll();
      setSelectionTick((t) => t + 1);
    });
  }

  function bringForward() {
    withCanvas((canvas) => {
      const obj = canvas.getActiveObject();
      if (obj) canvas.bringObjectForward(obj);
    });
  }
  function bringToFront() {
    withCanvas((canvas) => {
      const obj = canvas.getActiveObject();
      if (obj) canvas.bringObjectToFront(obj);
    });
  }
  function sendBackward() {
    withCanvas((canvas) => {
      const obj = canvas.getActiveObject();
      if (obj) canvas.sendObjectBackwards(obj);
    });
  }
  function sendToBack() {
    withCanvas((canvas) => {
      const obj = canvas.getActiveObject();
      if (obj) canvas.sendObjectToBack(obj);
    });
  }

  function toggleLock() {
    withCanvas((canvas) => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      const locked = !obj.lockMovementX;
      obj.set({
        lockMovementX: locked,
        lockMovementY: locked,
        lockRotation: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        hasControls: !locked,
      });
      canvas.requestRenderAll();
      setSelectionTick((t) => t + 1);
    });
  }

  async function duplicateSelected() {
    const canvas = canvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    const cloned = await obj.clone();
    cloned.set({ left: (obj.left || 0) + 24, top: (obj.top || 0) + 24 });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
  }

  function deleteSelected() {
    withCanvas((canvas) => {
      const objs = canvas.getActiveObjects();
      objs.forEach((o) => canvas.remove(o));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    });
  }

  function groupSelected() {
    withCanvas((canvas, fabric) => {
      const objs = canvas.getActiveObjects();
      if (objs.length < 2) return;
      canvas.discardActiveObject();
      objs.forEach((o) => canvas.remove(o));
      const group = new fabric.Group(objs);
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
    });
  }
  function ungroupSelected() {
    withCanvas((canvas) => {
      const obj = canvas.getActiveObject();
      if (!obj || obj.type !== "group") return;
      const items = obj.removeAll();
      canvas.remove(obj);
      items.forEach((item) => canvas.add(item));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    });
  }

  function toggleDrawMode() {
    withCanvas((canvas, fabric) => {
      const next = !drawMode;
      canvas.isDrawingMode = next;
      if (next) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.color = "#1d4ed8";
      }
      setDrawMode(next);
    });
  }

  function undo() {
    withCanvas((canvas) => {
      const h = historyRef.current;
      if (h.index <= 0) return;
      h.suspended = true;
      const snapshot = h.stack[h.index - 1];
      canvas.loadFromJSON(snapshot).then(() => {
        canvas.renderAll();
        h.suspended = false;
        historyRef.current = { ...h, index: h.index - 1 };
      });
    });
  }
  function redo() {
    withCanvas((canvas) => {
      const h = historyRef.current;
      if (h.index >= h.stack.length - 1) return;
      h.suspended = true;
      const snapshot = h.stack[h.index + 1];
      canvas.loadFromJSON(snapshot).then(() => {
        canvas.renderAll();
        h.suspended = false;
        historyRef.current = { ...h, index: h.index + 1 };
      });
    });
  }

  async function copySelected() {
    const canvas = canvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    clipboardRef.current = await obj.clone();
  }
  async function pasteClipboard() {
    const canvas = canvasRef.current;
    if (!canvas || !clipboardRef.current) return;
    const cloned = await clipboardRef.current.clone();
    canvas.discardActiveObject();
    cloned.set({ left: (cloned.left || 0) + 24, top: (cloned.top || 0) + 24 });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
  }

  useEffect(() => {
    function onKeyDown(e) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const activeObj = canvas.getActiveObject();
      if (activeObj?.isEditing) return; // typing inside a text box — don't hijack keys

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
      } else if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        copySelected().then(deleteSelected);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (mod && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const objs = canvas.getObjects();
        if (objs.length) {
          const fabric = fabricRef.current;
          canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
          canvas.requestRenderAll();
        }
      } else if (mod && e.key.toLowerCase() === "b" && activeObj?.type === "textbox") {
        e.preventDefault();
        updateSelected({ fontWeight: activeObj.fontWeight === "bold" ? "normal" : "bold" });
      } else if (mod && e.key.toLowerCase() === "i" && activeObj?.type === "textbox") {
        e.preventDefault();
        updateSelected({ fontStyle: activeObj.fontStyle === "italic" ? "normal" : "italic" });
      } else if (mod && e.key.toLowerCase() === "u" && activeObj?.type === "textbox") {
        e.preventDefault();
        updateSelected({ underline: !activeObj.underline });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode]);

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    const svg = canvas.toSVG();
    const shapes = canvas.toJSON();
    onSave(svg, shapes);
  }

  return (
    <div className="hm-drawing-modal" contentEditable={false}>
      <div className="hm-drawing-modal-inner">
        <div className="hm-drawing-modal-header">
          <p className="text-sm font-bold text-[var(--color-text)]">Drawing</p>
          <div className="flex gap-2">
            <button type="button" onClick={undo} className="hm-btn-outline px-3 py-1.5 text-xs">
              ↶ Undo
            </button>
            <button type="button" onClick={redo} className="hm-btn-outline px-3 py-1.5 text-xs">
              ↷ Redo
            </button>
            <button type="button" onClick={onCancel} className="hm-btn-outline px-3 py-1.5 text-xs">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="hm-btn-primary px-3 py-1.5 text-xs">
              Save drawing
            </button>
          </div>
        </div>

        <div className="hm-drawing-modal-body">
          <DrawingToolbar
            selected={selected}
            selectionTick={selectionTick}
            drawMode={drawMode}
            onAddShape={addShape}
            onUpdateSelected={updateSelected}
            onBringForward={bringForward}
            onBringToFront={bringToFront}
            onSendBackward={sendBackward}
            onSendToBack={sendToBack}
            onToggleLock={toggleLock}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onGroup={groupSelected}
            onUngroup={ungroupSelected}
            onToggleDrawMode={toggleDrawMode}
          />
          <div className="hm-drawing-canvas-wrap">
            {!ready && <p className="p-4 text-xs text-[var(--color-text-muted)]">Loading canvas…</p>}
            <canvas ref={canvasElRef} />
          </div>
        </div>
      </div>

      {contextMenu && (
        <DrawingContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
