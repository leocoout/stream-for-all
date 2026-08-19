import { Icon } from "./icons.js";

let current = null;

function closeMenu() {
  if (!current) return;
  document.removeEventListener("click", current._onDoc, true);
  current.remove();
  current = null;
}

export function openMenu(anchor, itemsOrBuilder) {
  closeMenu();
  const build = typeof itemsOrBuilder === "function" ? itemsOrBuilder : () => itemsOrBuilder;

  const menu = document.createElement("div");
  Object.assign(menu.style, {
    position: "fixed", zIndex: "100000", minWidth: "184px",
    background: "var(--popover)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "6px", fontFamily: "var(--font-sans)"
  });

  const headerEl = (text) => {
    const d = document.createElement("div");
    d.textContent = text;
    Object.assign(d.style, {
      fontSize: "10px", textTransform: "uppercase", letterSpacing: ".05em",
      color: "var(--muted-fg)", fontWeight: "600", padding: "8px 10px 4px"
    });
    return d;
  };

  const indicator = (it) => {
    const s = document.createElement("span");
    Object.assign(s.style, { width: "16px", flex: "0 0 auto", display: "grid", placeItems: "center" });
    if (it.radio) {
      const ring = document.createElement("span");
      Object.assign(ring.style, {
        width: "13px", height: "13px", borderRadius: "50%", display: "grid", placeItems: "center",
        border: "1.5px solid " + (it.selected ? "var(--blue)" : "var(--muted-fg)")
      });
      if (it.selected) {
        const dot = document.createElement("span");
        Object.assign(dot.style, { width: "6px", height: "6px", borderRadius: "50%", background: "var(--blue)" });
        ring.appendChild(dot);
      }
      s.appendChild(ring);
    } else if (it.selected) {
      const c = Icon("check", { size: 15 });
      c.style.color = "var(--blue)";
      s.appendChild(c);
    }
    return s;
  };

  const rowEl = (it) => {
    const row = document.createElement("button");
    row.type = "button";
    Object.assign(row.style, {
      display: "flex", alignItems: "center", gap: "9px", width: "100%",
      padding: "8px 10px", border: "none", background: "transparent",
      color: it.danger ? "var(--destructive)" : "var(--fg)",
      fontSize: "13px", fontWeight: "500", cursor: "pointer",
      borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", textAlign: "left"
    });
    const label = document.createElement("span");
    label.textContent = it.label;
    label.style.flex = "1";
    row.append(indicator(it), label);
    row.onmouseenter = () => (row.style.background = "var(--secondary)");
    row.onmouseleave = () => (row.style.background = "transparent");
    row.onclick = () => {
      if (it.keepOpen) { it.onClick?.(); render(); }
      else { closeMenu(); it.onClick?.(); }
    };
    return row;
  };

  function render() {
    menu.replaceChildren();
    for (const it of build()) {
      menu.appendChild(it.header ? headerEl(it.header) : rowEl(it));
    }
  }

  render();
  document.body.appendChild(menu);

  const r = anchor.getBoundingClientRect();
  let top = r.bottom + 6;
  if (top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - menu.offsetHeight - 6);
  menu.style.top = top + "px";
  menu.style.left = Math.max(8, r.right - menu.offsetWidth) + "px";

  const onDoc = (e) => { if (!menu.contains(e.target) && e.target !== anchor) closeMenu(); };
  menu._onDoc = onDoc;
  current = menu;
  setTimeout(() => document.addEventListener("click", onDoc, true), 0);
}
