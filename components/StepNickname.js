import { Avatar, randomAvatarColor } from "./Avatar.js";
import { TextField } from "./TextField.js";
import { ArrowButton } from "./ArrowButton.js";
import { T } from "../strings.js";

export function StepNickname({ initialName = "", onNext } = {}) {
  const wrap = document.createElement("div");
  let name = initialName;
  const color = randomAvatarColor();

  const avatar = Avatar({ initial: name[0] || "?", color, size: 92 });
  avatar.style.margin = "0 auto 20px";

  const label = document.createElement("div");
  label.textContent = T.onboarding.nickname;
  Object.assign(label.style, {
    fontSize: "22px", fontWeight: "700", color: "var(--fg)",
    marginBottom: "10px", textAlign: "left", letterSpacing: "-.01em"
  });

  const submit = () => name.trim() && onNext(name.trim(), color);
  const field = TextField({
    placeholder: T.onboarding.nicknamePlaceholder, value: name,
    onInput: (v) => {
      name = v;
      avatar.setInitial(v[0] || "?");
      arrow.setDisabled(!v.trim());
    },
    onEnter: submit
  });

  const arrow = ArrowButton({ disabled: !name.trim(), onClick: submit });

  const row = document.createElement("div");
  Object.assign(row.style, { display: "flex", alignItems: "center", gap: "10px" });
  field.style.flex = "1";
  row.append(field, arrow);

  wrap.append(avatar, label, row);
  setTimeout(() => field.focus(), 0);
  return wrap;
}
