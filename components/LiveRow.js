import { Avatar, colorFor } from "./Avatar.js";
import { T } from "../strings.js";

export function LiveRow({ name, pub, onWatch } = {}) {
  const row = document.createElement("div");
  Object.assign(row.style, { display: "flex", alignItems: "center", gap: "10px", padding: "8px 4px" });

  const avatar = Avatar({ initial: name[0] || "?", color: colorFor(pub || name), size: 34 });
  avatar.style.flex = "0 0 auto";

  const info = document.createElement("div");
  info.style.flex = "1";
  const nm = document.createElement("div");
  nm.textContent = name;
  Object.assign(nm.style, { fontSize: "14px", fontWeight: "500", color: "var(--fg)" });
  const sub = document.createElement("div");
  Object.assign(sub.style, { display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--muted-fg)", marginTop: "1px" });
  const dot = document.createElement("span");
  Object.assign(dot.style, { width: "6px", height: "6px", borderRadius: "50%", background: "var(--destructive)" });
  const sublabel = document.createElement("span");
  sublabel.textContent = T.room.live;
  sub.append(dot, sublabel);
  info.append(nm, sub);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = T.room.watch;
  Object.assign(btn.style, {
    padding: "6px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer",
    fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-sans)",
    border: "1px solid transparent", background: "var(--primary)", color: "var(--primary-fg)"
  });
  btn.onclick = onWatch;

  row.append(avatar, info, btn);
  return row;
}
