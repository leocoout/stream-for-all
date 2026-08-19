import { LiveBadge } from "./Badge.js";
import { IconButton } from "./IconButton.js";
import { ViewerStack } from "./ViewerStack.js";
import { Icon } from "./icons.js";
import { T } from "../strings.js";

export function VideoTile({ id, label, stream, muted = false, onStop = null, onZoom = null } = {}) {
  const tile = document.createElement("div");
  tile.id = "tile-" + id;
  Object.assign(tile.style, {
    position: "relative", background: "#000",
    border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden"
  });

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = muted;
  video.srcObject = stream;
  Object.assign(video.style, { width: "100%", display: "block", aspectRatio: "16 / 9", background: "#000" });

  const live = LiveBadge();
  Object.assign(live.style, { position: "absolute", top: "8px", left: "8px" });

  const viewersEl = document.createElement("div");
  Object.assign(viewersEl.style, { position: "absolute", top: "8px", right: "8px" });

  const name = document.createElement("span");
  name.textContent = label;
  Object.assign(name.style, {
    position: "absolute", bottom: "8px", left: "8px",
    background: "rgba(0,0,0,.6)", color: "#fff",
    padding: "3px 9px", borderRadius: "var(--radius-sm)", fontSize: "12px"
  });

  const controls = document.createElement("div");
  Object.assign(controls.style, {
    position: "absolute", bottom: "8px", right: "8px", display: "flex", gap: "6px"
  });

  const overlay = (btn) => {
    const rest = () => Object.assign(btn.style, {
      background: "rgba(0,0,0,.55)", borderColor: "transparent", color: "#fff"
    });
    Object.assign(btn.style, { width: "30px", height: "30px" });
    rest();
    btn.onmouseenter = () => { btn.style.background = "rgba(0,0,0,.85)"; btn.style.color = "#fff"; btn.style.borderColor = "transparent"; };
    btn.onmouseleave = rest;
  };

  let zoomBtn = null;
  if (onZoom) {
    zoomBtn = IconButton("maximize", { size: 15, title: T.room.expand, onClick: () => onZoom() });
    overlay(zoomBtn);
    controls.appendChild(zoomBtn);
  }

  const pip = IconButton("pip", {
    size: 15,
    title: T.room.openInWindow,
    onClick: () => video.requestPictureInPicture?.().catch(() => {})
  });
  overlay(pip);
  controls.appendChild(pip);

  if (onStop) {
    const stopBtn = IconButton("log-out", { size: 15, title: T.room.stopWatching, onClick: () => onStop() });
    overlay(stopBtn);
    controls.appendChild(stopBtn);
  }

  tile.append(video, live, viewersEl, name, controls);
  tile.setViewers = (list) => viewersEl.replaceChildren(ViewerStack(list || []));
  tile.setZoomed = (z) => {
    if (!zoomBtn) return;
    zoomBtn.title = z ? T.room.shrink : T.room.expand;
    zoomBtn.querySelector("svg").replaceWith(Icon(z ? "minimize" : "maximize", { size: 15 }));
  };
  tile.setZoomVisible = (v) => {
    if (zoomBtn) zoomBtn.style.display = v ? "grid" : "none";
  };
  return tile;
}
