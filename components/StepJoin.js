import { Button } from "./Button.js";
import { TextField } from "./TextField.js";
import { heading, subtext } from "./typography.js";
import { T } from "../strings.js";

export function StepJoin({ onBack, onJoin } = {}) {
  const wrap = document.createElement("div");
  const title = heading(T.onboarding.joinTitle);
  const sub = subtext(T.onboarding.joinSubtitle);

  let code = "";
  const submit = () => code.trim() && onJoin(code.trim());
  const field = TextField({
    placeholder: T.onboarding.roomCode, mono: true,
    onInput: (v) => { code = v; joinBtn.setDisabled(!v.trim()); },
    onEnter: submit
  });
  field.style.marginBottom = "12px";

  const joinBtn = Button(T.onboarding.join, { variant: "primary", onClick: submit, disabled: true });
  const back = Button(T.onboarding.back, { variant: "ghost", onClick: onBack });
  back.style.marginTop = "8px";

  const err = document.createElement("div");
  Object.assign(err.style, { color: "var(--destructive)", fontSize: "12px", textAlign: "center", marginTop: "10px", minHeight: "16px" });

  wrap.append(title, sub, field, joinBtn, back, err);
  wrap.showError = (msg) => (err.textContent = msg || "");
  setTimeout(() => field.focus(), 0);
  return wrap;
}
