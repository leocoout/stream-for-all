import { joinRoom } from "./trystero-nostr.min.js";
import {
  loadIdentity, saveName, signStr, verifyStr, makeEntry, mergeEntries,
  computeMembers, makeInviteCode, parseInviteCode, deriveRoomTopic, randId, verifyEntry
} from "./crypto.js";
import { Onboarding } from "./onboarding.js";
import { MemberRow } from "./components/MemberRow.js";
import { ApprovalRow } from "./components/ApprovalRow.js";
import { initVideoGrid, attachVideo, removeVideo, clearVideos, updateEmpty, toggleGridView, setPendingLive } from "./videoGrid.js";
import { IconButton } from "./components/IconButton.js";
import { openMenu } from "./components/Menu.js";
import { LiveBlock } from "./components/LiveBlock.js";
import { openSheet, isSheetOpen } from "./components/Sheet.js";
import { sounds, resumeAudio, soundEnabled, setSoundEnabled } from "./sounds.js";
import { BgPattern } from "./components/BgPattern.js";
import { FooterMeta } from "./components/FooterMeta.js";
import { toast } from "./components/Toast.js";
import { renderDevPanel } from "./components/DevPanel.js";
import { renderMemberSidebar } from "./components/MemberSidebar.js";
import { loadGroups, saveGroup, deleteGroup, createHostGroup, joinFromInvite } from "./groups.js";
import { MOCK_NAMES, MOCK_COLORS, MOCK_PRESETS, installChromeStub, clampScene, mockStream } from "./mock.js";
import { T } from "./strings.js";
import { LINKS } from "./config.js";
import { streamMenuItems, initStreamQuality, applySenderParams, applyContentHint } from "./streamQuality.js";

let gearBtn = null;
let roomChromeReady = false;

const APP_ID = "stream-for-all-v1";
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
  if (wrap === roomPanel) footer.id = "room-footer";
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
initStreamQuality(() => localStream);
initVideoGrid({ grid, emptyHint, thumbs, roomCard: el("room-card"), zoomStage: el("zoom-stage") });

init();

async function init() {
  if (MOCK) {
    await startMock();
    return;
  }
  id = await loadIdentity();
  const preGroup = params.get("g");
  if (preGroup) {
    const groups = await loadGroups();
    if (groups[preGroup]) {
      enterGroup(groups[preGroup]);
      return;
    }
  }
  const groups = await loadGroups();
  const onboard = Onboarding(el("onboard"), {
    initialName: id.name || "",
    startInvite: params.get("join") || null,
    rooms: Object.values(groups).map((g) => ({ groupId: g.groupId, name: g.name })),
    onEnterRoom: (gid) => { if (groups[gid]) enterGroup(groups[gid]); },
    onNickname: (name) => setName(name),
    onHost: async (name) => {
      await setName(name);
      const g = await createHostGroup(id, name, params.get("ctx"));
      onboard.host(makeInviteCode(g, name), () => enterGroup(g));
    },
    onJoin: async (name, code, showError) => {
      await setName(name);
      let g;
      try {
        g = await joinFromInvite(parseInviteCode(code), params.get("ctx"));
      } catch {
        showError?.(T.onboarding.badCode);
        return;
      }
      enterGroup(g);
    }
  });
  onboard.start();
}

async function setName(name) {
  id.name = name;
  await saveName(name);
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

  const chal = room.makeAction("chal");
  const proof = room.makeAction("proof");
  const rost = room.makeAction("rost");
  const live = room.makeAction("live");
  const watch = room.makeAction("watch");
  const viewers = room.makeAction("view");
  const pings = room.makeAction("pings");
  const end = room.makeAction("end");
  actions = { chal, rost, live, watch, viewers, pings, end };

  end.onMessage = (msg, { peerId }) => {
    const info = peerPub.get(peerId);
    if (!info || info.pubId !== group.founderPub) return;
    exitRoom(T.room.roomEnded);
  };

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
      Promise.all([].concat(room.addStream(localStream, { target: peerId }))).then(() => applySenderParams(room, watchers.size)).catch(() => {});
    } else {
      watchers.delete(peerId);
      try { room.removeStream(localStream, { target: peerId }); } catch {}
      applySenderParams(room, watchers.size);
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
    const valid = [];
    for (const e of entries) {
      if (await verifyEntry(e, group.founderPub)) valid.push(e);
    }
    if (!valid.length) return;
    group.entries = mergeEntries(group.entries, valid);
    await saveGroup(group);
    members = await computeMembers(group);
    for (const pid of peerPub.keys()) evaluatePeer(pid);
    renderMembers();
    renderLive();
    updateWaiting();
  };

  room.onPeerJoin = (peerId) => {
    const nonce = randId(16);
    myNonce.set(peerId, nonce);
    actions.chal.send(nonce, { target: peerId });
    actions.rost.send(group.entries, { target: peerId });
  };

  room.onPeerStream = (stream, peerId) => {
    const info = peerPub.get(peerId);
    const pub = info?.pubId;
    if (pub && watching.has(pub)) {
      attachWatched(pub, info.name, stream);
    }
    stream.onremovetrack = () => {
      if (!stream.getTracks().length && pub) { removeVideo("watch-" + pub); }
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
    if (watchers.delete(peerId) && localStream) applySenderParams(room, watchers.size);
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
  applyContentHint(localStream);
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
    if (s) { attachWatched(pub, members.get(pub) || "friend", s); }
  } else {
    const peerId = peerIdFor(pub);
    if (peerId) actions.watch.send({ want: true }, { target: peerId });
  }
  renderLive();
}

