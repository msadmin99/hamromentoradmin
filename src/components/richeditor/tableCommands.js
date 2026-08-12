// Table Layout commands that need direct ProseMirror document access — too
// specific to be built-in @tiptap/extension-table commands, so implemented
// here as small custom transactions, called via `editor.commands.command(...)`.

function findEnclosingTable(state) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "table") return { node, pos: $from.before(depth) };
  }
  return null;
}

function columnCount(tableNode) {
  const firstRow = tableNode.firstChild;
  if (!firstRow) return 0;
  let count = 0;
  firstRow.forEach((cell) => {
    count += cell.attrs.colspan || 1;
  });
  return count;
}

/** Set every cell's colwidth to an equal share of the table's total width (or
 * clear it back to content-driven sizing when `equal` is false — AutoFit). */
export function distributeColumns(equal = true) {
  return ({ state, tr, dispatch }) => {
    const table = findEnclosingTable(state);
    if (!table) return false;
    const cols = columnCount(table.node);
    if (!cols) return false;
    // A fixed, consistent per-column width — the exact value matters less than
    // every column ending up equal; the user can still drag-resize afterward.
    const equalWidth = 140;
    if (dispatch) {
      table.node.descendants((node, pos) => {
        if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
          tr.setNodeAttribute(table.pos + 1 + pos, "colwidth", equal ? [equalWidth] : null);
        }
      });
    }
    return true;
  };
}

/** Clear every row's custom height back to content-driven sizing. */
export function distributeRows() {
  return ({ state, tr, dispatch }) => {
    const table = findEnclosingTable(state);
    if (!table) return false;
    if (dispatch) {
      table.node.descendants((node, pos) => {
        if (node.type.name === "tableRow") {
          tr.setNodeAttribute(table.pos + 1 + pos, "height", null);
        }
      });
    }
    return true;
  };
}

/** Sort the table's rows by the text content of the column the cursor is
 * currently in. The first row is left in place if it's a header row (any
 * tableHeader cells) so sorting never displaces column titles. */
export function sortTableByCurrentColumn(direction) {
  return ({ state, tr, dispatch }) => {
    const table = findEnclosingTable(state);
    if (!table) return false;

    const { $from } = state.selection;
    let cellIndex = -1;
    let rowDepth = -1;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "tableRow") {
        rowDepth = depth;
        break;
      }
    }
    if (rowDepth === -1) return false;
    const row = $from.node(rowDepth);
    const cellStart = $from.start(rowDepth);
    let offset = cellStart;
    row.forEach((cell, cellOffset, index) => {
      if (offset <= $from.pos && $from.pos <= offset + cell.nodeSize) cellIndex = index;
      offset += cell.nodeSize;
    });
    if (cellIndex === -1) return false;

    const rows = [];
    table.node.forEach((rowNode) => rows.push(rowNode));
    const hasHeaderRow = rows[0]?.child(0)?.type.name === "tableHeader";
    const headerRow = hasHeaderRow ? rows[0] : null;
    const bodyRows = hasHeaderRow ? rows.slice(1) : rows;

    const withText = bodyRows.map((r) => {
      const cell = r.maybeChild(cellIndex);
      const text = cell ? cell.textContent.trim() : "";
      return { row: r, text };
    });
    withText.sort((a, b) => {
      const na = Number(a.text);
      const nb = Number(b.text);
      const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb);
      const cmp = bothNumeric ? na - nb : a.text.localeCompare(b.text);
      return direction === "desc" ? -cmp : cmp;
    });

    if (dispatch) {
      const newRows = [...(headerRow ? [headerRow] : []), ...withText.map((w) => w.row)];
      const newTable = table.node.type.create(table.node.attrs, newRows, table.node.marks);
      tr.replaceWith(table.pos, table.pos + table.node.nodeSize, newTable);
    }
    return true;
  };
}
