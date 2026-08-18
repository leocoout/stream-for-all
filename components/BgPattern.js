const TILE = "url(images/logo_icon_tile.png)";

export function BgPattern() {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "fixed", inset: "-50%", zIndex: "-1", pointerEvents: "none",
    backgroundColor: "var(--fg)", opacity: ".01",
    transform: "rotate(-14deg)",
    webkitMaskImage: `${TILE}, ${TILE}`,
    maskImage: `${TILE}, ${TILE}`,
    webkitMaskSize: "120px 120px, 120px 120px",
    maskSize: "120px 120px, 120px 120px",
    webkitMaskPosition: "0 0, 60px 60px",
    maskPosition: "0 0, 60px 60px",
    webkitMaskRepeat: "repeat, repeat",
    maskRepeat: "repeat, repeat"
  });
  return layer;
}
