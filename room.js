import { joinRoom } from "./trystero-nostr.min.js";
import {
  loadIdentity, saveName, signStr, verifyStr, makeEntry, mergeEntries,
  computeMembers, makeInviteCode, parseInviteCode, deriveRoomTopic, randId
} from "./crypto.js";
import { Onboarding } from "./onboarding.js";
import { MemberRow } from "./components/MemberRow.js";
import { ApprovalRow } from "./components/ApprovalRow.js";
import { VideoTile } from "./components/VideoTile.js";
import { IconButton } from "./components/IconButton.js";
import { openMenu } from "./components/Menu.js";
import { LiveBlock } from "./components/LiveBlock.js";
import { openSheet, closeSheet, isSheetOpen } from "./components/Sheet.js";
import { sounds, resumeAudio, soundEnabled, setSoundEnabled } from "./sounds.js";
import { BgPattern } from "./components/BgPattern.js";
import { FooterMeta } from "./components/FooterMeta.js";
import { T } from "./strings.js";
import { LINKS } from "./config.js";

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
let gearBtn = null;
let roomChromeReady = false;

const APP_ID = "stream-for-all-v1";
const MAX_BITRATE = 10_000_000;
const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.primal.net",
  "wss://nostr.mom"
];

const el = (id) => document.getElementById(id);
document.body.prepend(BgPattern());
const onboardWrap = el("onboard-wrap");
const roomPanel = el("room-panel");
for (const [wrap, maxWidth] of [[onboardWrap, "340px"], [roomPanel, "400px"]]) {
  const footer = FooterMeta();
  Object.assign(footer.style, {
    width: "100%", maxWidth, marginTop: "12px", padding: "0 6px", boxSizing: "border-box"
  });
  wrap.appendChild(footer);
}
const grid = el("grid");
const thumbsWrap = el("thumbs-wrap");
const thumbs = el("thumbs");
const emptyHint = el("empty-hint");
const statusEl = el("status");
const waitingEl = el("waiting");
const shareBtn = el("share");

shareBtn.textContent = T.room.shareScreen;
waitingEl.textContent = T.room.waiting;
emptyHint.textContent = T.room.empty;
thumbsWrap.querySelector(".section-label").textContent = T.room.liveNow;

let id = null;
let group = null;
let members = new Map();
let room = null;
let localStream = null;
let actions = {};
const peerPub = new Map();
const myNonce = new Map();
const pendingApprovals = new Map();
const liveMembers = new Set();
const watching = new Set();
const watchers = new Set();
const mockStreams = new Map();
const watchStreams = new Map();
const viewersByStreamer = new Map();
const onlineMembers = new Set();
const pingMs = new Map();
const PING_INTERVAL = 5 * 60 * 1000;
let pingKick = null;
window.addEventListener("pointerdown", resumeAudio);
let membersBtn = null;
let invitesBtn = null;
let openSheetKind = null;

const params = new URLSearchParams(location.search);
const MOCK = params.has("mock");
let scene = null;
if (typeof chrome === "undefined" || !chrome.storage) installChromeStub();

init();

async function init() {
  if (MOCK) {
    await startMock();
    return;
  }
  id = await loadIdentity();
  const onboard = Onboarding(el("onboard"), {
    initialName: id.name || "",
    startInvite: params.get("join") || null,
    onNickname: (name) => setName(name),
    onHost: async (name) => {
      await setName(name);
      const g = await createHostGroup(name);
      onboard.host(makeInviteCode(g, name), () => enterGroup(g));
    },
    onJoin: async (name, code, showError) => {
      await setName(name);
      let g;
      try {
        g = await joinFromInvite(parseInviteCode(code));
      } catch {
        showError?.(T.onboarding.badCode);
        return;
      }
      enterGroup(g);
    }
  });
  onboard.nickname();
}

async function setName(name) {
  id.name = name;
  await saveName(name);
}

async function loadGroups() {
  return (await chrome.storage.local.get("sfa-groups"))["sfa-groups"] || {};
}

async function saveGroup(g) {
  const groups = await loadGroups();
  groups[g.groupId] = g;
  await chrome.storage.local.set({ "sfa-groups": groups });
}

