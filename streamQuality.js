import { T } from "./strings.js";

const MAX_BITRATE = 10_000_000;

function peerConnections(room) {
  const p = room.getPeers();
  return p instanceof Map ? [...p.values()] : Object.values(p);
}

export function boostBitrate(room) {
  for (const pc of peerConnections(room)) {
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind !== "video") continue;
      const p = sender.getParameters();
      p.encodings = p.encodings?.length ? p.encodings : [{}];
      p.encodings[0].maxBitrate = MAX_BITRATE;
      p.encodings[0].scaleResolutionDownBy = 1;
      sender.setParameters(p).catch(() => {});
    }
  }
}

const FPS_OPTIONS = [15, 30, 60, 120];
const RES_OPTIONS = [
  { p: "native", label: T.room.native },
  { p: 360, w: 640, h: 360 },
  { p: 480, w: 854, h: 480 },
  { p: 720, w: 1280, h: 720 },
  { p: 1080, w: 1920, h: 1080 },
  { p: 1440, w: 2560, h: 1440 }
];

let currentFps = 60;
let currentRes = 1080;
let getStream = () => null;

export function initStreamQuality(streamGetter) {
  getStream = streamGetter;
}

export function streamMenuItems() {
  const items = [{ header: T.room.framerate }];
  for (const f of FPS_OPTIONS) {
    items.push({ label: T.room.fps(f), radio: true, keepOpen: true, selected: currentFps === f, onClick: () => setFps(f) });
  }
  items.push({ header: T.room.resolution });
  for (const r of RES_OPTIONS) {
    items.push({ label: r.label || `${r.p}p`, radio: true, keepOpen: true, selected: currentRes === r.p, onClick: () => setRes(r.p) });
  }
  return items;
}

function setFps(f) {
  currentFps = f;
  applyStreamConstraints();
}

function setRes(p) {
  currentRes = p;
  applyStreamConstraints();
}

async function applyStreamConstraints() {
  const track = getStream()?.getVideoTracks?.()[0];
  if (!track) return;
  let width, height;
  if (currentRes === "native") {
    const dpr = window.devicePixelRatio || 1;
    width = Math.round(screen.width * dpr);
    height = Math.round(screen.height * dpr);
  } else {
    const res = RES_OPTIONS.find((r) => r.p === currentRes);
    if (!res) return;
    width = res.w;
    height = res.h;
  }
  try {
    await track.applyConstraints({ width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: currentFps } });
  } catch {}
}
