import { T } from "./strings.js";

document.getElementById("brand").textContent = `🖥️ ${T.appName}`;
document.getElementById("tag").textContent = T.popup.tagline;
document.getElementById("stream").textContent = T.popup.start;

document.getElementById("stream").onclick = async () => {
  const params = new URLSearchParams();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const m = tab?.url?.match(/discord\.com\/channels\/(\d+)/);
    if (m) params.set("ctx", "server-" + m[1]);
  } catch {}

  const w = 460;
  const h = 620;
  const left = Math.max(0, Math.round((screen.width - w) / 2));
  const top = Math.max(0, Math.round((screen.height - h) / 2));
  const query = params.toString();

  await chrome.windows.create({
    url: chrome.runtime.getURL("room.html") + (query ? "?" + query : ""),
    type: "popup",
    width: w,
    height: h,
    left,
    top
  });
  window.close();
};
