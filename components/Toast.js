export function toast(msg) {
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