function stopWatch(pub, silent = false) {
  if (!watching.has(pub)) return;
  watching.delete(pub);
  if (!MOCK && !silent) {
    const peerId = peerIdFor(pub);
    if (peerId) actions.watch.send({ want: false }, { target: peerId });
  }
  removeVideo("watch-" + pub);
  renderLive();
}

function attachWatched(pub, name, stream) {
  const liveTracks = () => new MediaStream(stream.getTracks().filter((t) => t.readyState === "live"));
  attachVideo("watch-" + pub, name, liveTracks(), false, {
    onStop: () => stopWatch(pub),
    zoomable: true
  });
  stream.onaddtrack = () => {
    const v = el("tile-watch-" + pub)?.querySelector("video");
    if (v) { v.srcObject = liveTracks(); v.play().catch(() => {}); }
  };
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
  setPendingLive(pending.map((pub) => ({
    pub, name: members.get(pub) || "friend", onWatch: () => startWatch(pub)
  })));
  renderSidebar();
  updateEmpty();
}

function renderMembers() {
  if (membersBtn) membersBtn.title = `${T.room.members} (${members.size})`;
  if (openSheetKind === "members" && isSheetOpen()) openMembersSheet();
  renderSidebar();
}

function renderSidebar() {
  if (!group || !id) return;
  renderMemberSidebar(el("member-list"), {
    members, liveMembers, watching,
    online: new Set([...peerPub.values()].map((v) => v.pubId)),
    mePub: id.pubId, hostPub: group.founderPub, pingMs,
    onWatch: startWatch, onStop: stopWatch
  });
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
  const gridBtn = IconButton("layout-grid", { title: T.room.gridView, onClick: () => toggleGridView() });
  actionsWrap.appendChild(gridBtn);
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
  const slot = el("stream-settings-slot");
  if (slot) slot.hidden = !localStream;
}

function roomMenuItems() {
  const amHost = id.pubId === group.founderPub;
  return [
    { label: T.room.sound, selected: soundEnabled(), keepOpen: true, onClick: () => setSoundEnabled(!soundEnabled()) },
    { label: T.room.copyInvite, onClick: copyInvite },
    { label: amHost ? T.room.endRoom : T.room.leaveRoom, danger: true, onClick: leaveRoom }
  ];
}

async function leaveRoom() {
  const amHost = id.pubId === group.founderPub;
  if (!confirm(amHost ? T.room.endRoomConfirm : T.room.leaveRoomConfirm)) return;
  if (amHost && !MOCK) {
    try { await actions.end.send({}); } catch {}
  }
  await exitRoom();
}

async function exitRoom(message) {
  stopShare();
  if (!MOCK) {
    try { room?.leave(); } catch {}
    room = null;
    await deleteGroup(group.groupId);
  }
  if (message) toast(message);
  setTimeout(() => {
    window.close();
    location.href = "room.html";
  }, message ? 1500 : 0);
}


async function copyInvite() {
  const code = makeInviteCode(group, group.myName);
  const link = `${LINKS.landing}#${code}`;
  try {
    await navigator.clipboard.writeText(link);
    toast(T.room.inviteCopied);
  } catch {}
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


function applyScene() {
  clampScene(scene);
  members = new Map();
  peerPub.clear();
  pendingApprovals.clear();
  myNonce.clear();
  liveMembers.clear();
  watching.clear();
  mockStreams.clear();
  viewersByStreamer.clear();
  pingMs.clear();
  clearVideos();
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
  renderDevPanel(scene, MOCK_PRESETS, () => { applyScene(); renderPanel(); }, (s) => { scene = s; });
}