async function createHostGroup(name) {
  const groupId = randId();
  const g = {
    groupId,
    groupSecret: randId(32),
    founderPub: id.pubId,
    name: `${name}'s room`,
    ctx: params.get("ctx") || null,
    entries: []
  };
  g.entries = [await makeEntry(id, groupId, "add", id.pubId, name)];
  await saveGroup(g);
  return g;
}

async function joinFromInvite(inv) {
  const groups = await loadGroups();
  const g = groups[inv.g] || {
    groupId: inv.g,
    groupSecret: inv.s,
    founderPub: inv.f,
    name: inv.n ? inv.n + "'s room" : "Room",
    ctx: params.get("ctx") || null,
    entries: []
  };
  await saveGroup(g);
  return g;
}

async function enterGroup(g) {
  group = g;
  group.myName = id.name || "anon";
  members = await computeMembers(group);
  onboardWrap.hidden = true;
  roomPanel.hidden = false;
  setupRoomChrome();
  renderMembers();
  updateWaiting();
  updateStatus();

  let topic;
  try {
    topic = await deriveRoomTopic(APP_ID, group.groupId);
    room = joinRoom({ appId: APP_ID, password: group.groupSecret, relayConfig: { urls: RELAYS } }, topic);
  } catch (err) {
    statusEl.textContent = T.room.signalingFailed + (err?.message || err);
    return;
  }
  console.log("[sfa] entered room", { groupId: group.groupId, topic, me: id.pubId.slice(0, 8), founder: group.founderPub.slice(0, 8) });

  const chal = room.makeAction("chal");
  const proof = room.makeAction("proof");
  const rost = room.makeAction("rost");
  const live = room.makeAction("live");
  const watch = room.makeAction("watch");
  const viewers = room.makeAction("view");
  const pings = room.makeAction("pings");
  actions = { chal, proof, rost, live, watch, viewers, pings };

  pings.onMessage = (msg, { peerId }) => {
    const info = peerPub.get(peerId);
    if (!info || info.pubId !== group.founderPub) return;
    pingMs.clear();
    for (const [pub, ms] of Object.entries(msg.ms || {})) {
      if (typeof ms === "number") pingMs.set(pub, ms);
    }
    renderMembers();
  };

  if (id.pubId === group.founderPub) setInterval(measurePings, PING_INTERVAL);

  viewers.onMessage = (msg, { peerId }) => {
    const info = peerPub.get(peerId);
    if (!info || !members.has(info.pubId)) return;
    viewersByStreamer.set(info.pubId, Array.isArray(msg.pubs) ? msg.pubs : []);
    updateTileViewers(info.pubId);
  };

  live.onMessage = (msg, { peerId }) => {
    const info = peerPub.get(peerId);
    if (!info || !members.has(info.pubId)) return;
    if (msg.on) { liveMembers.add(info.pubId); sounds.streamStart(); }
    else { liveMembers.delete(info.pubId); stopWatch(info.pubId, true); sounds.streamStop(); }
    renderLive();
    renderMembers();
  };

  watch.onMessage = (msg, { peerId }) => {
    const info = peerPub.get(peerId);
    if (!info || !members.has(info.pubId) || !localStream) return;
    if (msg.want) {
      watchers.add(peerId);
      Promise.all([].concat(room.addStream(localStream, { target: peerId }))).then(boostBitrate).catch(() => {});
    } else {
      watchers.delete(peerId);
      try { room.removeStream(localStream, { target: peerId }); } catch {}
    }
    broadcastViewers();
  };

  chal.onMessage = async (nonce, { peerId }) => {
    const sig = await signStr(id.priv, `${id.pubId}:${nonce}`);
    proof.send({ pubId: id.pubId, name: group.myName, sig }, { target: peerId });
  };

  proof.onMessage = async (p, { peerId }) => {
    const nonce = myNonce.get(peerId);
    if (!nonce || !p || !p.pubId) return;
    if (!(await verifyStr(p.pubId, `${p.pubId}:${nonce}`, p.sig))) return;
    peerPub.set(peerId, { pubId: p.pubId, name: p.name || "friend" });
    evaluatePeer(peerId);
  };

  rost.onMessage = async (entries, { peerId }) => {
    if (!Array.isArray(entries)) return;
    group.entries = mergeEntries(group.entries, entries);
    await saveGroup(group);
    members = await computeMembers(group);
    for (const pid of peerPub.keys()) evaluatePeer(pid);
    renderMembers();
    renderLive();
    updateWaiting();
  };

  room.onPeerJoin = (peerId) => {
    console.log("[sfa] peer joined", peerId);
    const nonce = randId(16);
    myNonce.set(peerId, nonce);
    actions.chal.send(nonce, { target: peerId });
    actions.rost.send(group.entries, { target: peerId });
  };

  room.onPeerStream = (stream, peerId) => {
    const info = peerPub.get(peerId);
    const pub = info?.pubId;
    if (pub && watching.has(pub)) {
      watchStreams.set(pub, stream);
      attachWatched(pub, info.name, stream);
    }
    stream.onremovetrack = () => {
      if (!stream.getTracks().length && pub) { watchStreams.delete(pub); removeVideo("watch-" + pub); }
    };
  };

  room.onPeerLeave = (peerId) => {
    const info = peerPub.get(peerId);
    if (info) {
      if (onlineMembers.has(info.pubId)) { onlineMembers.delete(info.pubId); sounds.leave(); }
      liveMembers.delete(info.pubId);
      pingMs.delete(info.pubId);
      stopWatch(info.pubId, true);
    }
    watchers.delete(peerId);
    peerPub.delete(peerId);
    myNonce.delete(peerId);
    for (const [pub, v] of pendingApprovals) if (v.peerId === peerId) pendingApprovals.delete(pub);
    renderApprovals();
    renderLive();
    renderMembers();
    updateStatus();
  };

  renderMembers();
  renderLive();
  updateWaiting();
  updateStatus();
}

