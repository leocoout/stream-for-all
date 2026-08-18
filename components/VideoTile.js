import { LiveBadge } from "./Badge.js";
import { IconButton } from "./IconButton.js";
import { ViewerStack } from "./ViewerStack.js";
import { T } from "../strings.js";

export function VideoTile({ id, label, stream, muted = false } = {}) {
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

  const pip = IconButton("pip", {
    size: 15,
    title: T.room.openInWindow,
    onClick: () => video.requestPictureInPicture?.().catch(() => {})
  });
  Object.assign(pip.style, {
    position: "absolute", bottom: "8px", right: "8px",
    width: "30px", height: "30px", background: "rgba(0,0,0,.55)", borderColor: "transparent", color: "#fff"
  });

  tile.append(video, live, viewersEl, name, pip);
  tile.setViewers = (list) => viewersEl.replaceChildren(ViewerStack(list || []));
  return tile;
}
