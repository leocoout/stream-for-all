const SVG_NS = "http://www.w3.org/2000/svg";

const ICONS = {
  "arrow-right": ["M5 12h14", "m12 5 7 7-7 7"],
  "crown": [
    "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
    "M5 21h14"
  ],
  "check": ["M20 6 9 17l-5-5"],
  "x": ["M18 6 6 18", "m6 6 12 12"],
  "ellipsis-vertical": [{ c: [12, 12, 1] }, { c: [12, 5, 1] }, { c: [12, 19, 1] }],
  "sliders": ["M10 5H3", "M12 19H3", "M14 3v4", "M16 17v4", "M21 12h-9", "M21 19h-5", "M21 5h-7", "M8 10v4", "M8 12H3"],
  "users": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M16 3.128a4 4 0 0 1 0 7.744", "M22 21v-2a4 4 0 0 0-3-3.87", { c: [9, 7, 4] }],
  "user-plus": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", { c: [9, 7, 4] }, { l: [19, 8, 19, 14] }, { l: [22, 11, 16, 11] }],
  "eye": ["M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0", { c: [12, 12, 3] }],
  "pip": ["M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4", { r: [12, 13, 10, 7, 2] }],
  "github": [
    "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
    "M9 18c-4.51 2-5-2-7-2"
  ],
  "x-logo": [
    { f: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" }
  ]
};

export function Icon(name, { size = 22, stroke = 2, fill = "none" } = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", fill);
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", stroke);
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.style.display = "block";
  for (const item of ICONS[name] || []) {
    if (typeof item === "string") {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", item);
      svg.appendChild(p);
    } else if (item.c) {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", item.c[0]);
      c.setAttribute("cy", item.c[1]);
      c.setAttribute("r", item.c[2]);
      svg.appendChild(c);
    } else if (item.r) {
      const r = document.createElementNS(SVG_NS, "rect");
      const [x, y, w, h, rx] = item.r;
      r.setAttribute("x", x); r.setAttribute("y", y);
      r.setAttribute("width", w); r.setAttribute("height", h);
      if (rx != null) r.setAttribute("rx", rx);
      svg.appendChild(r);
    } else if (item.f) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", item.f);
      p.setAttribute("fill", "currentColor");
      p.setAttribute("stroke", "none");
      svg.appendChild(p);
    } else if (item.l) {
      const l = document.createElementNS(SVG_NS, "line");
      const [x1, y1, x2, y2] = item.l;
      l.setAttribute("x1", x1); l.setAttribute("y1", y1);
      l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      svg.appendChild(l);
    }
  }
  return svg;
}