async function measurePings() {
  if (!room || id.pubId !== group.founderPub) return;
  for (const [peerId, info] of peerPub) {
    if (!members.has(info.pubId)) continue;
    try { pingMs.set(info.pubId, await room.ping(peerId)); } catch {}
  }
  actions.pings?.send({ ms: Object.fromEntries(pingMs) });
  renderMembers();
}

function evaluatePeer(peerId) {
  const info = peerPub.get(peerId);
  if (!info) return;
  if (members.has(info.pubId)) {
    if (!onlineMembers.has(info.pubId)) {
      onlineMembers.add(info.pubId);
      sounds.join();
      if (id.pubId === group.founderPub) {
        clearTimeout(pingKick);
        pingKick = setTimeout(measurePings, 3000);
      }
    }
    pendingApprovals.delete(info.pubId);
    if (localStream) actions.live.send({ on: true }, { target: peerId });
  } else {
    pendingApprovals.set(info.pubId, { name: info.name, peerId });
  }
  renderApprovals();
  updateStatus();
}

async function approve(pub, name) {
  group.entries = mergeEntries(group.entries, [await makeEntry(id, group.groupId, "add", pub, name)]);
  await saveGroup(group);
  members = await computeMembers(group);
  actions.rost.send(group.entries);
  for (const pid of peerPub.keys()) evaluatePeer(pid);
  renderMembers();
  renderLive();
}

async function removeMember(pub) {
  if (id.pubId !== group.founderPub) return;
  group.entries = mergeEntries(group.entries, [await makeEntry(id, group.groupId, "remove", pub, "")]);
  await saveGroup(group);
  members = await computeMembers(group);
  actions.rost.send(group.entries);
  for (const [peerId, info] of peerPub) {
    if (!members.has(info.pubId)) {
      if (localStream) { try { room.removeStream(localStream, { target: peerId }); } catch {} watchers.delete(peerId); }
      liveMembers.delete(info.pubId);
      stopWatch(info.pubId, true);
    }
  }
  renderLive();
  renderMembers();
}

shareBtn.onclick = async () => {
  if (localStream) {
    stopShare();
    return;
  }
  if (!members.has(id.pubId)) return;
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
      audio: true
    });
  } catch {
    return;
  }
  attachVideo("me", T.room.you(group.myName), localStream, true);
  updateTileViewers(id.pubId);
  liveMembers.add(id.pubId);
  watchers.clear();
  actions.live.send({ on: true });
  sounds.streamStart();
  localStream.getVideoTracks()[0].addEventListener("ended", stopShare);
  shareBtn.textContent = T.room.stopSharing;
  shareBtn.classList.add("danger");
  updateStreamControls();
  renderMembers();
};

