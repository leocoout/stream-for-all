const AVATAR_COLORS = [
  "#4ea1ff", "#57f287", "#faa61a", "#eb459e",
  "#ff6568", "#00a8fc", "#f47fff", "#9b6dff", "#2dd4bf"
];

export function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function colorFor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ initial = "?", color = "#4ea1ff", size = 92 } = {}) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: size + "px",
    height: size + "px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: color,
    color: "#0b0c0e",
    fontSize: Math.round(size * 0.42) + "px",
    fontWeight: "700",
    userSelect: "none"
  });
  el.textContent = (initial || "?").toUpperCase();
  el.setInitial = (v) => (el.textContent = (v || "?").toUpperCase());
  return el;
}
