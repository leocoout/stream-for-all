import { Icon } from "./icons.js";

const LINKS = [
  { icon: "github", url: "https://github.com/leocoout/stream-for-all", label: "GitHub" },
  { icon: "x-logo", url: "https://x.com/leocooout", label: "X" }
];

export function FooterMeta() {
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
    color: "var(--muted-fg)"
  });

  const logo = document.createElement("div");
  logo.setAttribute("role", "img");
  logo.setAttribute("aria-label", "Stream for All");
  Object.assign(logo.style, {
    height: "18px", width: "37px", flex: "0 0 auto",
    backgroundColor: "currentColor", opacity: ".65",
    webkitMaskImage: "url(images/logo_complete.png)",
    maskImage: "url(images/logo_complete.png)",
    webkitMaskSize: "contain", maskSize: "contain",
    webkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    webkitMaskPosition: "left center", maskPosition: "left center"
  });
  wrap.appendChild(logo);

  const right = document.createElement("div");
  Object.assign(right.style, { display: "flex", alignItems: "center", gap: "12px" });

  for (const { icon, url, label } of LINKS) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.title = label;
    a.setAttribute("aria-label", label);
    Object.assign(a.style, {
      color: "inherit", display: "flex", opacity: ".65", transition: "opacity .15s ease"
    });
    a.addEventListener("mouseenter", () => { a.style.opacity = "1"; });
    a.addEventListener("mouseleave", () => { a.style.opacity = ".65"; });
    a.appendChild(Icon(icon, { size: 16, stroke: 1.8 }));
    right.appendChild(a);
  }

  const version = document.createElement("span");
  const manifest = typeof chrome !== "undefined" && chrome.runtime?.getManifest?.();
  if (manifest) {
    version.textContent = `v${manifest.version}`;
  } else {
    fetch("manifest.json")
      .then((r) => r.json())
      .then((m) => { version.textContent = `v${m.version}`; })
      .catch(() => {});
  }
  Object.assign(version.style, {
    fontSize: "11px", fontWeight: "400", letterSpacing: ".02em", opacity: ".65"
  });
  right.appendChild(version);

  wrap.appendChild(right);
  return wrap;
}