function peerConnections() {
  const p = room.getPeers();
  return p instanceof Map ? [...p.values()] : Object.values(p);
}

function boostBitrate() {
  for (const pc of peerConnections()) {
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

function stopShare() {
  if (!localStream) return;
  if (!MOCK) {
    actions.live.send({ on: false });
    try { room.removeStream(localStream); } catch {}
  }
  sounds.streamStop();
  watchers.clear();
  for (const track of localStream.getTracks()) track.stop();
  localStream = null;
  liveMembers.delete(id.pubId);
  removeVideo("me");
  shareBtn.textContent = T.room.shareScreen;
  shareBtn.classList.remove("danger");
  updateStreamControls();
  renderMembers();
}

function peerIdFor(pub) {
  for (const [peerId, info] of peerPub) if (info.pubId === pub) return peerId;
  return null;
}

function startWatch(pub) {
  watching.add(pub);
  if (MOCK) {
    const s = mockStreams.get(pub);
    if (s) { watchStreams.set(pub, s); attachWatched(pub, members.get(pub) || "friend", s); }
  } else {
    const peerId = peerIdFor(pub);
    if (peerId) actions.watch.send({ want: true }, { target: peerId });
  }
  renderLive();
}

function stopWatch(pub, silent = false) {
  if (!watching.has(pub)) return;
  watching.delete(pub);
  watchStreams.delete(pub);
  if (!MOCK && !silent) {
    const peerId = peerIdFor(pub);
    if (peerId) actions.watch.send({ want: false }, { target: peerId });
  }
  removeVideo("watch-" + pub);
  renderLive();
}

function attachWatched(pub, name, stream) {
  attachVideo("watch-" + pub, name, stream, false);
  const tile = el("tile-watch-" + pub);
  if (tile) { tile.style.cursor = "pointer"; tile.title = T.room.stopWatching; tile.onclick = () => stopWatch(pub); }
  updateTileViewers(pub);
}

function viewerListFor(pub) {
  let pubs;
  if (!MOCK && pub === id.pubId) pubs = [...watchers].map((pid) => peerPub.get(pid)?.pubId).filter(Boolean);
  else pubs = viewersByStreamer.get(pub) || [];
  return pubs.map((p) => ({ pub: p, name: members.get(p) || "friend" }));
}

function updateTileViewers(pub) {
  const key = pub === id.pubId ? "me" : "watch-" + pub;
  el("tile-" + key)?.setViewers?.(viewerListFor(pub));
}

function broadcastViewers() {
  if (!localStream) return;
  const pubs = [...watchers].map((pid) => peerPub.get(pid)?.pubId).filter(Boolean);
  actions.viewers.send({ pubs });
  updateTileViewers(id.pubId);
}

function renderLive() {
  const pending = [...liveMembers].filter((pub) => pub !== id.pubId && !watching.has(pub) && members.has(pub));
  thumbsWrap.hidden = pending.length === 0;
  thumbs.className = "blocks";
  thumbs.innerHTML = "";
  for (const pub of pending) {
    const name = members.get(pub) || "friend";
    thumbs.appendChild(LiveBlock({ name, pub, onWatch: () => startWatch(pub) }));
  }
  updateEmpty();
}

function updateEmpty() {
  emptyHint.hidden = grid.children.length > 0 || thumbs.children.length > 0;
}

function renderMembers() {
  if (membersBtn) membersBtn.title = `${T.room.members} (${members.size})`;
  if (openSheetKind === "members" && isSheetOpen()) openMembersSheet();
}

function renderApprovals() {
  const amHost = id.pubId === group.founderPub;
  if (invitesBtn) {
    invitesBtn.hidden = !amHost || pendingApprovals.size === 0;
    invitesBtn.setBadge(pendingApprovals.size);
  }
  if (openSheetKind === "approvals" && isSheetOpen()) openApprovalsSheet();
}

function openMembersSheet() {
  openSheetKind = "members";
  const list = document.createElement("div");
  list.className = "sheet-list";
  const amHost = id.pubId === group.founderPub;
  for (const [pub, name] of members) {
    list.appendChild(MemberRow({
      name, pub, isYou: pub === id.pubId, isHost: pub === group.founderPub,
      isLive: liveMembers.has(pub),
      ping: pub === group.founderPub ? null : pingMs.get(pub) ?? null,
      canRemove: amHost && pub !== group.founderPub && pub !== id.pubId,
      onRemove: () => removeMember(pub)
    }));
  }
  openSheet(T.room.members, list);
}

function openApprovalsSheet() {
  openSheetKind = "approvals";
  const list = document.createElement("div");
  list.className = "sheet-list";
  if (!pendingApprovals.size) {
    const e = document.createElement("div");
    e.textContent = T.room.noRequests;
    Object.assign(e.style, { color: "var(--muted-fg)", fontSize: "13px", padding: "8px 4px" });
    list.appendChild(e);
  }
  for (const [pub, v] of pendingApprovals) {
    list.appendChild(ApprovalRow({ name: v.name, pub, onApprove: () => approve(pub, v.name) }));
  }
  openSheet(T.room.requests, list);
}

function setupRoomChrome() {
  if (roomChromeReady) return;
  roomChromeReady = true;
  const actionsWrap = el("header-actions");
  membersBtn = IconButton("users", { title: T.room.members, onClick: openMembersSheet });
  invitesBtn = IconButton("user-plus", { title: T.room.requests, onClick: openApprovalsSheet });
  invitesBtn.hidden = true;
  const menuBtn = IconButton("ellipsis-vertical", { title: T.room.roomSettings, onClick: (e, b) => openMenu(b, roomMenuItems) });
  actionsWrap.append(membersBtn, invitesBtn, menuBtn);
  gearBtn = IconButton("sliders", { title: T.room.streamSettings, onClick: (e, b) => openMenu(b, streamMenuItems) });
  el("stream-settings-slot").appendChild(gearBtn);
  updateStreamControls();
}

function updateStreamControls() {
  if (gearBtn) gearBtn.hidden = !localStream;
}

function roomMenuItems() {
  return [
    { label: T.room.sound, selected: soundEnabled(), keepOpen: true, onClick: () => setSoundEnabled(!soundEnabled()) },
    { label: T.room.copyInvite, onClick: copyInvite }
  ];
}

function streamMenuItems() {
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
  const track = localStream?.getVideoTracks?.()[0];
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

async function copyInvite() {
  const code = makeInviteCode(group, group.myName);
  const link = `${LINKS.landing}#${code}`;
  try {
    await navigator.clipboard.writeText(link);
    toast(T.room.inviteCopied);
  } catch {}
}

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "18px", left: "50%", transform: "translateX(-50%)",
    background: "var(--fg)", color: "var(--bg)", padding: "8px 14px",
    borderRadius: "var(--radius)", fontSize: "13px", fontWeight: "600", zIndex: "100001"
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
}

function updateWaiting() {
  const iAmMember = members.has(id.pubId);
  waitingEl.hidden = iAmMember;
  el("room-actions").hidden = !iAmMember;
}

function updateStatus() {
  el("room-title").textContent = group.name;
  const online = [...peerPub.values()].filter((v) => members.has(v.pubId)).length;
  statusEl.textContent = T.room.status(members.size, online);
}

function attachVideo(key, label, stream, muted = false) {
  const existing = el("tile-" + key);
  if (existing) {
    existing.querySelector("video").srcObject = stream;
    return;
  }
  const tile = VideoTile({ id: key, label, stream, muted });
  if (document.hidden) tile.querySelector("video").autoplay = false;
  grid.appendChild(tile);
  updateEmpty();
}

function removeVideo(key) {
  el("tile-" + key)?.remove();
  updateEmpty();
}

document.addEventListener("visibilitychange", () => {
  const hidden = document.hidden;
  for (const v of grid.querySelectorAll("video")) {
    if (hidden) v.pause();
    else v.play().catch(() => {});
  }
});

const MOCK_NAMES = ["Ana", "Bruno", "Caio", "Dora", "Enzo", "Fabi", "Gui", "Helo", "Igor", "Ju", "Kau", "Lia"];
const MOCK_COLORS = ["#3ba55d", "#faa61a", "#ed4245", "#5865f2", "#eb459e", "#00a8fc", "#f47fff", "#57f287"];
const MOCK_PRESETS = {
  "Solo — just you": { role: "founder", members: 0, online: 0, streamers: 0, approvals: 0, youStreaming: false },
  "Small party (3)": { role: "member", members: 3, online: 3, streamers: 1, approvals: 0, youStreaming: false },
  "Big party (8)": { role: "member", members: 8, online: 6, streamers: 2, approvals: 0, youStreaming: false },
  "Everyone streaming": { role: "member", members: 5, online: 5, streamers: 5, approvals: 0, youStreaming: true },
  "You streaming to party": { role: "member", members: 4, online: 4, streamers: 0, approvals: 0, youStreaming: true },
  "Waiting for approval": { role: "pending", members: 4, online: 3, streamers: 1, approvals: 0, youStreaming: false },
  "Founder + 2 requests": { role: "founder", members: 3, online: 3, streamers: 1, approvals: 2, youStreaming: false }
};

function installChromeStub() {
  const mem = {};
  globalThis.chrome = globalThis.chrome || {};
  chrome.storage = {
    local: {
      get: async (k) => {
        if (typeof k === "string") return { [k]: mem[k] };
        if (Array.isArray(k)) { const o = {}; for (const x of k) o[x] = mem[x]; return o; }
        return { ...mem };
      },
      set: async (o) => { Object.assign(mem, o); },
      remove: async (k) => { delete mem[k]; }
    }
  };
  chrome.runtime = chrome.runtime || { getURL: (p) => p };
}

async function startMock() {
  id = await loadIdentity();
  id.name = "You";
  group = { groupId: "mock", groupSecret: "mock", founderPub: id.pubId, name: "Design group", entries: [] };
  onboardWrap.hidden = true;
  roomPanel.hidden = false;
  setupRoomChrome();
  shareBtn.onclick = () => { scene.youStreaming = !scene.youStreaming; applyScene(); renderPanel(); };
  scene = { ...(MOCK_PRESETS[params.get("mock")] || MOCK_PRESETS["Founder + 2 requests"]) };
  applyScene();
  renderPanel();
}

function clampScene() {
  scene.members = Math.max(0, scene.members);
  scene.online = Math.max(0, Math.min(scene.online, scene.members));
  scene.streamers = Math.max(0, Math.min(scene.streamers, scene.online));
  scene.approvals = Math.max(0, scene.approvals);
}

function mockStream(label, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  let t = 0;
  (function draw() {
    if (!canvas.isConnected && t > 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(label, 30, 60);
    ctx.beginPath();
    ctx.arc(320 + Math.sin(t / 22) * 180, 210, 34, 0, 7);
    ctx.fill();
    t++;
    requestAnimationFrame(draw);
  })();
  return canvas.captureStream(15);
}

function applyScene() {
  clampScene();
  members = new Map();
  peerPub.clear();
  pendingApprovals.clear();
  myNonce.clear();
  liveMembers.clear();
  watching.clear();
  mockStreams.clear();
  viewersByStreamer.clear();
  pingMs.clear();
  grid.innerHTML = "";
  localStream = null;
  shareBtn.textContent = T.room.shareScreen;
  shareBtn.classList.remove("danger");

  const iAmFounder = scene.role === "founder";
  const iAmPending = scene.role === "pending";
  group.founderPub = iAmFounder ? id.pubId : "mock-founder";
  group.myName = id.name;

  members.set(group.founderPub, iAmFounder ? id.name : "Alex");
  if (!iAmPending && !iAmFounder) members.set(id.pubId, id.name);

  const others = [];
  for (let i = 0; i < scene.members; i++) {
    const pub = "mock-" + i;
    const name = MOCK_NAMES[i % MOCK_NAMES.length];
    members.set(pub, name);
    others.push({ pub, name, i });
  }
  for (let k = 0; k < Math.min(scene.online, others.length); k++) {
    peerPub.set("peer-" + others[k].i, { pubId: others[k].pub, name: others[k].name });
    pingMs.set(others[k].pub, 18 + (others[k].i * 57) % 230);
  }
  for (let a = 0; a < scene.approvals; a++) {
    const pub = "join-" + a;
    const name = MOCK_NAMES[(scene.members + a) % MOCK_NAMES.length];
    peerPub.set("peerjoin-" + a, { pubId: pub, name });
    pendingApprovals.set(pub, { name, peerId: "peerjoin-" + a });
  }

  const allPubs = [...members.keys()];
  const mockViewers = (streamerPub, n) => allPubs.filter((p) => p !== streamerPub).slice(0, n);

  if (scene.youStreaming && !iAmPending) {
    localStream = mockStream("You", "#5865f2");
    viewersByStreamer.set(id.pubId, mockViewers(id.pubId, 3));
    attachVideo("me", T.room.you(group.myName), localStream, true);
    updateTileViewers(id.pubId);
    liveMembers.add(id.pubId);
    shareBtn.textContent = T.room.stopSharing;
    shareBtn.classList.add("danger");
  }
  for (let k = 0; k < Math.min(scene.streamers, others.length); k++) {
    const o = others[k];
    liveMembers.add(o.pub);
    mockStreams.set(o.pub, mockStream(o.name, MOCK_COLORS[o.i % MOCK_COLORS.length]));
    viewersByStreamer.set(o.pub, mockViewers(o.pub, (o.i % 5) + 1));
  }

  renderMembers();
  renderApprovals();
  renderLive();
  updateWaiting();
  updateStatus();
  updateStreamControls();
}

function renderPanel() {
  let panel = el("sfa-devpanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "sfa-devpanel";
    Object.assign(panel.style, {
      position: "fixed", top: "16px", right: "16px", zIndex: "99999",
      background: "#111214", border: "1px solid #3f4147", borderRadius: "10px",
      padding: "12px", width: "236px", fontSize: "12px", color: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,.5)"
    });
    document.body.appendChild(panel);
  }
  const roleBtn = (r) =>
    `<button data-role="${r}" style="padding:4px 9px;margin:2px;border-radius:6px;background:${scene.role === r ? "#5865f2" : "#2b2d31"};">${r}</button>`;
  const step = (key, label) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;margin:5px 0;">
      <span>${label}</span>
      <span><button data-dec="${key}" class="stp">−</button><b style="display:inline-block;min-width:18px;text-align:center;">${scene[key]}</b><button data-inc="${key}" class="stp">+</button></span>
    </div>`;
  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:8px;">🎛 Mock scenarios</div>
    <div style="margin-bottom:8px;">${roleBtn("founder")}${roleBtn("member")}${roleBtn("pending")}</div>
    ${step("members", "Members")}
    ${step("online", "Online")}
    ${step("streamers", "Streaming")}
    ${step("approvals", "Join requests")}
    <div style="display:flex;align-items:center;justify-content:space-between;margin:5px 0;">
      <span>You streaming</span>
      <button data-toggle="1" style="padding:3px 10px;border-radius:6px;background:${scene.youStreaming ? "#5865f2" : "#2b2d31"};">${scene.youStreaming ? "ON" : "off"}</button>
    </div>
    <hr style="border:0;border-top:1px solid #3f4147;margin:10px 0;">
    <div style="font-weight:700;margin-bottom:4px;">Presets</div>
    <div id="sfa-presets"></div>`;
  for (const b of panel.querySelectorAll(".stp")) {
    b.style.cssText = "padding:2px 9px;margin:0 5px;border-radius:6px;background:#2b2d31;";
  }
  const presets = el("sfa-presets");
  for (const name of Object.keys(MOCK_PRESETS)) {
    const b = document.createElement("button");
    b.textContent = name;
    b.style.cssText = "display:block;width:100%;text-align:left;margin:3px 0;background:#2b2d31;padding:5px 8px;border-radius:6px;";
    b.onclick = () => { scene = { ...MOCK_PRESETS[name] }; applyScene(); renderPanel(); };
    presets.appendChild(b);
  }
  const rerun = () => { applyScene(); renderPanel(); };
  panel.querySelectorAll("[data-inc]").forEach((b) => (b.onclick = () => { scene[b.dataset.inc]++; rerun(); }));
  panel.querySelectorAll("[data-dec]").forEach((b) => (b.onclick = () => { scene[b.dataset.dec]--; rerun(); }));
  panel.querySelectorAll("[data-role]").forEach((b) => (b.onclick = () => { scene.role = b.dataset.role; rerun(); }));
  panel.querySelector("[data-toggle]").onclick = () => { scene.youStreaming = !scene.youStreaming; rerun(); };
}
