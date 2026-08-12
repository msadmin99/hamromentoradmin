import { Extension } from "@tiptap/core";

const STEP = 24;
const MAX_LEVEL = 8;

export const IndentExtension = Extension.create({
  name: "indent",

  addOptions() {
    return { types: ["paragraph", "heading"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const margin = parseInt(element.style.marginLeft || "0", 10);
              return margin ? Math.round(margin / STEP) : 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {};
              return { style: `margin-left: ${attributes.indent * STEP}px` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      increaseIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const level = Math.min((node.attrs.indent || 0) + 1, MAX_LEVEL);
              if (dispatch) tr.setNodeAttribute(pos, "indent", level);
              changed = true;
            }
          });
          return changed;
        },
      decreaseIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const level = Math.max((node.attrs.indent || 0) - 1, 0);
              if (dispatch) tr.setNodeAttribute(pos, "indent", level);
              changed = true;
            }
          });
          return changed;
        },
    };
  },
});
