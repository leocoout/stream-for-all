import { StepNickname } from "./components/StepNickname.js";
import { StepChoice } from "./components/StepChoice.js";
import { StepJoin } from "./components/StepJoin.js";
import { StepHost } from "./components/StepHost.js";

export function Onboarding(mount, opts = {}) {
  const state = { nickname: opts.initialName || "", color: "#4ea1ff" };
  const show = (view) => {
    mount.replaceChildren(view);
    return view;
  };

  const api = {
    nickname() {
      show(StepNickname({
        initialName: state.nickname,
        onNext: (name, color) => {
          state.nickname = name;
          state.color = color;
          opts.onNickname?.(name);
          if (opts.startInvite) opts.onJoin(name, opts.startInvite);
          else api.choice();
        }
      }));
    },
    choice() {
      show(StepChoice({
        name: state.nickname,
        color: state.color,
        onJoin: () => api.join(),
        onHost: () => opts.onHost(state.nickname),
        onBack: () => api.nickname()
      }));
    },
    join() {
      const view = show(StepJoin({
        onBack: () => api.choice(),
        onJoin: (code) => opts.onJoin(state.nickname, code, (msg) => view.showError(msg))
      }));
    },
    host(code, onEnter) {
      show(StepHost({ code, onBack: () => api.choice(), onEnter }));
    }
  };

  return api;
}
