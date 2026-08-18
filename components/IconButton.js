import { Icon } from "./icons.js";

export function IconButton(iconName, { size = 18, title = "", onClick } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.style.position = "relative";
  const icon = Icon(iconName, { size });
  b.appendChild(icon);
  if (title) b.title = title;

  const base = () => {
    b.style.color = "var(--muted-fg)";
    b.style.background = "transparent";
    b.style.borderColor = "var(--border)";
  };
  Object.assign(b.style, {
    display: "grid", placeItems: "center", padding: "0",
    width: "36px", height: "36px", flex: "0 0 auto",
    borderRadius: "var(--radius)", border: "1px solid var(--border)",
    cursor: "pointer", transition: "color .15s ease, border-color .15s ease, background .15s ease"
  });
  base();
  b.onmouseenter = () => { b.style.color = "var(--fg)"; b.style.borderColor = "var(--muted-fg)"; };
  b.onmouseleave = base;

  const badge = document.createElement("span");
  Object.assign(badge.style, {
    position: "absolute", top: "-5px", right: "-5px", minWidth: "16px", height: "16px",
    padding: "0 4px", borderRadius: "999px", background: "var(--destructive)", color: "#fff",
    fontSize: "10px", fontWeight: "700", display: "none", alignItems: "center", justifyContent: "center",
    lineHeight: "16px", boxSizing: "border-box"
  });
  b.appendChild(badge);
  b.setBadge = (n) => {
    if (n > 0) { badge.textContent = n; badge.style.display = "flex"; }
    else badge.style.display = "none";
  };
  if (onClick) b.onclick = (e) => { e.stopPropagation(); onClick(e, b); };
  return b;
}
