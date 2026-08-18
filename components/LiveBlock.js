import { colorFor } from "./Avatar.js";
import { LiveBadge } from "./Badge.js";
import { T } from "../strings.js";

export function LiveBlock({ name, pub, onWatch } = {}) {
  const color = colorFor(pub || name);

  const card = document.createElement("button");
  card.type = "button";
  Object.assign(card.style, {
    position: "relative", width: "100%", aspectRatio: "16 / 10",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    cursor: "pointer", overflow: "hidden", padding: "0",
    background: "var(--muted)", fontFamily: "var(--font-sans)"
  });

  const bg = document.createElement("div");
  Object.assign(bg.style, {
    position: "absolute", inset: "-30%", background: color,
    filter: "blur(38px)", opacity: ".55"
  });

  const shade = document.createElement("div");
  Object.assign(shade.style, {
    position: "absolute", inset: "0",
    background: "linear-gradient(to bottom, rgba(0,0,0,.05), rgba(0,0,0,.4))"
  });

  const hint = document.createElement("div");
  hint.textContent = T.room.clickToWatch;
  Object.assign(hint.style, {
    position: "absolute", inset: "0", display: "grid", placeItems: "center",
    color: "rgba(255,255,255,.92)", fontSize: "13px", fontWeight: "600",
    textShadow: "0 1px 3px rgba(0,0,0,.5)"
  });

  const nm = document.createElement("div");
  nm.textContent = name;
  Object.assign(nm.style, {
    position: "absolute", left: "12px", bottom: "10px",
    color: "#fff", fontSize: "14px", fontWeight: "700",
    textShadow: "0 1px 3px rgba(0,0,0,.5)"
  });

  const live = LiveBadge();
  Object.assign(live.style, { position: "absolute", top: "10px", left: "10px" });

  card.append(bg, shade, hint, nm, live);
  card.onmouseenter = () => (bg.style.opacity = ".75");
  card.onmouseleave = () => (bg.style.opacity = ".55");
  card.onclick = onWatch;
  return card;
}
