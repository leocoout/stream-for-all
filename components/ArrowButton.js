import { Icon } from "./icons.js";

export function ArrowButton({ onClick, disabled = false } = {}) {
  const b = document.createElement("button");
  b.appendChild(Icon("arrow-right", { size: 22 }));
  Object.assign(b.style, {
    width: "48px",
    height: "48px",
    borderRadius: "var(--radius-lg)",
    border: "none",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    transition: "opacity .15s ease, background .15s ease, transform .04s ease"
  });
  b.onpointerdown = () => (b.style.transform = "scale(.94)");
  b.onpointerup = b.onpointerleave = () => (b.style.transform = "scale(1)");

  b.setDisabled = (d) => {
    b.disabled = d;
    b.style.background = d ? "var(--secondary)" : "var(--primary)";
    b.style.color = d ? "var(--muted-fg)" : "var(--primary-fg)";
    b.style.opacity = d ? ".55" : "1";
    b.style.cursor = d ? "not-allowed" : "pointer";
  };
  b.setDisabled(disabled);
  if (onClick) b.onclick = () => !b.disabled && onClick();
  return b;
}
