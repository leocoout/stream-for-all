import { Button } from "./Button.js";
import { Avatar } from "./Avatar.js";
import { heading, subtext } from "./typography.js";
import { T } from "../strings.js";

export function StepChoice({ name = "", color = "#4ea1ff", rooms = [], onEnterRoom, onJoin, onHost, onBack } = {}) {
  const wrap = document.createElement("div");

  const avatar = Avatar({ initial: name[0] || "?", color, size: 64 });
  avatar.style.margin = "0 auto 16px";

  const title = heading(T.onboarding.hey(name));
  const sub = subtext(T.onboarding.choiceSubtitle);

  wrap.append(avatar, title, sub);

  if (rooms.length && onEnterRoom) {
    const label = document.createElement("div");
    label.textContent = T.onboarding.yourRooms;
    Object.assign(label.style, {
      fontSize: "11px", textTransform: "uppercase", letterSpacing: ".05em",
      color: "var(--muted-fg)", fontWeight: "600", margin: "4px 0 8px", textAlign: "left"
    });
    wrap.appendChild(label);
    for (const room of rooms) {
      const b = Button(room.name, { variant: "secondary", onClick: () => onEnterRoom(room.groupId) });
      b.style.marginBottom = "8px";
      wrap.appendChild(b);
    }
    const spacer = document.createElement("div");
    spacer.style.height = "8px";
    wrap.appendChild(spacer);
  }

  const host = Button(T.onboarding.hostRoom, { variant: "primary", onClick: onHost });
  const join = Button(T.onboarding.joinRoom, { variant: "secondary", onClick: onJoin });
  join.style.marginTop = "10px";
  const back = Button(T.onboarding.back, { variant: "ghost", onClick: onBack });
  back.style.marginTop = "8px";

  wrap.append(host, join, back);
  return wrap;
}
