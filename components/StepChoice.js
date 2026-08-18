import { Button } from "./Button.js";
import { Avatar } from "./Avatar.js";
import { heading, subtext } from "./typography.js";
import { T } from "../strings.js";

export function StepChoice({ name = "", color = "#4ea1ff", onJoin, onHost, onBack } = {}) {
  const wrap = document.createElement("div");

  const avatar = Avatar({ initial: name[0] || "?", color, size: 64 });
  avatar.style.margin = "0 auto 16px";

  const title = heading(T.onboarding.hey(name));
  const sub = subtext(T.onboarding.choiceSubtitle);

  const host = Button(T.onboarding.hostRoom, { variant: "primary", onClick: onHost });
  const join = Button(T.onboarding.joinRoom, { variant: "secondary", onClick: onJoin });
  join.style.marginTop = "10px";
  const back = Button(T.onboarding.back, { variant: "ghost", onClick: onBack });
  back.style.marginTop = "8px";

  wrap.append(avatar, title, sub, host, join, back);
  return wrap;
}
