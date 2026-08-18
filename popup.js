import { Onboarding } from "./onboarding.js";
import { loadIdentity, saveName, makeInviteCode, parseInviteCode } from "./crypto.js";
import { createHostGroup, joinFromInvite } from "./groups.js";
import { T } from "./strings.js";
import { BgPattern } from "./components/BgPattern.js";
import { FooterMeta } from "./components/FooterMeta.js";

document.body.prepend(BgPattern());
document.getElementById("footer-slot").appendChild(FooterMeta());

async function openRoom(groupId) {
  const w = 460;
  const h = 620;
  const left = Math.max(0, Math.round((screen.width - w) / 2));
  const top = Math.max(0, Math.round((screen.height - h) / 2));
  await chrome.windows.create({
    url: chrome.runtime.getURL("room.html?g=" + encodeURIComponent(groupId)),
    type: "popup",
    width: w,
    height: h,
    left,
    top
  });
  window.close();
}

async function detectCtx() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const m = tab?.url?.match(/discord\.com\/channels\/(\d+)/);
    if (m) return "server-" + m[1];
  } catch {}
  return null;
}

const id = await loadIdentity();
const ctx = await detectCtx();

const onboard = Onboarding(document.getElementById("app"), {
  initialName: id.name || "",
  onNickname: (name) => saveName(name),
  onHost: async (name) => {
    await saveName(name);
    id.name = name;
    const g = await createHostGroup(id, name, ctx);
    onboard.host(makeInviteCode(g, name), () => openRoom(g.groupId));
  },
  onJoin: async (name, code, showError) => {
    await saveName(name);
    id.name = name;
    let g;
    try {
      g = await joinFromInvite(parseInviteCode(code), ctx);
    } catch {
      showError?.(T.onboarding.badCode);
      return;
    }
    openRoom(g.groupId);
  }
});
onboard.nickname();
