import { T } from "./strings.js";

const TOTAL_UPLINK_BUDGET = 10_000_000;
const MIN_PER_VIEWER = 1_500_000;
const MAX_PER_VIEWER = 8_000_000;

function peerConnections(room) {
  const p = room.getPeers();
  return p instanceof Map ? [...p.values()] : Object.values(p);
}

export function applySenderParams(room, watcherCount) {
  const per = Math.max(
    MIN_PER_VIEWER,
    Math.min(MAX_PER_VIEWER, Math.floor(TOTAL_UPLINK_BUDGET / Math.max(1, watcherCount)))
  );
  for (const pc of peerConnections(room)) {
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind !== "video") continue;
      const p = sender.getParameters();
      p.degradationPreference = "maintain-framerate";
      p.encodings = p.encodings?.length ? p.encodings : [{}];
      p.encodings[0].maxBitrate = per;
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
let currentHint = "motion";
let getStream = () => null;

export function initStreamQuality(streamGetter) {
  getStream = streamGetter;
}

export function applyContentHint(stream) {
  const track = (stream || getStream())?.getVideoTracks?.()[0];
  if (track && "contentHint" in track) track.contentHint = currentHint;
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
  items.push({ header: T.room.content });
  items.push({ label: T.room.contentMotion, radio: true, keepOpen: true, selected: currentHint === "motion", onClick: () => setHint("motion") });
  items.push({ label: T.room.contentDetail, radio: true, keepOpen: true, selected: currentHint === "detail", onClick: () => setHint("detail") });
  return items;
}

function setHint(h) {
  currentHint = h;
  applyContentHint();
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
