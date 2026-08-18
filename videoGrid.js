import { VideoTile } from "./components/VideoTile.js";

let grid, emptyHint, thumbs;

export function initVideoGrid(refs) {
  grid = refs.grid;
  emptyHint = refs.emptyHint;
  thumbs = refs.thumbs;
  document.addEventListener("visibilitychange", () => {
    const hidden = document.hidden;
    for (const v of grid.querySelectorAll("video")) {
      if (hidden) v.pause();
      else v.play().catch(() => {});
    }
  });
}

export function attachVideo(key, label, stream, muted = false) {
  const existing = document.getElementById("tile-" + key);
  if (existing) {
    existing.querySelector("video").srcObject = stream;
    return;
  }
  const tile = VideoTile({ id: key, label, stream, muted });
  if (document.hidden) tile.querySelector("video").autoplay = false;
  grid.appendChild(tile);
  updateEmpty();
}

export function removeVideo(key) {
  document.getElementById("tile-" + key)?.remove();
  updateEmpty();
}

export function updateEmpty() {
  emptyHint.hidden = grid.children.length > 0 || thumbs.children.length > 0;
}
