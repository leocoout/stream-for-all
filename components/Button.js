const VARIANTS = {
  primary: { background: "var(--primary)", color: "var(--primary-fg)", border: "1px solid transparent" },
  secondary: { background: "var(--secondary)", color: "var(--secondary-fg)", border: "1px solid var(--border)" },
  ghost: { background: "transparent", color: "var(--muted-fg)", border: "1px solid transparent" }
};

export function Button(label, { variant = "primary", onClick, disabled = false } = {}) {
  const b = document.createElement("button");
  b.textContent = label;
  Object.assign(b.style, {
    width: "100%",
    padding: "11px 16px",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    transition: "filter .15s ease, opacity .15s ease, transform .04s ease",
    ...VARIANTS[variant]
  });
  b.onpointerdown = () => (b.style.transform = "scale(.985)");
  b.onpointerup = b.onpointerleave = () => (b.style.transform = "scale(1)");
  b.onmouseenter = () => !b.disabled && (b.style.filter = "brightness(1.08)");
  b.onmouseleave = () => (b.style.filter = "none");

  b.setDisabled = (d) => {
    b.disabled = d;
    b.style.opacity = d ? ".45" : "1";
    b.style.cursor = d ? "not-allowed" : "pointer";
  };
  b.setDisabled(disabled);
  if (onClick) b.onclick = (e) => !b.disabled && onClick(e);
  return b;
}
