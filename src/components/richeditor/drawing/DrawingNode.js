"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useState } from "react";
import DrawingCanvasEditor from "./DrawingCanvasEditor";

function DrawingView({ node, updateAttributes, selected }) {
  const attrs = node.attrs;
  const [editing, setEditing] = useState(false);

  return (
    <NodeViewWrapper className="hm-drawing-node my-2" data-selected={selected ? "true" : "false"}>
      {attrs.svg ? (
        <div
          className="hm-drawing-preview"
          onDoubleClick={() => setEditing(true)}
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: attrs.svg }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="hm-drawing-empty"
          contentEditable={false}
        >
          🖊 Click to start drawing
        </button>
      )}
      {selected && attrs.svg && (
        <button type="button" onClick={() => setEditing(true)} className="hm-drawing-edit-badge" contentEditable={false}>
          ✎ Edit drawing
        </button>
      )}

      {editing && (
        <DrawingCanvasEditor
          initialShapes={attrs.shapes}
          onSave={(svg, shapes) => {
            updateAttributes({ svg, shapes });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </NodeViewWrapper>
  );
}

export const DrawingNode = Node.create({
  name: "drawing",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      svg: { default: "" },
      shapes: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.hm-drawing-figure",
        getAttrs: (element) => {
          const wrap = element.querySelector(".hm-drawing-svg-wrap");
          if (!wrap) return false;
          let shapes = null;
          try {
            shapes = element.dataset.shapes ? JSON.parse(element.dataset.shapes) : null;
          } catch {
            shapes = null;
          }
          return { svg: wrap.innerHTML, shapes };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const figure = document.createElement("figure");
    figure.className = "hm-drawing-figure";
    if (node.attrs.shapes) {
      try {
        figure.dataset.shapes = JSON.stringify(node.attrs.shapes);
      } catch {
        // if the shape graph somehow isn't serializable, still save the visible SVG
      }
    }
    const wrap = document.createElement("div");
    wrap.className = "hm-drawing-svg-wrap";
    wrap.innerHTML = node.attrs.svg || "";
    figure.appendChild(wrap);
    return figure;
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingView);
  },
});
