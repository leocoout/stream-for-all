import { Avatar, colorFor } from "./Avatar.js";
import { HostBadge, LiveBadge } from "./Badge.js";
import { Icon } from "./icons.js";
import { T } from "../strings.js";

export function MemberRow({ name, pub, isYou = false, isHost = false, isLive = false, ping = null, canRemove = false, onRemove } = {}) {
  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex", alignItems: "center", gap: "10px", padding: "7px 4px"
  });

  const avatar = Avatar({ initial: name[0] || "?", color: colorFor(pub || name), size: 34 });
  avatar.style.flex = "0 0 auto";

  const label = document.createElement("div");
  label.style.flex = "1";
  label.style.fontSize = "14px";
  label.style.fontWeight = "500";
  label.style.color = "var(--fg)";
  label.textContent = isYou ? T.room.you(name) : name;

  const badges = document.createElement("div");
  Object.assign(badges.style, { display: "flex", alignItems: "center", gap: "6px" });
  if (typeof ping === "number") {
    const p = document.createElement("span");
    p.textContent = T.room.ping(Math.round(ping));
    Object.assign(p.style, {
      fontSize: "11px", fontWeight: "600", fontVariantNumeric: "tabular-nums",
      color: ping < 80 ? "var(--muted-fg)" : ping < 200 ? "#faa61a" : "var(--destructive)"
    });
    badges.appendChild(p);
  }
  if (isHost) badges.appendChild(HostBadge());
  if (isLive) badges.appendChild(LiveBadge());

  row.append(avatar, label, badges);

  if (canRemove && onRemove) {
    const rm = document.createElement("button");
    rm.appendChild(Icon("x", { size: 15 }));
    Object.assign(rm.style, {
      display: "grid", placeItems: "center", width: "26px", height: "26px", padding: "0",
      borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
      background: "transparent", color: "var(--muted-fg)", cursor: "pointer"
    });
    rm.onmouseenter = () => { rm.style.color = "var(--destructive)"; rm.style.borderColor = "var(--destructive)"; };
    rm.onmouseleave = () => { rm.style.color = "var(--muted-fg)"; rm.style.borderColor = "var(--border)"; };
    rm.onclick = onRemove;
    row.appendChild(rm);
  }
  return row;
}
