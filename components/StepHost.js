import { Button } from "./Button.js";
import { heading, subtext } from "./typography.js";
import { T } from "../strings.js";
import { LINKS } from "../config.js";

export function StepHost({ code, onBack, onEnter } = {}) {
  const wrap = document.createElement("div");
  const title = heading(T.onboarding.hostTitle);
  const sub = subtext(T.onboarding.hostSubtitle);
  const link = `${LINKS.landing}#${code}`;

  const copyLink = Button(T.onboarding.copyLink, { variant: "primary", onClick: async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    copyLink.textContent = T.onboarding.copied;
    setTimeout(() => (copyLink.textContent = T.onboarding.copyLink), 1600);
  }});

  const enter = Button(T.onboarding.createRoom, { variant: "secondary", onClick: onEnter });
  enter.style.marginTop = "8px";

  const fallback = document.createElement("div");
  Object.assign(fallback.style, {
    textAlign: "center", fontSize: "13px", color: "var(--muted-fg)", marginTop: "12px"
  });
  fallback.append(document.createTextNode(T.onboarding.linkNotOpening + " "));
  const codeLink = document.createElement("button");
  codeLink.type = "button";
  codeLink.textContent = T.onboarding.copyCode;
  Object.assign(codeLink.style, {
    background: "none", border: "none", padding: "0", cursor: "pointer",
    color: "var(--blue)", fontWeight: "600", fontSize: "13px",
    fontFamily: "var(--font-sans)", textDecoration: "underline"
  });
  codeLink.onclick = async () => {
    try { await navigator.clipboard.writeText(code); } catch {}
    codeLink.textContent = T.onboarding.copied;
    setTimeout(() => (codeLink.textContent = T.onboarding.copyCode), 1600);
  };
  fallback.appendChild(codeLink);

  const back = Button(T.onboarding.back, { variant: "ghost", onClick: onBack });
  back.style.marginTop = "8px";

  wrap.append(title, sub, copyLink, enter, fallback, back);
  return wrap;
}
