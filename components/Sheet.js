import { IconButton } from "./IconButton.js";
import { T } from "../strings.js";

let current = null;

function closeSheet() {
  if (!current) return;
  current.remove();
  current = null;
}

export function isSheetOpen() {
  return current !== null;
}

export function openSheet(title, contentEl) {
  closeSheet();
  const backdrop = document.createElement("div");
  Object.assign(backdrop.style, {
    position: "fixed", inset: "0", zIndex: "100000",
    background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    width: "100%", maxWidth: "360px", maxHeight: "80vh", overflow: "auto",
    background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
    padding: "18px", fontFamily: "var(--font-sans)"
  });

  const head = document.createElement("div");
  Object.assign(head.style, { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" });
  const h = document.createElement("div");
  h.textContent = title;
  Object.assign(h.style, { fontSize: "16px", fontWeight: "700", color: "var(--fg)" });
  head.append(h, IconButton("x", { size: 16, title: T.room.close, onClick: closeSheet }));

  panel.append(head, contentEl);
  backdrop.appendChild(panel);
  backdrop.onclick = (e) => { if (e.target === backdrop) closeSheet(); };
  document.body.appendChild(backdrop);
  current = backdrop;
}
