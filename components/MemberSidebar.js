import { Avatar, colorFor } from "./Avatar.js";
import { LiveBadge, HostBadge } from "./Badge.js";
import { Icon } from "./icons.js";
import { T } from "../strings.js";

export function renderMemberSidebar(container, {
  members, liveMembers, watching, online, mePub, hostPub, pingMs, onWatch, onStop
} = {}) {
  container.replaceChildren();

  const title = document.createElement("div");
  title.className = "section-label";
  title.textContent = T.room.members;
  title.style.margin = "4px 0 8px";
  container.appendChild(title);

  for (const [pub, name] of members) {
    const isMe = pub === mePub;
    const isLive = liveMembers.has(pub);
    const isWatching = watching.has(pub);

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex", alignItems: "center", gap: "8px",
      padding: "6px 6px", borderRadius: "var(--radius-sm)",
      background: isWatching ? "var(--secondary)" : "transparent"
    });

    const av = Avatar({ initial: name[0] || "?", color: colorFor(pub || name), size: 28 });
    av.style.flex = "0 0 auto";

    const info = document.createElement("div");
    Object.assign(info.style, { flex: "1", minWidth: "0" });

    const label = document.createElement("div");
    label.textContent = isMe ? T.room.you(name) : name;
    Object.assign(label.style, {
      fontSize: "13px", fontWeight: "500", color: "var(--fg)",
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      opacity: isMe || online.has(pub) ? "1" : ".45"
    });
    info.appendChild(label);

    const ping = pingMs?.get(pub);
    if (typeof ping === "number" && pub !== hostPub) {
      const p = document.createElement("div");
      p.textContent = T.room.ping(Math.round(ping));
      Object.assign(p.style, {
        fontSize: "10px", fontWeight: "400", fontVariantNumeric: "tabular-nums",
        marginTop: "1px",
        color: ping < 80 ? "var(--muted-fg)" : ping < 200 ? "#faa61a" : "var(--destructive)"
      });
      info.appendChild(p);
    }

    row.append(av, info);

    if (pub === hostPub) row.appendChild(HostBadge());

    if (isLive) {
      row.appendChild(LiveBadge());
      if (!isMe) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = isWatching ? T.room.stopWatching : T.room.watch;
        btn.appendChild(Icon(isWatching ? "log-out" : "eye", { size: 14 }));
        Object.assign(btn.style, {
          display: "grid", placeItems: "center", width: "26px", height: "26px", padding: "0",
          flex: "0 0 auto", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
          background: "transparent", color: "var(--muted-fg)",
          cursor: "pointer"
        });
        btn.onmouseenter = () => { btn.style.color = isWatching ? "var(--destructive)" : "var(--fg)"; };
        btn.onmouseleave = () => { btn.style.color = "var(--muted-fg)"; };
        btn.onclick = () => (isWatching ? onStop(pub) : onWatch(pub));
        row.appendChild(btn);
      }
    }

    container.appendChild(row);
  }
}
