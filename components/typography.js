export function heading(text) {
  const d = document.createElement("div");
  d.textContent = text;
  Object.assign(d.style, {
    fontSize: "19px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "6px",
    color: "var(--fg)",
    letterSpacing: "-.01em"
  });
  return d;
}

export function subtext(text) {
  const d = document.createElement("div");
  d.textContent = text;
  Object.assign(d.style, {
    fontSize: "13px",
    textAlign: "center",
    color: "var(--muted-fg)",
    marginBottom: "22px",
    lineHeight: "1.5"
  });
  return d;
}
