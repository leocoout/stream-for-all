export function renderDevPanel(scene, presets, onApply, setScene) {
  let panel = document.getElementById("sfa-devpanel");
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
  const presetsEl = panel.querySelector("#sfa-presets");
  for (const name of Object.keys(presets)) {
    const b = document.createElement("button");
    b.textContent = name;
    b.style.cssText = "display:block;width:100%;text-align:left;margin:3px 0;background:#2b2d31;padding:5px 8px;border-radius:6px;";
    b.onclick = () => { setScene({ ...presets[name] }); onApply(); };
    presetsEl.appendChild(b);
  }
  panel.querySelectorAll("[data-inc]").forEach((b) => (b.onclick = () => { scene[b.dataset.inc]++; onApply(); }));
  panel.querySelectorAll("[data-dec]").forEach((b) => (b.onclick = () => { scene[b.dataset.dec]--; onApply(); }));
  panel.querySelectorAll("[data-role]").forEach((b) => (b.onclick = () => { scene.role = b.dataset.role; onApply(); }));
  panel.querySelector("[data-toggle]").onclick = () => { scene.youStreaming = !scene.youStreaming; onApply(); };
}
