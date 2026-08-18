import { Avatar, colorFor } from "./Avatar.js";
import { Icon } from "./icons.js";

export function ViewerStack(viewers = []) {
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "rgba(0,0,0,.55)", padding: "3px 9px 3px 7px", borderRadius: "999px"
  });

  const eye = Icon("eye", { size: 14 });
  eye.style.color = "#fff";
  wrap.appendChild(eye);

  if (!viewers.length) {
    const zero = document.createElement("span");
    zero.textContent = "0";
    Object.assign(zero.style, { color: "#fff", fontSize: "11px", fontWeight: "700" });
    wrap.appendChild(zero);
    return wrap;
  }

  const stack = document.createElement("div");
  stack.style.display = "flex";
  viewers.slice(0, 4).forEach((v, i) => {
    const a = Avatar({ initial: v.name[0] || "?", color: colorFor(v.pub || v.name), size: 20 });
    a.style.border = "2px solid rgba(0,0,0,.55)";
    a.style.marginLeft = i === 0 ? "0" : "-8px";
    stack.appendChild(a);
  });
  wrap.appendChild(stack);

  if (viewers.length > 4) {
    const more = document.createElement("span");
    more.textContent = "+" + (viewers.length - 4);
    Object.assign(more.style, { color: "#fff", fontSize: "11px", fontWeight: "700", marginLeft: "2px" });
    wrap.appendChild(more);
  }
  return wrap;
}
