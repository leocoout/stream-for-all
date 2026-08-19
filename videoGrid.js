import { VideoTile } from "./components/VideoTile.js";
import { LiveBlock } from "./components/LiveBlock.js";

let grid, emptyHint, thumbs, roomCard, zoomStage;
let blockMode = false;
let focusedKey = null;
let pendingLive = [];
const liveBlocks = new Map();
const GAP = 12;

const stageTiles = () => [...zoomStage.children].filter((c) => c.id?.startsWith("tile-"));

export function initVideoGrid(refs) {
  grid = refs.grid;
  emptyHint = refs.emptyHint;
  thumbs = refs.thumbs;
  roomCard = refs.roomCard;
  zoomStage = refs.zoomStage;
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(fitStage).observe(zoomStage);
  }
  document.addEventListener("visibilitychange", () => {
    const hidden = document.hidden;
    for (const v of document.querySelectorAll("#grid video, #zoom-stage video")) {
      if (hidden) v.pause();
      else v.play().catch(() => {});
    }
  });
}

export function attachVideo(key, label, stream, muted = false, { onStop = null, zoomable = false } = {}) {
  const existing = document.getElementById("tile-" + key);
  if (existing) {
    const v = existing.querySelector("video");
    v.srcObject = stream;
    v.play().catch(() => {});
    return;
  }
  const tile = VideoTile({
    id: key, label, stream, muted,
    onStop,
    onZoom: zoomable ? () => toggleZoom(key) : null
  });
  const video = tile.querySelector("video");
  if (document.hidden) video.autoplay = false;
  video.addEventListener("loadedmetadata", fitStage);
  if (zoomable) {
    tile.dataset.zoomable = "1";
    tile.addEventListener("click", () => { if (blockMode) toggleZoom(key); });
  }
  (blockMode ? zoomStage : grid).appendChild(tile);
  if (blockMode && !(key.startsWith("watch-") && wasSwapped(key.slice(6)))) enterAnim(tile);
  updateZoomMode();
}

export function setPendingLive(list) {
  pendingLive = list || [];
  syncLiveBlocks();
  updateZoomMode();
}

function syncLiveBlocks() {
  const want = new Set(blockMode ? pendingLive.map((p) => p.pub) : []);
  for (const [pub, elBlock] of liveBlocks) {
    if (!want.has(pub)) { elBlock.remove(); liveBlocks.delete(pub); markSwap(pub); }
  }
  if (!blockMode) return;
  for (const p of pendingLive) {
    if (!liveBlocks.has(p.pub)) {
      const b = LiveBlock({ name: p.name, pub: p.pub, onWatch: p.onWatch });
      b.id = "liveblock-" + p.pub;
      liveBlocks.set(p.pub, b);
      zoomStage.appendChild(b);
      if (!wasSwapped(p.pub)) enterAnim(b);
    }
  }
}

export function toggleZoom(key) {
  if (!blockMode) {
    focusedKey = key;
    setBlockMode(true);
  } else if (focusedKey === key) {
    focusedKey = null;
    updateZoomMode();
  } else {
    focusedKey = key;
    updateZoomMode();
  }
}

export function toggleGridView() {
  focusedKey = null;
  setBlockMode(!blockMode);
}

const recentSwap = new Map();

function markSwap(pub) {
  recentSwap.set(pub, Date.now());
}

function wasSwapped(pub) {
  const ts = recentSwap.get(pub);
  recentSwap.delete(pub);
  return !!ts && Date.now() - ts < 1000;
}

function enterAnim(t) {
  t.classList.add("stage-enter");
  const done = () => t.classList.remove("stage-enter");
  t.addEventListener("animationend", done, { once: true });
  setTimeout(done, 700);
}

function clearInline(t) {
  t.style.position = "relative"; t.style.left = ""; t.style.top = "";
  t.style.width = ""; t.style.height = ""; t.style.flex = ""; t.style.order = "";
}

function setBlockMode(on) {
  blockMode = on;
  if (!on) focusedKey = null;
  const dest = on ? zoomStage : grid;
  for (const t of [...stageTiles(), ...grid.children]) {
    if (t.parentElement !== dest) {
      dest.appendChild(t);
      if (on) enterAnim(t);
    }
  }
  if (!on) {
    for (const t of dest.children) {
      clearInline(t);
      t.setZoomVisible?.(true);
    }
  }
  syncLiveBlocks();
  for (const v of dest.querySelectorAll("video")) v.play().catch(() => {});
  updateZoomMode();
}

export function clearVideos() {
  for (const t of [...stageTiles(), ...grid.children]) t.remove();
  focusedKey = null;
  updateZoomMode();
}

export function removeVideo(key) {
  document.getElementById("tile-" + key)?.remove();
  if (blockMode && key.startsWith("watch-")) markSwap(key.slice(6));
  if (focusedKey === key) focusedKey = null;
  updateZoomMode();
}

function ratioOf(elm) {
  const v = elm.querySelector("video");
  if (v) return (v.videoWidth || 1280) / (v.videoHeight || 720);
  return 16 / 10;
}

function place(elm, x, y, w, h) {
  Object.assign(elm.style, {
    position: "absolute",
    left: Math.floor(x) + "px", top: Math.floor(y) + "px",
    width: Math.floor(w) + "px", height: Math.floor(h) + "px"
  });
}

