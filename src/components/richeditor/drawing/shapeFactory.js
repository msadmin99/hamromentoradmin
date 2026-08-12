// Shape factories for the Drawing canvas. Every function takes the already
// dynamically-imported `fabric` module (never imported at the top of this
// file — Fabric is Admin-only and loaded on demand, see DrawingCanvasEditor.js)
// and returns a ready-to-add Fabric object centered at a sensible default size.

const FILL = "#93c5fd";
const STROKE = "#1d4ed8";
const STROKE_WIDTH = 2;
const BASE = { fill: FILL, stroke: STROKE, strokeWidth: STROKE_WIDTH, left: 120, top: 100 };

function regularPolygonPoints(sides, radius) {
  const points = [];
  const step = (2 * Math.PI) / sides;
  const start = -Math.PI / 2;
  for (let i = 0; i < sides; i++) {
    const angle = start + i * step;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}

function starPoints(spikes, outerR, innerR) {
  const points = [];
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
    angle += step;
  }
  return points;
}

export const SHAPE_GROUPS = [
  {
    label: "Basic",
    shapes: [
      { key: "rectangle", label: "Rectangle" },
      { key: "roundedRectangle", label: "Rounded Rectangle" },
      { key: "circle", label: "Circle" },
      { key: "ellipse", label: "Ellipse" },
      { key: "triangle", label: "Triangle" },
      { key: "diamond", label: "Diamond" },
      { key: "pentagon", label: "Pentagon" },
      { key: "hexagon", label: "Hexagon" },
      { key: "parallelogram", label: "Parallelogram" },
      { key: "trapezoid", label: "Trapezoid" },
      { key: "star", label: "Star" },
      { key: "cloud", label: "Cloud" },
      { key: "heart", label: "Heart" },
    ],
  },
  {
    label: "Lines & Arrows",
    shapes: [
      { key: "line", label: "Line" },
      { key: "polyline", label: "Polyline" },
      { key: "arrow", label: "Arrow" },
      { key: "doubleArrow", label: "Double Arrow" },
      { key: "curvedArrow", label: "Curved Arrow" },
    ],
  },
  {
    label: "Callout",
    shapes: [{ key: "callout", label: "Callout" }],
  },
];

export function createShape(fabric, type) {
  switch (type) {
    case "rectangle":
      return new fabric.Rect({ ...BASE, width: 120, height: 80 });
    case "roundedRectangle":
      return new fabric.Rect({ ...BASE, width: 120, height: 80, rx: 14, ry: 14 });
    case "circle":
      return new fabric.Circle({ ...BASE, radius: 55 });
    case "ellipse":
      return new fabric.Ellipse({ ...BASE, rx: 70, ry: 45 });
    case "triangle":
      return new fabric.Triangle({ ...BASE, width: 110, height: 100 });
    case "diamond":
      return new fabric.Polygon([{ x: 0, y: -55 }, { x: 55, y: 0 }, { x: 0, y: 55 }, { x: -55, y: 0 }], { ...BASE });
    case "pentagon":
      return new fabric.Polygon(regularPolygonPoints(5, 60), { ...BASE });
    case "hexagon":
      return new fabric.Polygon(regularPolygonPoints(6, 60), { ...BASE });
    case "parallelogram":
      return new fabric.Polygon(
        [{ x: -35, y: -40 }, { x: 60, y: -40 }, { x: 35, y: 40 }, { x: -60, y: 40 }],
        { ...BASE },
      );
    case "trapezoid":
      return new fabric.Polygon(
        [{ x: -30, y: -40 }, { x: 30, y: -40 }, { x: 60, y: 40 }, { x: -60, y: 40 }],
        { ...BASE },
      );
    case "star":
      return new fabric.Polygon(starPoints(5, 60, 25), { ...BASE });
    case "cloud":
      return new fabric.Path(
        "M 25 60 C -5 60 -15 25 10 15 C 5 -15 45 -20 55 5 C 80 -10 105 15 90 35 C 105 45 95 65 75 60 Z",
        { ...BASE, left: 100, top: 90 },
      );
    case "heart":
      return new fabric.Path(
        "M 60 100 C 20 70 0 45 0 22 C 0 2 15 -12 33 -12 C 46 -12 55 -5 60 5 C 65 -5 74 -12 87 -12 C 105 -12 120 2 120 22 C 120 45 100 70 60 100 Z",
        { ...BASE, left: 90, top: 60 },
      );

    case "line":
      return new fabric.Line([0, 0, 140, 0], { stroke: STROKE, strokeWidth: STROKE_WIDTH, left: 120, top: 120 });
    case "polyline":
      return new fabric.Polyline(
        [{ x: 0, y: 40 }, { x: 35, y: 0 }, { x: 70, y: 40 }, { x: 105, y: 0 }, { x: 140, y: 40 }],
        { fill: "", stroke: STROKE, strokeWidth: STROKE_WIDTH, left: 120, top: 100 },
      );
    case "arrow":
      return arrowShape(fabric, { double: false, curved: false });
    case "doubleArrow":
      return arrowShape(fabric, { double: true, curved: false });
    case "curvedArrow":
      return arrowShape(fabric, { double: false, curved: true });

    case "callout":
      return calloutShape(fabric);

    case "textbox":
      return new fabric.Textbox("Text", {
        left: 120,
        top: 100,
        width: 160,
        fontSize: 18,
        fontFamily: "Inter, Arial, sans-serif",
        fill: "#111827",
      });

    default:
      return new fabric.Rect({ ...BASE, width: 100, height: 80 });
  }
}

function arrowShape(fabric, { double, curved }) {
  const length = 140;
  const headSize = 16;
  const parts = [];

  if (curved) {
    parts.push(new fabric.Path(`M 0 30 Q ${length / 2} -20 ${length} 30`, { fill: "", stroke: STROKE, strokeWidth: STROKE_WIDTH }));
  } else {
    parts.push(new fabric.Line([0, 0, length, 0], { stroke: STROKE, strokeWidth: STROKE_WIDTH }));
  }
  const endY = curved ? 30 : 0;
  const endAngle = curved ? 20 : 90;
  parts.push(
    new fabric.Triangle({
      width: headSize,
      height: headSize,
      left: length,
      top: endY,
      angle: endAngle,
      fill: STROKE,
      originX: "center",
      originY: "center",
    }),
  );
  if (double) {
    const startY = curved ? 30 : 0;
    parts.push(
      new fabric.Triangle({
        width: headSize,
        height: headSize,
        left: 0,
        top: startY,
        angle: -90,
        fill: STROKE,
        originX: "center",
        originY: "center",
      }),
    );
  }
  return new fabric.Group(parts, { left: 120, top: 110 });
}

function calloutShape(fabric) {
  const body = new fabric.Rect({ width: 140, height: 80, rx: 10, ry: 10, fill: FILL, stroke: STROKE, strokeWidth: STROKE_WIDTH });
  const tail = new fabric.Triangle({
    width: 24,
    height: 24,
    left: 20,
    top: 78,
    angle: 180,
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  return new fabric.Group([body, tail], { left: 120, top: 100 });
}
