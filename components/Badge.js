import { Icon } from "./icons.js";
import { T } from "../strings.js";

function baseBadge() {
  const b = document.createElement("span");
  Object.assign(b.style, {
    display: "inline-flex", alignItems: "center", gap: "5px",
    height: "22px", padding: "0 9px", borderRadius: "999px",
    fontSize: "11px", fontWeight: "700", lineHeight: "1", boxSizing: "border-box"
  });
  return b;
}

export function HostBadge() {
  const b = baseBadge();
  b.style.background = "var(--secondary)";
  b.style.border = "1px solid var(--border)";
  b.style.color = "var(--muted-fg)";
  const crown = Icon("crown", { size: 12, stroke: 2, fill: "currentColor" });
  crown.style.color = "var(--muted-fg)";
  const text = document.createElement("span");
  text.textContent = T.room.host;
  b.append(crown, text);
  return b;
}

export function LiveBadge() {
  const b = baseBadge();
  b.style.background = "var(--destructive)";
  b.style.color = "#fff";
  const dot = document.createElement("span");
  Object.assign(dot.style, { width: "6px", height: "6px", borderRadius: "50%", background: "#fff" });
  const text = document.createElement("span");
  text.textContent = T.room.live;
  b.append(dot, text);
  return b;
}
