(() => {
  document.documentElement.setAttribute("data-sfa", "1");
  const code = (location.hash.slice(1) || new URLSearchParams(location.search).get("join") || "").trim();
  if (code) {
    try { chrome.runtime.sendMessage({ type: "sfa-open", join: code }); } catch {}
  }
})();
