export const MOCK_NAMES = ["Ana", "Bruno", "Caio", "Dora", "Enzo", "Fabi", "Gui", "Helo", "Igor", "Ju", "Kau", "Lia"];
export const MOCK_COLORS = ["#3ba55d", "#faa61a", "#ed4245", "#5865f2", "#eb459e", "#00a8fc", "#f47fff", "#57f287"];
export const MOCK_PRESETS = {
  "Solo — just you": { role: "founder", members: 0, online: 0, streamers: 0, approvals: 0, youStreaming: false },
  "Small party (3)": { role: "member", members: 3, online: 3, streamers: 1, approvals: 0, youStreaming: false },
  "Big party (8)": { role: "member", members: 8, online: 6, streamers: 2, approvals: 0, youStreaming: false },
  "Everyone streaming": { role: "member", members: 5, online: 5, streamers: 5, approvals: 0, youStreaming: true },
  "You streaming to party": { role: "member", members: 4, online: 4, streamers: 0, approvals: 0, youStreaming: true },
  "Waiting for approval": { role: "pending", members: 4, online: 3, streamers: 1, approvals: 0, youStreaming: false },
  "Founder + 2 requests": { role: "founder", members: 3, online: 3, streamers: 1, approvals: 2, youStreaming: false }
};

export function installChromeStub() {
  const mem = {};
  globalThis.chrome = globalThis.chrome || {};
  chrome.storage = {
    local: {
      get: async (k) => {
        if (typeof k === "string") return { [k]: mem[k] };
        if (Array.isArray(k)) { const o = {}; for (const x of k) o[x] = mem[x]; return o; }
        return { ...mem };
      },
      set: async (o) => { Object.assign(mem, o); }
    }
  };
  chrome.runtime = chrome.runtime || { getURL: (p) => p };
}

export function clampScene(scene) {
  scene.members = Math.max(0, scene.members);
  scene.online = Math.max(0, Math.min(scene.online, scene.members));
  scene.streamers = Math.max(0, Math.min(scene.streamers, scene.online));
  scene.approvals = Math.max(0, scene.approvals);
}

export function mockStream(label, color) {
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