function placeGrid(items, areaX, areaY, areaW, areaH) {
  const n = items.length;
  const ratios = items.map(ratioOf);
  let best = null;
  for (let rows = 1; rows <= n; rows++) {
    const cols = Math.ceil(n / rows);
    const cw = (areaW - GAP * (cols - 1)) / cols;
    const ch = (areaH - GAP * (rows - 1)) / rows;
    if (cw <= 0 || ch <= 0) continue;
    let area = 0;
    for (const ar of ratios) {
      const w = Math.min(cw, ch * ar);
      area += w * (w / ar);
    }
    if (!best || area > best.area) best = { area, rows, cols, cw, ch };
  }
  if (!best) return;
  const { rows, cols, cw, ch } = best;
  const sizes = ratios.map((ar) => {
    const w = Math.min(cw, ch * ar);
    return [w, w / ar];
  });
  const rowHeights = [];
  for (let r = 0; r < rows; r++) {
    const rowItems = sizes.slice(r * cols, (r + 1) * cols);
    rowHeights.push(Math.max(...rowItems.map(([, h]) => h)));
  }
  const totalH = rowHeights.reduce((a, b) => a + b, 0) + GAP * (rows - 1);
  let y = areaY + (areaH - totalH) / 2;
  for (let r = 0; r < rows; r++) {
    const start = r * cols;
    const rowItems = sizes.slice(start, start + cols);
    const rowW = rowItems.reduce((a, [w]) => a + w, 0) + GAP * (rowItems.length - 1);
    let x = areaX + (areaW - rowW) / 2;
    rowItems.forEach(([w, h], j) => {
      place(items[start + j], x, y + (rowHeights[r] - h) / 2, w, h);
      x += w + GAP;
    });
    y += rowHeights[r] + GAP;
  }
}

function placeColumn(items, x, colW, areaH) {
  const gaps = GAP * (items.length - 1);
  const natural = items.map((t) => colW / ratioOf(t));
  const totalH = natural.reduce((a, b) => a + b, 0);
  const scale = totalH + gaps > areaH ? (areaH - gaps) / totalH : 1;
  const w = colW * scale;
  let y = Math.max(0, (areaH - (totalH * scale + gaps)) / 2);
  items.forEach((t, i) => {
    const h = natural[i] * scale;
    place(t, x + (colW - w) / 2, y, w, h);
    y += h + GAP;
  });
}

function fitStage() {
  if (!blockMode || !zoomStage) return;
  const tiles = stageTiles();
  const blocks = [...liveBlocks.values()];
  if (!tiles.length && !blocks.length) return;
  const W = zoomStage.clientWidth;
  const H = zoomStage.clientHeight;

  const focused = focusedKey ? tiles.find((t) => t.id === "tile-" + focusedKey) : null;
  let main, rest;
  if (!tiles.length) {
    main = blocks; rest = [];
  } else if (focused) {
    main = [focused];
    rest = [...tiles.filter((t) => t !== focused), ...blocks];
  } else {
    main = tiles;
    rest = blocks;
  }

  const colW = rest.length ? Math.min(220, Math.max(160, W * 0.16)) : 0;
  const mainW = rest.length ? W - colW - GAP * 2 : W;

  placeGrid(main, 0, 0, mainW, H);
  if (rest.length) placeColumn(rest, mainW + GAP * 2, colW, H);

  for (const t of tiles) {
    if (focused && t === focused) t.setZoomVisible?.(rest.length > 0);
    else if (main.length === 1 && main[0] === t) t.setZoomVisible?.(false);
    else t.setZoomVisible?.(true);
  }
}

function updateZoomMode() {
  if (zoomStage) {
    zoomStage.hidden = stageTiles().length === 0 && liveBlocks.size === 0;
    roomCard?.classList.toggle("zoom-mode", blockMode);
    for (const t of [...stageTiles(), ...grid.children]) {
      t.setZoomed?.(blockMode && t.id === "tile-" + focusedKey);
      t.style.cursor = blockMode && t.dataset.zoomable ? "pointer" : "";
    }
    const sidebarControls = document.getElementById("sidebar-controls");
    const roomActions = document.getElementById("room-actions");
    const headerActions = document.getElementById("header-actions");
    const header = document.getElementById("room-header");
    const footer = document.getElementById("room-footer");
    const sidebarFooter = document.getElementById("sidebar-footer");
    const roomPanel = document.getElementById("room-panel");
    if (sidebarControls && roomActions && headerActions && header && roomCard) {
      if (blockMode) {
        if (roomActions.parentElement !== sidebarControls) sidebarControls.appendChild(roomActions);
        if (headerActions.parentElement !== sidebarControls) sidebarControls.appendChild(headerActions);
        if (footer && sidebarFooter && footer.parentElement !== sidebarFooter) sidebarFooter.appendChild(footer);
      } else {
        if (roomActions.parentElement !== roomCard) roomCard.insertBefore(roomActions, document.getElementById("waiting"));
        if (headerActions.parentElement !== header) header.appendChild(headerActions);
        if (footer && roomPanel && footer.parentElement !== roomPanel) roomPanel.appendChild(footer);
      }
    }
  }
  updateEmpty();
  if (blockMode && zoomStage) fitStage();
}

export function updateEmpty() {
  const hasTiles = grid.children.length > 0 || (zoomStage && (stageTiles().length > 0 || liveBlocks.size > 0));
  emptyHint.hidden = hasTiles || thumbs.children.length > 0;
}
