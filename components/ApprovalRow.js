import { Avatar, colorFor } from "./Avatar.js";
import { Icon } from "./icons.js";
import { T } from "../strings.js";

export function ApprovalRow({ name, pub, onApprove } = {}) {
  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex", alignItems: "center", gap: "10px", padding: "7px 4px"
  });

  const avatar = Avatar({ initial: name[0] || "?", color: colorFor(pub || name), size: 34 });
  avatar.style.flex = "0 0 auto";

  const label = document.createElement("div");
  label.style.flex = "1";
  label.style.fontSize = "14px";
  label.style.color = "var(--fg)";
  label.textContent = name;

  const btn = document.createElement("button");
  btn.append(Icon("check", { size: 15 }), document.createTextNode(T.room.approve));
  Object.assign(btn.style, {
    display: "inline-flex", alignItems: "center", gap: "5px",
    padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "none",
    background: "var(--primary)", color: "var(--primary-fg)",
    fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "var(--font-sans)"
  });
  btn.onclick = onApprove;

  row.append(avatar, label, btn);
  return row;
}
