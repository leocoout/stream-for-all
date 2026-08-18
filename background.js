chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "sfa-open" && typeof msg.join === "string" && msg.join) {
    chrome.windows.create({
      url: chrome.runtime.getURL("room.html?join=" + encodeURIComponent(msg.join)),
      type: "popup",
      width: 460,
      height: 620
    });
  }
  sendResponse({ installed: true });
});
